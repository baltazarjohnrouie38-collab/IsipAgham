import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { requireAuth, type AuthenticatedRequest } from './server/verifyAuth.ts';
import { createRateLimiter } from './server/rateLimit.ts';
import { extractUploadedDocument } from './server/extract.ts';
import {
  askPhysicsTutor,
  GeminiServiceError,
  generateStudySetFromMaterial,
  redactPotentialPii,
  synthesizeSpeechTts,
} from './server/gemini.ts';
import {
  ElevenLabsServiceError,
  isElevenLabsConfigured,
  synthesizeElevenLabsTts,
} from './server/elevenlabs.ts';
import {
  AuthVerificationError,
  sendVerificationCode,
  validateAndConsumeSignupVerification,
  verifyEmailCode,
} from './server/authVerification.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '1mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const extractLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 25,
  label: 'document extraction',
});

const aiLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 15,
  label: 'AI generation',
});

const ttsLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 40,
  label: 'voice synthesis',
});

const authSendCodeLimiter = createRateLimiter({
  windowMs: 10 * 60_000,
  maxRequests: 6,
  label: 'verification code requests',
});

const authVerifyCodeLimiter = createRateLimiter({
  windowMs: 10 * 60_000,
  maxRequests: 15,
  label: 'verification code checks',
});

function sendRouteError(
  res: express.Response,
  err: unknown,
  fallbackMessage: string,
  defaultStatus = 500
) {
  if (err instanceof GeminiServiceError || err instanceof ElevenLabsServiceError) {
    res.status(err.statusCode).json({ error: err.message, retryable: err.retryable });
    return;
  }
  if (err instanceof AuthVerificationError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error(fallbackMessage, err);
  const msg = err instanceof Error ? err.message : fallbackMessage;
  res.status(defaultStatus).json({ error: msg });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/send-verification-code', authSendCodeLimiter, async (req, res) => {
  try {
    const { email, username } = req.body as {
      email?: unknown;
      username?: unknown;
    };

    if (typeof email !== 'string' || typeof username !== 'string') {
      res.status(400).json({ error: 'Username and email address are required.' });
      return;
    }

    const result = await sendVerificationCode({ email, username });
    res.json(result);
  } catch (err) {
    sendRouteError(res, err, 'Could not send verification code right now.', 500);
  }
});

app.post('/api/auth/verify-code', authVerifyCodeLimiter, (req, res) => {
  try {
    const { email, code, challengeToken } = req.body as {
      email?: unknown;
      code?: unknown;
      challengeToken?: unknown;
    };

    if (
      typeof email !== 'string' ||
      typeof code !== 'string' ||
      typeof challengeToken !== 'string'
    ) {
      res.status(400).json({ error: 'Email address, verification code, and challenge token are required.' });
      return;
    }

    const result = verifyEmailCode({ email, code, challengeToken });
    res.json(result);
  } catch (err) {
    sendRouteError(res, err, 'Could not verify the code right now.', 400);
  }
});

app.post('/api/auth/validate-signup', authVerifyCodeLimiter, (req, res) => {
  try {
    const { email, username, password, verificationToken } = req.body as {
      email?: unknown;
      username?: unknown;
      password?: unknown;
      verificationToken?: unknown;
    };

    if (
      typeof email !== 'string' ||
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      typeof verificationToken !== 'string'
    ) {
      res.status(400).json({ error: 'Username, verified email, and authentic password are required.' });
      return;
    }

    const result = validateAndConsumeSignupVerification({
      email,
      username,
      password,
      verificationToken,
    });
    res.json(result);
  } catch (err) {
    sendRouteError(res, err, 'Could not validate account signup details.', 400);
  }
});

app.post(
  '/api/extract',
  requireAuth,
  extractLimiter,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'File exceeds the 10 MB size limit.' });
          return;
        }
        res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed.' });
        return;
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Please attach a PDF, PPTX, DOCX, or image file.' });
        return;
      }
      const result = await extractUploadedDocument(req.file);
      res.json(result);
    } catch (err) {
      sendRouteError(res, err, 'Could not extract document text.', 400);
    }
  }
);

app.post('/api/generate-study-set', requireAuth, aiLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { title, course, extractedText, focus } = req.body as {
      title?: unknown;
      course?: unknown;
      extractedText?: unknown;
      focus?: unknown;
    };

    if (typeof title !== 'string' || !title.trim() || title.length > 160) {
      res.status(400).json({ error: 'Valid material title is required.' });
      return;
    }
    if (course !== 'Physics 1' && course !== 'Physics 2' && course !== 'Physics 3') {
      res.status(400).json({ error: 'Course must be Physics 1, Physics 2, or Physics 3.' });
      return;
    }
    if (typeof extractedText !== 'string' || extractedText.trim().length < 20) {
      res.status(400).json({ error: 'Study material text must be at least 20 characters.' });
      return;
    }

    const safeFocus =
      focus === 'flashcards' || focus === 'reviewer' || focus === 'quiz' ? focus : 'all';

    const generated = await generateStudySetFromMaterial({
      title: title.trim(),
      course,
      extractedText: redactPotentialPii(extractedText),
      focus: safeFocus,
    });

    res.json(generated);
  } catch (err) {
    sendRouteError(res, err, 'Failed to generate study set.', 500);
  }
});

app.post('/api/ai-chat', requireAuth, aiLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { question, history, simpleMode, materialContext } = req.body as {
      question?: unknown;
      history?: unknown;
      simpleMode?: unknown;
      materialContext?: {
        title?: unknown;
        course?: unknown;
        extractedText?: unknown;
      };
    };

    if (typeof question !== 'string' || !question.trim() || question.length > 2000) {
      res.status(400).json({ error: 'Please enter a Physics question (1 to 2000 characters).' });
      return;
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (m): m is { role: 'user' | 'assistant'; content: string } =>
              Boolean(m) &&
              (m.role === 'user' || m.role === 'assistant') &&
              typeof m.content === 'string'
          )
          .slice(-6)
      : [];

    const safeMaterial =
      materialContext &&
      typeof materialContext.title === 'string' &&
      typeof materialContext.course === 'string' &&
      typeof materialContext.extractedText === 'string'
        ? {
            title: materialContext.title.slice(0, 160),
            course: materialContext.course.slice(0, 32),
            extractedText: materialContext.extractedText.slice(0, 30000),
          }
        : undefined;

    const answer = await askPhysicsTutor({
      question: question.trim(),
      history: safeHistory,
      simpleMode: Boolean(simpleMode),
      materialContext: safeMaterial,
    });

    res.json({ answer });
  } catch (err) {
    sendRouteError(res, err, 'Could not get an answer right now.', 500);
  }
});

app.post('/api/tts', requireAuth, ttsLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { text, voiceName } = req.body as {
      text?: unknown;
      voiceName?: unknown;
    };

    if (typeof text !== 'string' || !text.trim() || text.length > 10000) {
      res.status(400).json({ error: 'Readable text (1 to 10000 characters) is required.' });
      return;
    }

    const safeVoiceName = typeof voiceName === 'string' ? voiceName : undefined;

    if (isElevenLabsConfigured()) {
      const result = await synthesizeElevenLabsTts({
        text,
        voiceName: safeVoiceName,
      });
      res.json(result);
      return;
    }

    const fallbackResult = await synthesizeSpeechTts({
      text,
      voiceName: safeVoiceName,
    });
    res.json(fallbackResult);
  } catch (err) {
    sendRouteError(res, err, 'Could not synthesize natural speech right now.', 500);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IsipAgham server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
