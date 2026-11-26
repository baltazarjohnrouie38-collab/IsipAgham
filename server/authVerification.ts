import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import {
  evaluatePasswordStrength,
  validateEmail,
  validateUsername,
} from '../src/lib/authValidation.ts';

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const VERIFIED_TOKEN_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

const EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');

function getSigningSecret(): string {
  const configured = process.env.AUTH_CODE_SECRET?.trim();
  return configured && configured.length >= 16 ? configured : EPHEMERAL_SECRET;
}

export class AuthVerificationError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'AuthVerificationError';
    this.statusCode = statusCode;
  }
}

interface PendingChallenge {
  challengeId: string;
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
}

interface VerifiedRecord {
  jti: string;
  email: string;
  expiresAt: number;
}

interface ChallengeTokenPayload {
  kind: 'challenge';
  challengeId: string;
  email: string;
  exp: number;
}

interface VerificationTokenPayload {
  kind: 'verified';
  jti: string;
  email: string;
  exp: number;
}

const pendingChallenges = new Map<string, PendingChallenge>();
const emailCooldowns = new Map<string, number>();
const verifiedRecords = new Map<string, VerifiedRecord>();

function pruneExpiredState(now = Date.now()): void {
  for (const [id, record] of pendingChallenges.entries()) {
    if (record.expiresAt <= now) {
      pendingChallenges.delete(id);
    }
  }
  for (const [email, until] of emailCooldowns.entries()) {
    if (until <= now) {
      emailCooldowns.delete(email);
    }
  }
  for (const [jti, record] of verifiedRecords.entries()) {
    if (record.expiresAt <= now) {
      verifiedRecords.delete(jti);
    }
  }
}

function hashOtpCode(challengeId: string, email: string, code: string): string {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(`otp:${challengeId}:${email}:${code}`)
    .digest('hex');
}

function signToken(payload: ChallengeTokenPayload | VerificationTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken<T extends ChallengeTokenPayload | VerificationTokenPayload>(
  token: string,
  expectedKind: T['kind']
): T {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new AuthVerificationError(400, 'Invalid verification token. Please request a new code.');
  }

  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new AuthVerificationError(400, 'Verification session could not be verified. Please request a new code.');
  }

  let parsed: T;
  try {
    parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
  } catch {
    throw new AuthVerificationError(400, 'Invalid verification payload. Please request a new code.');
  }

  if (!parsed || parsed.kind !== expectedKind || typeof parsed.exp !== 'number') {
    throw new AuthVerificationError(400, 'Invalid verification session. Please request a new code.');
  }

  if (parsed.exp <= Date.now()) {
    throw new AuthVerificationError(400, 'Your verification code has expired. Please request a new one.');
  }

  return parsed;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 2) {
    return `${local[0] || '*'}*@${domain}`;
  }
  return `${local[0]}${'*'.repeat(Math.min(5, local.length - 2))}${local[local.length - 1]}@${domain}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_FROM?.trim() || 'IsipAgham <onboarding@resend.dev>';
  return apiKey ? { apiKey, from } : null;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const from =
    process.env.SMTP_FROM?.trim() ||
    (user.includes('@') ? `IsipAgham <${user}>` : process.env.EMAIL_FROM?.trim() || `IsipAgham <${user}>`);

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    secure,
    user,
    pass,
    from,
  };
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(getResendConfig() || getSmtpConfig());
}

function parseResendErrorMessage(rawBody: string): string {
  try {
    const parsed = JSON.parse(rawBody) as { message?: string };
    return parsed.message || rawBody;
  } catch {
    return rawBody;
  }
}

async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ ok: boolean; status: number; body: string }> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      html: params.html,
    }),
  });
  const body = response.ok ? '' : await response.text().catch(() => '');
  return { ok: response.ok, status: response.status, body };
}

async function deliverVerificationEmail(params: {
  to: string;
  username: string;
  code: string;
}): Promise<void> {
  const safeUsername = escapeHtml(params.username);
  const safeCode = escapeHtml(params.code);
  const subject = `${params.code} is your IsipAgham verification code`;
  const text = [
    `Hi ${params.username},`,
    '',
    `Your IsipAgham verification code is: ${params.code}`,
    '',
    'Enter this 6-digit code in the sign-up form to verify your email before creating your account.',
    'This code expires in 10 minutes. If you did not request this, you can safely ignore this email.',
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #ffffff; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 16px;">
      <h2 style="margin: 0 0 12px; font-size: 20px; color: #0f172a;">IsipAgham Email Verification</h2>
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #334155;">
        Hi <strong>${safeUsername}</strong>, use the 6-digit verification code below to finish creating your IsipAgham account:
      </p>
      <div style="margin: 20px 0; padding: 16px; text-align: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #1d4ed8;">
        ${safeCode}
      </div>
      <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b;">
        This code expires in 10 minutes. Never share it with anyone. If you did not try to create an IsipAgham account, you can ignore this email.
      </p>
    </div>
  `.trim();

  const resend = getResendConfig();
  const smtp = getSmtpConfig();

  if (resend) {
    let attempt = await sendViaResend({
      apiKey: resend.apiKey,
      from: resend.from,
      to: params.to,
      subject,
      text,
      html,
    });

    if (
      !attempt.ok &&
      attempt.status === 403 &&
      !resend.from.toLowerCase().includes('onboarding@resend.dev') &&
      attempt.body.toLowerCase().includes('domain is not verified')
    ) {
      attempt = await sendViaResend({
        apiKey: resend.apiKey,
        from: 'IsipAgham <onboarding@resend.dev>',
        to: params.to,
        subject,
        text,
        html,
      });
    }

    if (attempt.ok) {
      return;
    }

    console.error('Resend email delivery failed:', attempt.status, attempt.body);

    if (!smtp) {
      const resendMessage = parseResendErrorMessage(attempt.body);
      if (resendMessage.toLowerCase().includes('only send testing emails')) {
        throw new AuthVerificationError(
          403,
          'Resend is in testing mode and can only send codes to your Resend account email until you verify a domain at resend.com/domains (or configure SMTP in Settings -> Secrets).'
        );
      }
      if (resendMessage.toLowerCase().includes('domain is not verified')) {
        throw new AuthVerificationError(
          403,
          'Your sender domain is not verified on Resend yet. Verify it at resend.com/domains, or add SMTP credentials in Settings -> Secrets.'
        );
      }
      throw new AuthVerificationError(
        502,
        'Could not send the verification email right now. Please check your email delivery configuration or try again shortly.'
      );
    }
  }

  if (smtp) {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    try {
      await transporter.sendMail({
        from: smtp.from,
        to: params.to,
        subject,
        text,
        html,
      });
    } catch (err) {
      console.error('SMTP email delivery failed:', err);
      throw new AuthVerificationError(
        502,
        'Could not send the verification email via SMTP. Please check your mail server credentials or try again.'
      );
    }
    return;
  }

  throw new AuthVerificationError(
    503,
    'Email verification code delivery is not configured on the server yet. Ask the app owner to add SMTP_HOST, SMTP_USER, and SMTP_PASS (or RESEND_API_KEY) in Settings -> Secrets, or sign up with Google.'
  );
}

export async function sendVerificationCode(params: {
  email: string;
  username: string;
}): Promise<{
  challengeToken: string;
  maskedEmail: string;
  expiresInSeconds: number;
  cooldownSeconds: number;
}> {
  pruneExpiredState();

  const emailCheck = validateEmail(params.email);
  if (!emailCheck.valid) {
    throw new AuthVerificationError(400, emailCheck.error || 'Invalid email address.');
  }

  const usernameCheck = validateUsername(params.username);
  if (!usernameCheck.valid) {
    throw new AuthVerificationError(400, usernameCheck.error || 'Invalid username.');
  }

  if (!isEmailDeliveryConfigured()) {
    throw new AuthVerificationError(
      503,
      'Email verification code delivery is not configured on the server yet. Add SMTP_HOST, SMTP_USER, and SMTP_PASS (or RESEND_API_KEY) in Settings -> Secrets, or sign up with Google.'
    );
  }

  const now = Date.now();
  const cooldownUntil = emailCooldowns.get(emailCheck.normalized) || 0;
  if (cooldownUntil > now) {
    const waitSeconds = Math.max(1, Math.ceil((cooldownUntil - now) / 1000));
    throw new AuthVerificationError(
      429,
      `Please wait ${waitSeconds}s before requesting another verification code.`
    );
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const challengeId = crypto.randomUUID();
  const expiresAt = now + CHALLENGE_TTL_MS;
  const codeHash = hashOtpCode(challengeId, emailCheck.normalized, code);

  await deliverVerificationEmail({
    to: emailCheck.normalized,
    username: usernameCheck.clean,
    code,
  });

  pendingChallenges.set(challengeId, {
    challengeId,
    email: emailCheck.normalized,
    codeHash,
    expiresAt,
    attempts: 0,
  });
  emailCooldowns.set(emailCheck.normalized, now + RESEND_COOLDOWN_MS);

  const challengeToken = signToken({
    kind: 'challenge',
    challengeId,
    email: emailCheck.normalized,
    exp: expiresAt,
  });

  return {
    challengeToken,
    maskedEmail: maskEmail(emailCheck.normalized),
    expiresInSeconds: Math.round(CHALLENGE_TTL_MS / 1000),
    cooldownSeconds: Math.round(RESEND_COOLDOWN_MS / 1000),
  };
}

export function verifyEmailCode(params: {
  email: string;
  code: string;
  challengeToken: string;
}): {
  verified: true;
  verificationToken: string;
  expiresInSeconds: number;
} {
  pruneExpiredState();

  const emailCheck = validateEmail(params.email);
  if (!emailCheck.valid) {
    throw new AuthVerificationError(400, emailCheck.error || 'Invalid email address.');
  }

  const cleanCode = params.code.trim();
  if (!/^\d{6}$/.test(cleanCode)) {
    throw new AuthVerificationError(400, 'Please enter the 6-digit verification code sent to your email.');
  }

  const tokenPayload = verifyToken<ChallengeTokenPayload>(params.challengeToken, 'challenge');
  if (tokenPayload.email !== emailCheck.normalized) {
    throw new AuthVerificationError(400, 'Email address changed. Please request a new verification code.');
  }

  const challenge = pendingChallenges.get(tokenPayload.challengeId);
  if (!challenge || challenge.expiresAt <= Date.now()) {
    pendingChallenges.delete(tokenPayload.challengeId);
    throw new AuthVerificationError(400, 'Verification code expired or already used. Please request a new code.');
  }

  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    pendingChallenges.delete(tokenPayload.challengeId);
    throw new AuthVerificationError(429, 'Too many incorrect code attempts. Please request a new verification code.');
  }

  const candidateHash = hashOtpCode(challenge.challengeId, challenge.email, cleanCode);
  const candidateBuf = Buffer.from(candidateHash, 'utf8');
  const storedBuf = Buffer.from(challenge.codeHash, 'utf8');

  if (candidateBuf.length !== storedBuf.length || !crypto.timingSafeEqual(candidateBuf, storedBuf)) {
    challenge.attempts += 1;
    const remaining = MAX_VERIFY_ATTEMPTS - challenge.attempts;
    if (remaining <= 0) {
      pendingChallenges.delete(tokenPayload.challengeId);
      throw new AuthVerificationError(429, 'Too many incorrect code attempts. Please request a new verification code.');
    }
    throw new AuthVerificationError(
      400,
      `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
    );
  }

  pendingChallenges.delete(tokenPayload.challengeId);

  const jti = crypto.randomUUID();
  const expiresAt = Date.now() + VERIFIED_TOKEN_TTL_MS;
  verifiedRecords.set(jti, {
    jti,
    email: challenge.email,
    expiresAt,
  });

  const verificationToken = signToken({
    kind: 'verified',
    jti,
    email: challenge.email,
    exp: expiresAt,
  });

  return {
    verified: true,
    verificationToken,
    expiresInSeconds: Math.round(VERIFIED_TOKEN_TTL_MS / 1000),
  };
}

export function validateAndConsumeSignupVerification(params: {
  email: string;
  username: string;
  password: string;
  verificationToken: string;
}): {
  ok: true;
  email: string;
  username: string;
} {
  pruneExpiredState();

  const emailCheck = validateEmail(params.email);
  if (!emailCheck.valid) {
    throw new AuthVerificationError(400, emailCheck.error || 'Invalid email address.');
  }

  const usernameCheck = validateUsername(params.username);
  if (!usernameCheck.valid) {
    throw new AuthVerificationError(400, usernameCheck.error || 'Invalid username.');
  }

  const passwordCheck = evaluatePasswordStrength(params.password, {
    username: usernameCheck.clean,
    email: emailCheck.normalized,
  });
  if (!passwordCheck.valid) {
    throw new AuthVerificationError(
      400,
      passwordCheck.errors[0] || 'Please choose a stronger, authentic password.'
    );
  }

  const payload = verifyToken<VerificationTokenPayload>(params.verificationToken, 'verified');
  if (payload.email !== emailCheck.normalized) {
    throw new AuthVerificationError(400, 'Verified email mismatch. Please verify your email address again.');
  }

  const record = verifiedRecords.get(payload.jti);
  if (!record || record.email !== emailCheck.normalized || record.expiresAt <= Date.now()) {
    verifiedRecords.delete(payload.jti);
    throw new AuthVerificationError(400, 'Email verification expired or already used. Please request a new code.');
  }

  verifiedRecords.delete(payload.jti);

  return {
    ok: true,
    email: emailCheck.normalized,
    username: usernameCheck.clean,
  };
}
