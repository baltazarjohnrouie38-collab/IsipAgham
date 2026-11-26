interface AssetsFetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  GEMINI_API_KEY: string;
  FIREBASE_PROJECT_ID?: string;
  ASSETS?: AssetsFetcher;
}

const DEFAULT_FIREBASE_PROJECT_ID = "gen-lang-client-0535882452";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
    },
  });
}

function redact(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(?:\+?63|0)9\d{9}\b/g, "[redacted-phone]");
}

function base64UrlToUint8Array(segment: string): Uint8Array<ArrayBuffer> {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + pad);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64UrlJson<T>(segment: string): T {
  const bytes = base64UrlToUint8Array(segment);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text) as T;
}

interface JwkEntry extends JsonWebKey {
  kid?: string;
}

let cachedJwks: JwkEntry[] = [];
let jwksExpiryMs = 0;

async function getFirebaseJwks(forceRefresh = false): Promise<JwkEntry[]> {
  if (!forceRefresh && Date.now() < jwksExpiryMs && cachedJwks.length > 0) {
    return cachedJwks;
  }

  const res = await fetch(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase public keys (${res.status}).`);
  }

  const cacheControl = res.headers.get("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  const data = (await res.json()) as { keys?: JwkEntry[] };
  cachedJwks = Array.isArray(data.keys) ? data.keys : [];
  jwksExpiryMs = Date.now() + maxAgeSec * 1000;
  return cachedJwks;
}

async function verifyUser(
  request: Request,
  projectId: string
): Promise<{ ok: boolean; error?: string }> {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return { ok: false, error: "Authentication required. Please sign in." };
  }

  const token = authorization.slice(7).trim();
  if (!token) {
    return { ok: false, error: "Missing authentication token." };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { ok: false, error: "Invalid session token format. Please sign in again." };
  }

  try {
    const [headerB64, payloadB64, signatureB64] = parts;
    const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(headerB64);
    const payload = decodeBase64UrlJson<{
      iss?: string;
      aud?: string;
      sub?: string;
      exp?: number;
      iat?: number;
    }>(payloadB64);

    if (header.alg !== "RS256" || !header.kid) {
      return { ok: false, error: "Invalid session token algorithm." };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= nowSec) {
      return { ok: false, error: "Session expired. Please sign in again." };
    }
    if (!payload.iat || payload.iat > nowSec + 300) {
      return { ok: false, error: "Invalid session timestamp. Check your device clock." };
    }
    if (payload.aud !== projectId) {
      return { ok: false, error: "Session project mismatch. Please sign in again." };
    }
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
      return { ok: false, error: "Session issuer mismatch. Please sign in again." };
    }
    if (!payload.sub || typeof payload.sub !== "string" || payload.sub.length > 128) {
      return { ok: false, error: "Invalid user session. Please sign in again." };
    }

    let jwks = await getFirebaseJwks(false);
    let jwk = jwks.find((k) => k.kid === header.kid);
    if (!jwk) {
      jwks = await getFirebaseJwks(true);
      jwk = jwks.find((k) => k.kid === header.kid);
    }
    if (!jwk) {
      return { ok: false, error: "Matching Firebase signing key not found." };
    }

    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const dataBytes = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sigBytes = base64UrlToUint8Array(signatureB64);
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      sigBytes,
      dataBytes
    );

    if (!valid) {
      return { ok: false, error: "Invalid session signature. Please sign in again." };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Session verification failed: ${err.message}`
          : "Session verification failed. Please sign in again.",
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleAiChatPost(request: Request, env: Env): Promise<Response> {
  const geminiApiKey = (env?.GEMINI_API_KEY || "").trim();
  if (!geminiApiKey) {
    return json(
      {
        error:
          "GEMINI_API_KEY is missing in Cloudflare Worker Settings > Variables and Secrets.",
        retryable: false,
      },
      503
    );
  }

  const projectId = (
    env?.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID
  ).trim();

  try {
    const authResult = await verifyUser(request, projectId);
    if (!authResult.ok) {
      return json({ error: authResult.error || "Unauthorized." }, 401);
    }

    let body: {
      question?: unknown;
      history?: Array<{ role?: string; content?: unknown }>;
      simpleMode?: unknown;
      materialContext?: {
        title?: unknown;
        course?: unknown;
        extractedText?: unknown;
      };
    };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ error: "Invalid JSON request body." }, 400);
    }

    if (
      typeof body.question !== "string" ||
      !body.question.trim() ||
      body.question.length > 2000
    ) {
      return json(
        { error: "Please enter a Physics question (1 to 2000 characters)." },
        400
      );
    }

    const history = Array.isArray(body.history)
      ? body.history
          .filter(
            (item): item is { role: "user" | "assistant"; content: string } =>
              Boolean(item) &&
              (item.role === "user" || item.role === "assistant") &&
              typeof item.content === "string"
          )
          .slice(-6)
      : [];

    const promptParts: string[] = [];

    if (history.length > 0) {
      promptParts.push(
        "Recent Conversation:\n" +
          history
            .map(
              (item) =>
                `${item.role === "user" ? "Student" : "Tutor"}: ${redact(item.content).slice(0, 1200)}`
            )
            .join("\n")
      );
    }

    const material = body.materialContext;
    if (
      material &&
      typeof material.extractedText === "string" &&
      material.extractedText.trim().length > 0
    ) {
      const courseLabel =
        typeof material.course === "string" ? material.course.slice(0, 60) : "Physics";
      const titleLabel =
        typeof material.title === "string" ? material.title.slice(0, 160) : "Study Material";
      promptParts.push(
        `Selected Lesson / Study Material (${courseLabel} — "${titleLabel}"):\n` +
          redact(material.extractedText).slice(0, 20000)
      );
    }

    promptParts.push(
      "Student Question: " + redact(body.question.trim()).slice(0, 2000)
    );

    const simpleInstruction = body.simpleMode
      ? "\n8. EXPLAIN LIKE I AM 12 MODE IS ON: Use everyday, warm, relatable analogies (like riding a jeepney, basketball, or boiling water), very short sentences, zero jargon without explaining it first, and still show the formula clearly in $...$."
      : "";

    const systemInstruction = `You are IsipAgham's Physics Study Assistant for Grade 12 Academic Track students in the Philippines.
Rules you MUST follow strictly:
1. Answer topics within DepEd Senior High School General Physics 1, Physics 2, and Physics 3 (measurement, units, vectors, kinematics, Newton's laws, work/energy, momentum, rotational motion, gravitation, fluids, thermodynamics, waves/optics, electrostatics, DC circuits, magnetism, electromagnetic induction, and foundational physics math). If a question is completely outside physics/science, warmly explain that you specialize in Grade 12 Physics 1–3 and invite a physics question.
2. Give accurate, clear, encouraging, step-by-step answers tailored for Grade 12 students. For numerical/problem-solving questions, organize neatly with **Given:**, **Formula:**, **Step-by-step Solution:**, and **Final Answer:** (with the exact numerical value rounded cleanly and explicit SI units). Double-check degree vs. radian trig and arithmetic before writing the final value.
3. FORMATTING RULES FOR CLEAN RENDERING:
   - Wrap inline variables, units, and short equations in single-dollar KaTeX $...$ (e.g., $F = ma$, $v_0 = 20\\text{ m/s}$, $\\theta = 35^\\circ$).
   - Put standalone display equations on their own single line using $$...$$ (NEVER split $$ across multiple lines, NEVER use \\[...\\], NEVER use \\begin{aligned}, and NEVER wrap bold **...** around $...$).
   - Do NOT use markdown headings (#, ##, ###) or markdown tables (|---|). Use **bold labels** and clean numbered steps instead.
4. Keep explanations focused, conversational, and easy to follow—avoid repeating filler warnings.
5. When a Selected Lesson or Student Study Material is provided, prefer and reference that material first when it is relevant to the question.
6. If a specific class policy or missing lab value is not provided, state clearly what assumption is used (e.g., $g = 9.8\\text{ m/s}^2$) and advise confirming with their Physics teacher.
7. Never ask for or repeat personal information.${simpleInstruction}`;

    const attempts: Array<{ model: string; delayMs: number }> = [
      { model: "gemini-4-hydrogen", delayMs: 0 },
      { model: "gemini-3.1-flash-lite", delayMs: 450 },
      { model: "gemini-3.1-flash-lite", delayMs: 1200 },
    ];

    let lastStatus = 502;
    let lastErrorMessage =
      "Could not reach the AI Tutor right now. Please try again in a moment.";

    for (let i = 0; i < attempts.length; i += 1) {
      const attempt = attempts[i];
      if (attempt.delayMs > 0) await sleep(attempt.delayMs);

      let response: Response;
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${attempt.model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiApiKey,
              "User-Agent": "aistudio-build",
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents: [
                { role: "user", parts: [{ text: promptParts.join("\n\n") }] },
              ],
            }),
          }
        );
      } catch {
        lastStatus = 503;
        if (i < attempts.length - 1) continue;
        return json(
          {
            error: "Network error connecting to Gemini API. Please try again.",
            retryable: true,
          },
          503
        );
      }

      const rawText = await response.text();
      let result: {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        error?: { message?: string };
      } = {};

      if (rawText) {
        try {
          result = JSON.parse(rawText) as typeof result;
        } catch {
          result = { error: { message: rawText.slice(0, 300) } };
        }
      }

      if (response.ok) {
        const answer = result.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("")
          .trim();

        if (answer) {
          return json({ answer: answer.slice(0, 18000) });
        }

        lastStatus = 502;
        lastErrorMessage =
          "The AI Tutor returned an empty response. Please try rephrasing your question.";
        if (i < attempts.length - 1) continue;
        return json({ error: lastErrorMessage, retryable: true }, 502);
      }

      lastStatus = response.status;
      lastErrorMessage =
        result.error?.message || `Gemini returned status ${response.status}.`;

      const isRetryableStatus = [404, 408, 429, 500, 502, 503, 504].includes(
        response.status
      );
      if (isRetryableStatus && i < attempts.length - 1) continue;

      if (response.status === 401 || response.status === 403) {
        return json(
          {
            error: `Gemini API key rejected (${response.status}): ${lastErrorMessage}`,
            retryable: false,
          },
          403
        );
      }
      if (response.status === 429) {
        return json(
          {
            error: "Gemini usage limit reached right now. Please wait a moment and try again.",
            retryable: true,
          },
          429
        );
      }
      if (response.status === 503) {
        return json(
          {
            error:
              "The AI Tutor is experiencing a brief traffic spike right now. Please wait a few seconds and try again.",
            retryable: true,
          },
          503
        );
      }

      return json(
        {
          error: `Gemini error (${response.status}): ${lastErrorMessage}`,
          retryable: response.status >= 500,
        },
        lastStatus >= 400 ? lastStatus : 502
      );
    }

    return json({ error: lastErrorMessage, retryable: true }, lastStatus);
  } catch (error) {
    console.error("AI Tutor error:", error);
    return json(
      {
        error:
          error instanceof Error
            ? `AI Tutor error: ${error.message}`
            : "The AI Tutor could not complete the request.",
        retryable: true,
      },
      500
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true });
    }

    if (url.pathname === "/api/ai-chat") {
      if (request.method === "GET") {
        return json({
          ok: true,
          service: "IsipAgham AI Tutor",
          configured: Boolean((env?.GEMINI_API_KEY || "").trim()),
        });
      }
      if (request.method === "POST") {
        return handleAiChatPost(request, env);
      }
      return json({ error: "Method not allowed." }, 405);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: `API route ${url.pathname} is not configured on this Worker.` }, 404);
    }

    if (env?.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return json({ ok: true, service: "IsipAgham AI Worker" });
  },
};
