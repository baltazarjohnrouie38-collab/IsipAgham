import {
  GoogleGenAI,
  Type,
  ThinkingLevel,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from '@google/genai';

const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

export class GeminiServiceError extends Error {
  statusCode: number;
  retryable: boolean;

  constructor(message: string, statusCode = 500, retryable = false) {
    super(message);
    this.name = 'GeminiServiceError';
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiServiceError(
      'AI service is not configured right now. Please check GEMINI_API_KEY in Settings > Secrets.',
      503,
      false
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ParsedApiError {
  code?: number;
  status?: string;
  message: string;
}

function extractApiErrorDetails(err: unknown): ParsedApiError {
  const rawMessage = err instanceof Error ? err.message : String(err ?? '');
  const numericStatus =
    typeof (err as { status?: unknown })?.status === 'number'
      ? (err as { status: number }).status
      : undefined;

  const trimmed = rawMessage.trim();
  const jsonStart = trimmed.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(trimmed.slice(jsonStart)) as {
        error?: { code?: number; message?: string; status?: string };
        code?: number;
        message?: string;
        status?: string;
      };
      const inner = parsed.error || parsed;
      return {
        code: typeof inner.code === 'number' ? inner.code : numericStatus,
        status: typeof inner.status === 'string' ? inner.status : undefined,
        message: typeof inner.message === 'string' ? inner.message : rawMessage,
      };
    } catch {
      // Fall through to plain-text matching
    }
  }

  return {
    code: numericStatus,
    message: rawMessage,
  };
}

function isRetryableError(details: ParsedApiError): boolean {
  if (details.code && [408, 429, 500, 502, 503, 504].includes(details.code)) {
    return true;
  }
  if (
    details.status &&
    ['UNAVAILABLE', 'RESOURCE_EXHAUSTED', 'INTERNAL', 'DEADLINE_EXCEEDED'].includes(
      details.status.toUpperCase()
    )
  ) {
    return true;
  }
  return /high demand|temporarily unavailable|unavailable|rate limit|quota|timed? out|econnreset|etimedout|fetch failed|503|429/i.test(
    details.message
  );
}

function toFriendlyGeminiError(err: unknown): GeminiServiceError {
  if (err instanceof GeminiServiceError) return err;

  const details = extractApiErrorDetails(err);
  const code = details.code;
  const status = (details.status || '').toUpperCase();

  if (code === 503 || status === 'UNAVAILABLE' || /high demand|unavailable/i.test(details.message)) {
    return new GeminiServiceError(
      'The AI Tutor is experiencing a brief traffic spike right now. Please wait a few seconds and try again.',
      503,
      true
    );
  }

  if (code === 429 || status === 'RESOURCE_EXHAUSTED') {
    return new GeminiServiceError(
      'AI request limit reached for the moment. Please wait a short while and try again.',
      429,
      true
    );
  }

  if (code === 403 || code === 401 || status === 'PERMISSION_DENIED' || /api key/i.test(details.message)) {
    return new GeminiServiceError(
      'The AI service key needs attention. Please check GEMINI_API_KEY in Settings > Secrets.',
      403,
      false
    );
  }

  if (code === 400) {
    return new GeminiServiceError(
      'The AI Tutor could not process that request. Try shortening your question or uploaded excerpt.',
      400,
      false
    );
  }

  return new GeminiServiceError(
    'Could not reach the AI Tutor right now. Please try again in a moment.',
    502,
    true
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithResilience(
  ai: GoogleGenAI,
  buildParams: (model: string) => Omit<GenerateContentParameters, 'model'>
): Promise<GenerateContentResponse> {
  const attempts: Array<{ model: string; delayBeforeMs: number }> = [
    { model: PRIMARY_MODEL, delayBeforeMs: 0 },
    { model: FALLBACK_MODEL, delayBeforeMs: 450 + Math.floor(Math.random() * 250) },
    { model: FALLBACK_MODEL, delayBeforeMs: 1400 + Math.floor(Math.random() * 400) },
    { model: PRIMARY_MODEL, delayBeforeMs: 2400 + Math.floor(Math.random() * 500) },
    { model: FALLBACK_MODEL, delayBeforeMs: 3600 + Math.floor(Math.random() * 600) },
  ];

  let lastError: unknown = null;

  for (let i = 0; i < attempts.length; i += 1) {
    const attempt = attempts[i];
    if (attempt.delayBeforeMs > 0) {
      await sleep(attempt.delayBeforeMs);
    }

    try {
      const params = buildParams(attempt.model);
      return await ai.models.generateContent({
        model: attempt.model,
        ...params,
      });
    } catch (err) {
      lastError = err;
      const details = extractApiErrorDetails(err);
      const isLast = i === attempts.length - 1;
      const canContinue =
        !isLast && (isRetryableError(details) || details.code === 404);

      if (!canContinue) {
        throw toFriendlyGeminiError(err);
      }
    }
  }

  throw toFriendlyGeminiError(lastError);
}

export function redactPotentialPii(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\b(?:\+?63|0)9\d{9}\b/g, '[redacted-phone]');
}

export async function ocrPhysicsImage(buffer: Buffer, mimeType: string): Promise<string> {
  const ai = getAiClient();
  const response = await generateWithResilience(ai, (model) => ({
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: buffer.toString('base64'),
          },
        },
        {
          text: 'Transcribe all Physics notes, text, equations, and units visible in this image cleanly and accurately. Format equations with LaTeX wrapped in $...$ where helpful. Do not include any personal names if visible; replace them with [student].',
        },
      ],
    },
    config:
      model === PRIMARY_MODEL
        ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
        : undefined,
  }));

  const extracted = (response.text || '').trim();
  if (!extracted) {
    throw new GeminiServiceError('No readable text was found in the image.', 400, false);
  }
  return redactPotentialPii(extracted).slice(0, 95000);
}

export interface GeneratedQuizQuestion {
  type: 'mcq' | 'true_false' | 'short_answer';
  question: string;
  choices: string[];
  correctIndex: number;
  acceptableAnswers?: string[];
  explanation: string;
}

export interface GeneratedStudySetPayload {
  reviewerSummary: string;
  flashcards: Array<{ front: string; back: string }>;
  quizQuestions: GeneratedQuizQuestion[];
}

export async function generateStudySetFromMaterial(params: {
  title: string;
  course: string;
  extractedText: string;
  focus?: 'all' | 'flashcards' | 'reviewer' | 'quiz';
}): Promise<GeneratedStudySetPayload> {
  const ai = getAiClient();
  const safeContent = redactPotentialPii(params.extractedText).slice(0, 35000);

  const focusHint =
    params.focus === 'flashcards'
      ? 'Prioritize high-yield active-recall flashcards (10-12 cards).'
      : params.focus === 'quiz'
      ? 'Prioritize a strong 8-10 question mixed quiz.'
      : params.focus === 'reviewer'
      ? 'Prioritize a thorough one-page structured reviewer summary with worked formulas.'
      : 'Balance reviewer summary, flashcards, and mixed quiz questions evenly.';

  const response = await generateWithResilience(ai, (model) => ({
    contents: `Study Material Title: ${params.title}\nCourse: ${params.course}\nFocus: ${focusHint}\n\nMaterial Content:\n${safeContent}`,
    config: {
      ...(model === PRIMARY_MODEL
        ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
        : {}),
      systemInstruction:
        'You are creating DepEd Grade 12 Physics study materials (Physics 1, 2, or 3). Wrap mathematical formulas in $...$ KaTeX syntax. Based strictly on the provided Study Material, generate: (1) a concise, well-organized one-page reviewer summary with key formulas and SI units; (2) 8 to 12 high-yield Q&A flashcards; (3) 6 to 10 mixed quiz questions combining type "mcq" (4 choices, 0-based correctIndex), type "true_false" (choices ["True", "False"], correctIndex 0 or 1), and type "short_answer" (choices [], correctIndex 0, acceptableAnswers array with 1-3 concise accepted answers such as a physics term or value with/without unit), plus a clear 1-2 sentence explanation for each. Never invent personal data.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reviewerSummary: {
            type: Type.STRING,
            description: 'Clear Grade 12 Physics one-page reviewer summary with $...$ formulas and SI units.',
          },
          flashcards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING, description: 'Question or concept prompt' },
                back: { type: Type.STRING, description: 'Clear answer with $...$ formula and units if relevant' },
              },
              required: ['front', 'back'],
            },
          },
          quizQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description: 'Must be one of: mcq, true_false, short_answer',
                },
                question: { type: Type.STRING },
                choices: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                acceptableAnswers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                explanation: { type: Type.STRING },
              },
              required: ['type', 'question', 'choices', 'correctIndex', 'explanation'],
            },
          },
        },
        required: ['reviewerSummary', 'flashcards', 'quizQuestions'],
      },
    },
  }));

  const rawText = (response.text || '{}')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: Partial<GeneratedStudySetPayload>;
  try {
    parsed = JSON.parse(rawText) as Partial<GeneratedStudySetPayload>;
  } catch {
    throw new GeminiServiceError(
      'Generated study set came back in an unexpected format. Please try again.',
      502,
      true
    );
  }

  const flashcards = (parsed.flashcards || [])
    .filter((c) => c?.front && c?.back)
    .slice(0, 20)
    .map((c) => ({
      front: String(c.front).trim().slice(0, 500),
      back: String(c.back).trim().slice(0, 1000),
    }));

  const quizQuestions: GeneratedQuizQuestion[] = (parsed.quizQuestions || [])
    .filter((q) => q?.question)
    .slice(0, 15)
    .map((q) => {
      const qType =
        q.type === 'true_false' || q.type === 'short_answer' || q.type === 'mcq'
          ? q.type
          : Array.isArray(q.choices) && q.choices.length === 2
          ? 'true_false'
          : Array.isArray(q.acceptableAnswers) && q.acceptableAnswers.length > 0 && (!q.choices || q.choices.length === 0)
          ? 'short_answer'
          : 'mcq';

      if (qType === 'short_answer') {
        const accepted = (Array.isArray(q.acceptableAnswers) ? q.acceptableAnswers : [])
          .map((a) => String(a).trim().slice(0, 120))
          .filter(Boolean)
          .slice(0, 5);
        return {
          type: 'short_answer',
          question: String(q.question).trim().slice(0, 500),
          choices: [],
          correctIndex: 0,
          acceptableAnswers: accepted.length > 0 ? accepted : ['See explanation'],
          explanation: String(q.explanation || 'Review the formula and units in your study notes.')
            .trim()
            .slice(0, 600),
        };
      }

      if (qType === 'true_false') {
        const idx = q.correctIndex === 1 ? 1 : 0;
        return {
          type: 'true_false',
          question: String(q.question).trim().slice(0, 500),
          choices: ['True', 'False'],
          correctIndex: idx,
          explanation: String(q.explanation || 'Review the concept in your study notes.')
            .trim()
            .slice(0, 600),
        };
      }

      const choices = (Array.isArray(q.choices) ? q.choices : [])
        .slice(0, 4)
        .map((ch) => String(ch).trim().slice(0, 300))
        .filter(Boolean);
      const safeChoices =
        choices.length >= 2 ? choices : ['Option A', 'Option B', 'Option C', 'Option D'];
      const idx =
        typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < safeChoices.length
          ? q.correctIndex
          : 0;

      return {
        type: 'mcq',
        question: String(q.question).trim().slice(0, 500),
        choices: safeChoices,
        correctIndex: idx,
        explanation: String(q.explanation || 'Review the formula and units in your study notes.')
          .trim()
          .slice(0, 600),
      };
    });

  return {
    reviewerSummary: String(parsed.reviewerSummary || 'Summary unavailable.').trim().slice(0, 28000),
    flashcards,
    quizQuestions,
  };
}

export async function askPhysicsTutor(params: {
  question: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  simpleMode?: boolean;
  materialContext?: {
    title: string;
    course: string;
    extractedText: string;
  };
}): Promise<string> {
  const ai = getAiClient();
  const safeQuestion = redactPotentialPii(params.question).slice(0, 2000);
  const recentHistory = params.history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${redactPotentialPii(m.content).slice(0, 1200)}`)
    .join('\n');

  const materialBlock = params.materialContext
    ? `\n\nSelected Lesson / Study Material (${params.materialContext.course} — "${params.materialContext.title}"):\n${redactPotentialPii(
        params.materialContext.extractedText
      ).slice(0, 20000)}`
    : '';

  const simpleInstruction = params.simpleMode
    ? '\n7. EXPLAIN LIKE I AM 12 MODE IS ON: Use everyday, warm, relatable analogies (like riding a jeepney, basketball, or boiling water), very short sentences, zero jargon without explaining it first, and still show the formula clearly in $...$.'
    : '';

  const systemInstruction = `You are IsipAgham's Physics Study Assistant for Grade 12 Academic Track students in the Philippines.
Rules you MUST follow strictly:
1. Answer ONLY topics within DepEd Senior High School General Physics 1, Physics 2, and Physics 3 (mechanics, vectors, kinematics, Newton's laws, work/energy, momentum, rotational motion, gravitation, fluids, thermodynamics, waves/optics, electrostatics, DC circuits, magnetism, electromagnetic induction). If a question is outside Physics 1–3, politely explain that you only assist with Grade 12 Physics 1 to 3 topics.
2. Use simple, encouraging language suitable for Grade 12 students. Break explanations into easy numbered steps.
3. Always show relevant physics formulas wrapped in KaTeX $...$ or $$...$$ with explicit SI units (e.g., $F = ma$ in $\\text{N}$, $v = d/t$ in $\\text{m/s}$).
4. When a Selected Lesson or Student Study Material is provided, prefer and reference that material first when it is relevant to the question.
5. If you are unsure or the material does not cover a specific class detail, state clearly that you are unsure and advise confirming with their Physics teacher.
6. Never ask for or repeat personal information.${simpleInstruction}`;

  const promptParts: string[] = [];
  if (recentHistory) {
    promptParts.push(`Recent Conversation:\n${recentHistory}`);
  }
  if (materialBlock) {
    promptParts.push(materialBlock);
  }
  promptParts.push(`Student Question: ${safeQuestion}`);

  const response = await generateWithResilience(ai, (model) => ({
    contents: promptParts.join('\n\n'),
    config: {
      systemInstruction,
      ...(model === PRIMARY_MODEL
        ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
        : {}),
    },
  }));

  const answer = (response.text || '').trim();
  if (!answer) {
    throw new GeminiServiceError(
      'The AI Tutor returned an empty response. Please try rephrasing your question.',
      502,
      true
    );
  }
  return answer.slice(0, 18000);
}

const TTS_MODEL = 'gemini-3.8-flash-lite-tts';
const ALLOWED_TTS_VOICES = new Set(['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir']);

export function formatPhysicsTextForSpeech(raw: string): string {
  return raw
    .replace(/\$\$/g, ' ')
    .replace(/\$/g, '')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
    .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
    .replace(/\\vec\{([^}]+)\}/g, 'vector $1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\Delta/g, 'delta ')
    .replace(/\\theta/g, 'theta ')
    .replace(/\\omega/g, 'omega ')
    .replace(/\\alpha/g, 'alpha ')
    .replace(/\\beta/g, 'beta ')
    .replace(/\\gamma/g, 'gamma ')
    .replace(/\\lambda/g, 'lambda ')
    .replace(/\\mu/g, 'mu ')
    .replace(/\\pi/g, 'pi ')
    .replace(/\\rho/g, 'rho ')
    .replace(/\\sigma/g, 'sigma ')
    .replace(/\\tau/g, 'tau ')
    .replace(/\\Phi/g, 'phi ')
    .replace(/\\times/g, ' times ')
    .replace(/\\cdot/g, ' times ')
    .replace(/\\approx/g, ' is approximately ')
    .replace(/\\leq/g, ' is less than or equal to ')
    .replace(/\\geq/g, ' is greater than or equal to ')
    .replace(/\^2\b/g, ' squared')
    .replace(/\^3\b/g, ' cubed')
    .replace(/[*#_`~]/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2600);
}

export async function synthesizeSpeechTts(params: {
  text: string;
  voiceName?: string;
}): Promise<{ audioBase64: string; mimeType: string }> {
  const ai = getAiClient();
  const cleanText = formatPhysicsTextForSpeech(redactPotentialPii(params.text));
  if (!cleanText) {
    throw new GeminiServiceError('There is no readable text to speak.', 400, false);
  }

  const safeVoice =
    params.voiceName && ALLOWED_TTS_VOICES.has(params.voiceName) ? params.voiceName : 'Zephyr';

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) {
      await sleep(650);
    }
    try {
      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style:
                    'Warm, natural, encouraging senior high school Physics tutor speaking clearly at a steady conversational pace',
                },
              } as unknown as { text: string },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: safeVoice,
              },
            },
          },
        },
      });

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inlineData?.data) {
        return {
          audioBase64: inlineData.data,
          mimeType: inlineData.mimeType || 'audio/wav',
        };
      }
      throw new GeminiServiceError('Voice synthesis returned no audio data.', 502, true);
    } catch (err) {
      lastError = err;
      const details = extractApiErrorDetails(err);
      if (attempt === 0 && isRetryableError(details)) {
        continue;
      }
      throw toFriendlyGeminiError(err);
    }
  }

  throw toFriendlyGeminiError(lastError);
}
