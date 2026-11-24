import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import multer from 'multer';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

admin.initializeApp();

const geminiApiKey = defineSecret('GEMINI_API_KEY');
const app = express();

interface AuthedRequest extends Request {
  uid?: string;
}

function redactPii(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\b(?:\+?63|0)9\d{9}\b/g, '[redacted-phone]');
}

async function verifyFirebaseAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

function getGenAi() {
  const key = geminiApiKey.value() || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY secret is not configured.');
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post(
  '/api/extract',
  verifyFirebaseAuth,
  upload.single('file'),
  async (req: AuthedRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Please attach a PDF, PPTX, DOCX, or image file.' });
        return;
      }
      const ext = path.extname(req.file.originalname || '').toLowerCase();
      let sourceType: 'pdf' | 'pptx' | 'docx' | 'image' = 'pdf';
      let rawText = '';

      if (ext === '.pdf' || req.file.mimetype === 'application/pdf') {
        sourceType = 'pdf';
        const parser = new PDFParse({ data: req.file.buffer });
        try {
          const parsed = await parser.getText();
          rawText = (parsed.text || '').trim();
        } finally {
          await parser.destroy();
        }
      } else if (ext === '.pptx') {
        sourceType = 'pptx';
        const zip = await JSZip.loadAsync(req.file.buffer);
        const slides = Object.keys(zip.files)
          .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
          .sort();
        const parts: string[] = [];
        for (const s of slides) {
          const xml = await zip.files[s].async('string');
          const matches = Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)).map((m) =>
            m[1].trim()
          );
          if (matches.length) parts.push(matches.join(' '));
        }
        rawText = parts.join('\n\n').trim();
      } else if (ext === '.docx') {
        sourceType = 'docx';
        const doc = await mammoth.extractRawText({ buffer: req.file.buffer });
        rawText = (doc.value || '').trim();
      } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext) || req.file.mimetype.startsWith('image/')) {
        sourceType = 'image';
        const ai = getGenAi();
        const ocr = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: req.file.mimetype || 'image/png',
                  data: req.file.buffer.toString('base64'),
                },
              },
              {
                text: 'Transcribe all Physics notes, text, equations, and units cleanly. Replace any personal names with [student].',
              },
            ],
          },
          config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
        });
        rawText = (ocr.text || '').trim();
      } else {
        res.status(400).json({ error: 'Unsupported file format.' });
        return;
      }

      const extractedText = redactPii(rawText).slice(0, 95000);
      if (!extractedText) {
        res.status(400).json({ error: 'No readable text found in file.' });
        return;
      }
      res.json({ extractedText, sourceType });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Extraction failed.' });
    }
  }
);

app.post('/api/generate-study-set', verifyFirebaseAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { title, course, extractedText } = req.body as {
      title?: string;
      course?: string;
      extractedText?: string;
    };
    if (!title || !course || !extractedText || extractedText.trim().length < 20) {
      res.status(400).json({ error: 'Valid title, course, and extracted text are required.' });
      return;
    }

    const ai = getGenAi();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Title: ${title}\nCourse: ${course}\n\n${redactPii(extractedText).slice(0, 35000)}`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction:
          'Generate a Grade 12 DepEd Physics reviewer summary, 8-12 Q&A flashcards, and 6-10 mixed quiz questions (mcq, true_false, short_answer) with $...$ KaTeX formulas and SI units.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reviewerSummary: { type: Type.STRING },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { front: { type: Type.STRING }, back: { type: Type.STRING } },
                required: ['front', 'back'],
              },
            },
            quizQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  question: { type: Type.STRING },
                  choices: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  acceptableAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
                  explanation: { type: Type.STRING },
                },
                required: ['type', 'question', 'choices', 'correctIndex', 'explanation'],
              },
            },
          },
          required: ['reviewerSummary', 'flashcards', 'quizQuestions'],
        },
      },
    });
    res.json(JSON.parse(response.text || '{}'));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Generation failed.' });
  }
});

app.post('/api/ai-chat', verifyFirebaseAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { question, history, simpleMode, materialContext } = req.body as {
      question?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      simpleMode?: boolean;
      materialContext?: { title: string; course: string; extractedText: string };
    };
    if (!question || !question.trim()) {
      res.status(400).json({ error: 'Question is required.' });
      return;
    }

    const ai = getGenAi();
    const recent = (history || [])
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${redactPii(m.content).slice(0, 1200)}`)
      .join('\n');
    const context = materialContext
      ? `\n\nSelected Material (${materialContext.course} — ${materialContext.title}):\n${redactPii(
          materialContext.extractedText
        ).slice(0, 20000)}`
      : '';
    const simpleNote = simpleMode
      ? ' Use Explain-Like-I-Am-12 analogies and very simple wording.'
      : '';

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: [recent, context, `Question: ${redactPii(question).slice(0, 2000)}`]
        .filter(Boolean)
        .join('\n\n'),
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction:
          `You are IsipAgham Physics Assistant for Grade 12 SHS in the Philippines. Answer only Physics 1-3 topics in clear language with KaTeX $...$ formulas and SI units. Prefer provided Study Material when relevant, state when unsure, advise checking with a teacher, and never ask for personal info.${simpleNote}`,
      },
    });

    res.json({ answer: (response.text || '').trim() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI chat failed.' });
  }
});

export const api = onRequest(
  {
    region: 'asia-southeast1',
    secrets: [geminiApiKey],
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  app
);
