interface AssetsFetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  GEMINI_API_KEY: string;
  ELEVENLABS_API_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  ASSETS?: AssetsFetcher;
}

const DEFAULT_FIREBASE_PROJECT_ID = "gen-lang-client-0535882452";
const PRIMARY_TEXT_MODEL = "gemini-4-hydrogen";
const FALLBACK_TEXT_MODEL = "gemini-3.1-flash-lite";
const TTS_PRIMARY_MODEL = "gemini-3.8-flash-lite-tts";
const TTS_FALLBACK_MODEL = "gemini-3.8-flash-tts";

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

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x4000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
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

interface GeminiRestResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
  }>;
  error?: { message?: string; code?: number; status?: string };
}

async function callGeminiWithRetry(
  geminiApiKey: string,
  buildBody: (model: string) => Record<string, unknown>,
  attempts: Array<{ model: string; delayMs: number }> = [
    { model: PRIMARY_TEXT_MODEL, delayMs: 0 },
    { model: FALLBACK_TEXT_MODEL, delayMs: 450 },
    { model: FALLBACK_TEXT_MODEL, delayMs: 1200 },
  ]
): Promise<
  | { ok: true; data: GeminiRestResponse }
  | { ok: false; status: number; error: string; retryable: boolean }
> {
  let lastStatus = 502;
  let lastErrorMessage =
    "Could not reach Gemini right now. Please try again in a moment.";

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
          body: JSON.stringify(buildBody(attempt.model)),
        }
      );
    } catch {
      lastStatus = 503;
      if (i < attempts.length - 1) continue;
      return {
        ok: false,
        status: 503,
        error: "Network error connecting to Gemini API. Please try again.",
        retryable: true,
      };
    }

    const rawText = await response.text();
    let result: GeminiRestResponse = {};
    if (rawText) {
      try {
        result = JSON.parse(rawText) as GeminiRestResponse;
      } catch {
        result = { error: { message: rawText.slice(0, 300) } };
      }
    }

    if (response.ok) {
      return { ok: true, data: result };
    }

    lastStatus = response.status;
    lastErrorMessage =
      result.error?.message || `Gemini returned status ${response.status}.`;

    const isRetryableStatus = [404, 408, 429, 500, 502, 503, 504].includes(
      response.status
    );
    if (isRetryableStatus && i < attempts.length - 1) continue;

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        status: 403,
        error: `Gemini API key rejected (${response.status}): ${lastErrorMessage}`,
        retryable: false,
      };
    }
    if (response.status === 429) {
      return {
        ok: false,
        status: 429,
        error:
          "Gemini usage limit reached right now. Please wait a moment and try again.",
        retryable: true,
      };
    }
    if (response.status === 503) {
      return {
        ok: false,
        status: 503,
        error:
          "The AI service is experiencing a brief traffic spike right now. Please wait a few seconds and try again.",
        retryable: true,
      };
    }

    return {
      ok: false,
      status: lastStatus >= 400 ? lastStatus : 502,
      error: `Gemini error (${response.status}): ${lastErrorMessage}`,
      retryable: response.status >= 500,
    };
  }

  return {
    ok: false,
    status: lastStatus,
    error: lastErrorMessage,
    retryable: true,
  };
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10))
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractZipXmlEntries(
  buffer: ArrayBuffer,
  shouldInclude: (fileName: string) => boolean
): Promise<Array<{ name: string; content: string }>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const decoder = new TextDecoder("utf-8", { fatal: false });

  // Locate End of Central Directory record (PK\x05\x06)
  let eocdOffset = -1;
  const minOffset = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minOffset; i -= 1) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Invalid Office archive format.");
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const results: Array<{ name: string; content: string }> = [];

  let pos = cdOffset;
  for (let i = 0; i < totalEntries && pos + 46 <= bytes.length; i += 1) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;

    const compressionMethod = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);
    const fileName = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLen));

    pos += 46 + nameLen + extraLen + commentLen;

    if (!shouldInclude(fileName)) continue;
    if (localHeaderOffset + 30 > bytes.length) continue;
    if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) continue;

    const lNameLen = view.getUint16(localHeaderOffset + 26, true);
    const lExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + lNameLen + lExtraLen;
    const dataEnd = Math.min(bytes.length, dataStart + compressedSize);
    const compressedSlice = bytes.slice(dataStart, dataEnd);

    if (compressionMethod === 0) {
      results.push({ name: fileName, content: decoder.decode(compressedSlice) });
    } else if (compressionMethod === 8) {
      const stream = new Blob([compressedSlice])
        .stream()
        .pipeThrough(new DecompressionStream("deflate-raw"));
      const content = await new Response(stream).text();
      results.push({ name: fileName, content });
    }
  }

  return results;
}

async function extractPptxText(buffer: ArrayBuffer): Promise<string> {
  const entries = await extractZipXmlEntries(buffer, (name) =>
    /^ppt\/slides\/slide\d+\.xml$/i.test(name)
  );
  if (entries.length === 0) {
    throw new Error("No slides found inside this PowerPoint (.pptx) file.");
  }

  const getSlideNum = (name: string) => {
    const match = name.match(/(\d+)\.xml$/);
    return match ? Number(match[1]) : 0;
  };
  entries.sort((a, b) => getSlideNum(a.name) - getSlideNum(b.name));

  const sections: string[] = [];
  for (const slide of entries) {
    const runs = Array.from(
      slide.content.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)
    )
      .map((m) => decodeXmlEntities(m[1]).trim())
      .filter(Boolean);
    if (runs.length > 0) {
      sections.push(`Slide ${getSlideNum(slide.name)}: ${runs.join(" ")}`);
    }
  }

  const combined = sections.join("\n\n").trim();
  if (!combined) {
    throw new Error("No readable text found in this PowerPoint (.pptx) presentation.");
  }
  return combined;
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const entries = await extractZipXmlEntries(
    buffer,
    (name) => name === "word/document.xml"
  );
  if (entries.length === 0) {
    throw new Error("No readable document XML found inside this Word (.docx) file.");
  }

  const xml = entries[0].content;
  const paragraphs = xml.split(/<w:p(?:\s[^>]*)?>/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const textRuns = Array.from(
      para.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)
    ).map((m) => decodeXmlEntities(m[1]));
    const line = textRuns.join("").replace(/\s+/g, " ").trim();
    if (line) {
      lines.push(line);
    }
  }

  const combined = lines.join("\n").trim();
  if (!combined) {
    throw new Error("No readable text found in this Word (.docx) document.");
  }
  return combined;
}

async function handleExtractPost(request: Request, env: Env): Promise<Response> {
  const projectId = (
    env?.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID
  ).trim();

  try {
    const authResult = await verifyUser(request, projectId);
    if (!authResult.ok) {
      return json({ error: authResult.error || "Unauthorized." }, 401);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return json({ error: "Expected multipart form data with an uploaded file." }, 400);
    }

    const fileEntry = formData.get("file");
    if (!fileEntry || typeof fileEntry === "string") {
      return json({ error: "Please attach a PDF, PPTX, DOCX, or image file." }, 400);
    }

    const file = fileEntry as File;
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
      return json({ error: "File must be between 1 byte and 10 MB." }, 400);
    }

    const fileName = (file.name || "").toLowerCase();
    const mimeType = (file.type || "").toLowerCase();
    const ext = fileName.includes(".") ? `.${fileName.split(".").pop()}` : "";

    const isPdf = ext === ".pdf" || mimeType === "application/pdf";
    const isPptx =
      ext === ".pptx" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    const isDocx =
      ext === ".docx" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isImage =
      [".png", ".jpg", ".jpeg", ".webp"].includes(ext) ||
      mimeType.startsWith("image/");

    if (!isPdf && !isPptx && !isDocx && !isImage) {
      return json(
        { error: "Unsupported file type. Upload PDF, PPTX, DOCX, PNG, JPG, or WEBP." },
        400
      );
    }

    const buffer = await file.arrayBuffer();
    let rawText = "";
    let sourceType: "pdf" | "pptx" | "docx" | "image" = "pdf";

    if (isPptx) {
      sourceType = "pptx";
      rawText = await extractPptxText(buffer);
    } else if (isDocx) {
      sourceType = "docx";
      rawText = await extractDocxText(buffer);
    } else {
      const geminiApiKey = (env?.GEMINI_API_KEY || "").trim();
      if (!geminiApiKey) {
        return json(
          {
            error:
              "GEMINI_API_KEY is missing in Cloudflare Worker Settings > Runtime variables.",
            retryable: false,
          },
          503
        );
      }

      sourceType = isPdf ? "pdf" : "image";
      const safeMime = isPdf
        ? "application/pdf"
        : mimeType === "image/jpeg" || ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : mimeType === "image/webp" || ext === ".webp"
        ? "image/webp"
        : "image/png";

      const base64Data = bytesToBase64(new Uint8Array(buffer));
      const prompt = isPdf
        ? "Extract and transcribe all readable Physics notes, definitions, explanations, formulas (wrapped in $...$ LaTeX where appropriate), units, and practice questions from this PDF cleanly and accurately. Replace any personal student/teacher names with [student]."
        : "Transcribe all Physics notes, text, equations, and units visible in this image cleanly and accurately. Format equations with LaTeX wrapped in $...$ where helpful. Do not include any personal names if visible; replace them with [student].";

      const geminiRes = await callGeminiWithRetry(geminiApiKey, (model) => ({
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: safeMime,
                  data: base64Data,
                },
              },
              { text: prompt },
            ],
          },
        ],
        ...(model === PRIMARY_TEXT_MODEL
          ? { generationConfig: { thinkingConfig: { thinkingLevel: "LOW" } } }
          : {}),
      }));

      if (!geminiRes.ok) {
        return json(
          { error: geminiRes.error, retryable: geminiRes.retryable },
          geminiRes.status
        );
      }

      rawText =
        geminiRes.data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || "")
          .join("")
          .trim() || "";
    }

    const cleaned = redact(rawText.replace(/\r\n/g, "\n").trim()).slice(0, 95000);
    if (!cleaned) {
      return json(
        { error: "Could not extract readable text from the uploaded file." },
        400
      );
    }

    return json({ extractedText: cleaned, sourceType });
  } catch (error) {
    console.error("Extract error:", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not extract document text.",
      },
      400
    );
  }
}

async function handleGenerateStudySetPost(
  request: Request,
  env: Env
): Promise<Response> {
  const geminiApiKey = (env?.GEMINI_API_KEY || "").trim();
  if (!geminiApiKey) {
    return json(
      {
        error:
          "GEMINI_API_KEY is missing in Cloudflare Worker Settings > Runtime variables.",
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
      title?: unknown;
      course?: unknown;
      extractedText?: unknown;
      focus?: unknown;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ error: "Invalid JSON request body." }, 400);
    }

    if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 160) {
      return json({ error: "Valid material title is required." }, 400);
    }
    if (
      body.course !== "Physics 1" &&
      body.course !== "Physics 2" &&
      body.course !== "Physics 3"
    ) {
      return json({ error: "Course must be Physics 1, Physics 2, or Physics 3." }, 400);
    }
    if (typeof body.extractedText !== "string" || body.extractedText.trim().length < 20) {
      return json({ error: "Study material text must be at least 20 characters." }, 400);
    }

    const safeFocus =
      body.focus === "flashcards" || body.focus === "reviewer" || body.focus === "quiz"
        ? body.focus
        : "all";
    const safeContent = redact(body.extractedText).slice(0, 35000);

    const focusHint =
      safeFocus === "flashcards"
        ? "Prioritize high-yield active-recall flashcards (10-12 cards)."
        : safeFocus === "quiz"
        ? "Prioritize a strong 8-10 question mixed quiz."
        : safeFocus === "reviewer"
        ? "Prioritize a thorough one-page structured reviewer summary with worked formulas."
        : "Balance reviewer summary, flashcards, and mixed quiz questions evenly.";

    const systemInstruction =
      'You are creating DepEd Grade 12 Physics study materials (Physics 1, 2, or 3). Wrap mathematical formulas in $...$ KaTeX syntax. Based strictly on the provided Study Material, generate: (1) a concise, well-organized one-page reviewer summary with key formulas and SI units; (2) 8 to 12 high-yield Q&A flashcards; (3) 6 to 10 mixed quiz questions combining type "mcq" (4 choices, 0-based correctIndex), type "true_false" (choices ["True", "False"], correctIndex 0 or 1), and type "short_answer" (choices [], correctIndex 0, acceptableAnswers array with 1-3 concise accepted answers such as a physics term or value with/without unit), plus a clear 1-2 sentence explanation for each. Never invent personal data.';

    const responseSchema = {
      type: "OBJECT",
      properties: {
        reviewerSummary: {
          type: "STRING",
          description:
            "Clear Grade 12 Physics one-page reviewer summary with $...$ formulas and SI units.",
        },
        flashcards: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              front: { type: "STRING", description: "Question or concept prompt" },
              back: {
                type: "STRING",
                description: "Clear answer with $...$ formula and units if relevant",
              },
            },
            required: ["front", "back"],
          },
        },
        quizQuestions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              type: {
                type: "STRING",
                description: "Must be one of: mcq, true_false, short_answer",
              },
              question: { type: "STRING" },
              choices: { type: "ARRAY", items: { type: "STRING" } },
              correctIndex: { type: "INTEGER" },
              acceptableAnswers: { type: "ARRAY", items: { type: "STRING" } },
              explanation: { type: "STRING" },
            },
            required: ["type", "question", "choices", "correctIndex", "explanation"],
          },
        },
      },
      required: ["reviewerSummary", "flashcards", "quizQuestions"],
    };

    const geminiRes = await callGeminiWithRetry(geminiApiKey, (model) => ({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Study Material Title: ${body.title}\nCourse: ${body.course}\nFocus: ${focusHint}\n\nMaterial Content:\n${safeContent}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        ...(model === PRIMARY_TEXT_MODEL
          ? { thinkingConfig: { thinkingLevel: "LOW" } }
          : {}),
      },
    }));

    if (!geminiRes.ok) {
      return json(
        { error: geminiRes.error, retryable: geminiRes.retryable },
        geminiRes.status
      );
    }

    const rawText = (
      geminiRes.data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("") || "{}"
    )
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: {
      reviewerSummary?: string;
      flashcards?: Array<{ front?: string; back?: string }>;
      quizQuestions?: Array<{
        type?: string;
        question?: string;
        choices?: unknown[];
        correctIndex?: number;
        acceptableAnswers?: unknown[];
        explanation?: string;
      }>;
    };

    try {
      parsed = JSON.parse(rawText) as typeof parsed;
    } catch {
      return json(
        {
          error: "Generated study set came back in an unexpected format. Please try again.",
          retryable: true,
        },
        502
      );
    }

    const flashcards = (parsed.flashcards || [])
      .filter((c) => c?.front && c?.back)
      .slice(0, 20)
      .map((c) => ({
        front: String(c.front).trim().slice(0, 500),
        back: String(c.back).trim().slice(0, 1000),
      }));

    const quizQuestions = (parsed.quizQuestions || [])
      .filter((q) => q?.question)
      .slice(0, 15)
      .map((q) => {
        const qType =
          q.type === "true_false" || q.type === "short_answer" || q.type === "mcq"
            ? q.type
            : Array.isArray(q.choices) && q.choices.length === 2
            ? "true_false"
            : Array.isArray(q.acceptableAnswers) &&
              q.acceptableAnswers.length > 0 &&
              (!q.choices || q.choices.length === 0)
            ? "short_answer"
            : "mcq";

        if (qType === "short_answer") {
          const accepted = (Array.isArray(q.acceptableAnswers) ? q.acceptableAnswers : [])
            .map((a) => String(a).trim().slice(0, 120))
            .filter(Boolean)
            .slice(0, 5);
          return {
            type: "short_answer" as const,
            question: String(q.question).trim().slice(0, 500),
            choices: [] as string[],
            correctIndex: 0,
            acceptableAnswers: accepted.length > 0 ? accepted : ["See explanation"],
            explanation: String(
              q.explanation || "Review the formula and units in your study notes."
            )
              .trim()
              .slice(0, 600),
          };
        }

        if (qType === "true_false") {
          const idx = q.correctIndex === 1 ? 1 : 0;
          return {
            type: "true_false" as const,
            question: String(q.question).trim().slice(0, 500),
            choices: ["True", "False"],
            correctIndex: idx,
            explanation: String(
              q.explanation || "Review the concept in your study notes."
            )
              .trim()
              .slice(0, 600),
          };
        }

        const choices = (Array.isArray(q.choices) ? q.choices : [])
          .slice(0, 4)
          .map((ch) => String(ch).trim().slice(0, 300))
          .filter(Boolean);
        const safeChoices =
          choices.length >= 2 ? choices : ["Option A", "Option B", "Option C", "Option D"];
        const idx =
          typeof q.correctIndex === "number" &&
          q.correctIndex >= 0 &&
          q.correctIndex < safeChoices.length
            ? q.correctIndex
            : 0;

        return {
          type: "mcq" as const,
          question: String(q.question).trim().slice(0, 500),
          choices: safeChoices,
          correctIndex: idx,
          explanation: String(
            q.explanation || "Review the formula and units in your study notes."
          )
            .trim()
            .slice(0, 600),
        };
      });

    return json({
      reviewerSummary: String(parsed.reviewerSummary || "Summary unavailable.")
        .trim()
        .slice(0, 28000),
      flashcards,
      quizQuestions,
    });
  } catch (error) {
    console.error("Generate study set error:", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate study set.",
        retryable: true,
      },
      500
    );
  }
}

function formatPhysicsTextForSpeech(raw: string): string {
  return raw
    .replace(/\$\$/g, " ")
    .replace(/\$/g, "")
    .replace(/\\(?:left|right|displaystyle|quad|qquad|,|;)\b/g, " ")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 over $2")
    .replace(/\\sqrt\{([^}]+)\}/g, "square root of $1")
    .replace(/\\vec\{([^}]+)\}/g, "vector $1")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\^\{\\circ\}|\\circ|°/g, " degrees")
    .replace(/\\sin\b/g, "sine ")
    .replace(/\\cos\b/g, "cosine ")
    .replace(/\\tan\b/g, "tangent ")
    .replace(/\bsin\(/g, "sine of (")
    .replace(/\bcos\(/g, "cosine of (")
    .replace(/\btan\(/g, "tangent of (")
    .replace(/\\Delta/g, "delta ")
    .replace(/\\theta/g, "theta ")
    .replace(/\\omega/g, "omega ")
    .replace(/\\alpha/g, "alpha ")
    .replace(/\\beta/g, "beta ")
    .replace(/\\gamma/g, "gamma ")
    .replace(/\\lambda/g, "lambda ")
    .replace(/\\mu/g, "mu ")
    .replace(/\\pi/g, "pi ")
    .replace(/\\rho/g, "rho ")
    .replace(/\\sigma/g, "sigma ")
    .replace(/\\tau/g, "tau ")
    .replace(/\\Phi|\\phi/g, "phi ")
    .replace(/\\varepsilon/g, "epsilon ")
    .replace(/\\Omega/g, "ohms ")
    .replace(/\\times|×/g, " times ")
    .replace(/\\cdot|·/g, " times ")
    .replace(/\\approx|≈/g, " is approximately ")
    .replace(/\\leq|≤/g, " is less than or equal to ")
    .replace(/\\geq|≥/g, " is greater than or equal to ")
    .replace(/\\neq|≠/g, " is not equal to ")
    .replace(/→|=>/g, " gives ")
    .replace(/\bm\/s\^\{?2\}?|\bm\/s²/gi, "meters per second squared")
    .replace(/\bm\/s\b/gi, "meters per second")
    .replace(/\bkm\/h\b/gi, "kilometers per hour")
    .replace(/\brad\/s\^\{?2\}?/gi, "radians per second squared")
    .replace(/\brad\/s\b/gi, "radians per second")
    .replace(/\^\{?2\}?/g, " squared")
    .replace(/\^\{?3\}?/g, " cubed")
    .replace(/\^\{(-?\d+)\}/g, " to the power of $1")
    .replace(/\^(-?\d+)/g, " to the power of $1")
    .replace(/([A-Za-z])_\{([^}]+)\}/g, "$1 $2")
    .replace(/([A-Za-z])_([A-Za-z0-9]+)/g, "$1 $2")
    .replace(/\s*=\s*/g, " equals ")
    .replace(/\s*\+\s*/g, " plus ")
    .replace(/(\d)\s*-\s*(\d)/g, "$1 minus $2")
    .replace(/\s*\/\s*/g, " divided by ")
    .replace(/[{}]/g, " ")
    .replace(/[*#_`~|]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2600);
}

function wrapRawPcmAsWavBytes(
  rawBytes: Uint8Array,
  mimeType: string
): { bytes: Uint8Array; mimeType: string } {
  const isRiff =
    rawBytes.length >= 12 &&
    rawBytes[0] === 0x52 &&
    rawBytes[1] === 0x49 &&
    rawBytes[2] === 0x46 &&
    rawBytes[3] === 0x46 &&
    rawBytes[8] === 0x57 &&
    rawBytes[9] === 0x41 &&
    rawBytes[10] === 0x56 &&
    rawBytes[11] === 0x45;

  if (isRiff || /audio\/(mpeg|mp3|ogg|webm|mp4|aac)/i.test(mimeType)) {
    return { bytes: rawBytes, mimeType: mimeType || "audio/wav" };
  }

  const rateMatch = mimeType.match(/rate=(\d+)/i);
  const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  const out = new Uint8Array(44 + rawBytes.length);
  const view = new DataView(out.buffer);
  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      out[offset + i] = str.charCodeAt(i);
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + rawBytes.length, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, "data");
  view.setUint32(40, rawBytes.length, true);
  out.set(rawBytes, 44);

  return { bytes: out, mimeType: "audio/wav" };
}

const ELEVENLABS_VOICE_MAP: Record<string, { id: string; preferred: string[] }> = {
  Aria: { id: "9BWtsMINqrJLrRacOk9x", preferred: ["aria", "rachel", "alice", "sarah"] },
  Sarah: { id: "EXAVITQu4vr4xnSDxMaL", preferred: ["sarah", "bella", "jessica", "laura"] },
  Liam: { id: "TX3LPaxmHKxFdv7VOQHJ", preferred: ["liam", "charlie", "josh", "antoni"] },
  Brian: { id: "nPczCjzI2devNBz1zQrb", preferred: ["brian", "daniel", "adam", "george"] },
  George: { id: "JBFqnCBsd6RMkjVDRZzb", preferred: ["george", "daniel", "callum", "brian"] },
};

const ELEVEN_TO_GEMINI_VOICE: Record<string, string> = {
  Aria: "Zephyr",
  Sarah: "Kore",
  Liam: "Puck",
  Brian: "Charon",
  George: "Fenrir",
  Zephyr: "Zephyr",
  Kore: "Kore",
  Puck: "Puck",
  Charon: "Charon",
  Fenrir: "Fenrir",
};

async function tryElevenLabsTts(
  apiKey: string,
  cleanText: string,
  voiceName?: string
): Promise<{ audioBase64: string; mimeType: string; provider: "elevenlabs" } | null> {
  const presetKey =
    voiceName && voiceName in ELEVENLABS_VOICE_MAP ? voiceName : "Aria";
  const primaryId = ELEVENLABS_VOICE_MAP[presetKey].id;

  const attemptCall = async (voiceId: string, modelId: string) => {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: modelId,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.78,
            style: 0.15,
            use_speaker_boost: true,
          },
        }),
      }
    );
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) return null;
    return {
      audioBase64: bytesToBase64(new Uint8Array(buf)),
      mimeType: "audio/mpeg",
      provider: "elevenlabs" as const,
    };
  };

  const first = await attemptCall(primaryId, "eleven_flash_v2_5").catch(() => null);
  if (first) return first;

  const fallback = await attemptCall(primaryId, "eleven_multilingual_v2").catch(
    () => null
  );
  return fallback;
}

async function handleTtsPost(request: Request, env: Env): Promise<Response> {
  const geminiApiKey = (env?.GEMINI_API_KEY || "").trim();
  const elevenKey = (env?.ELEVENLABS_API_KEY || "").trim();

  if (!geminiApiKey && !elevenKey) {
    return json(
      {
        error:
          "GEMINI_API_KEY is missing in Cloudflare Worker Settings > Runtime variables.",
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

    let body: { text?: unknown; voiceName?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ error: "Invalid JSON request body." }, 400);
    }

    if (
      typeof body.text !== "string" ||
      !body.text.trim() ||
      body.text.length > 10000
    ) {
      return json(
        { error: "Readable text (1 to 10000 characters) is required." },
        400
      );
    }

    const cleanText = formatPhysicsTextForSpeech(redact(body.text));
    if (!cleanText) {
      return json({ error: "There is no readable text to speak." }, 400);
    }

    const voiceName = typeof body.voiceName === "string" ? body.voiceName : undefined;

    if (elevenKey) {
      const elevenResult = await tryElevenLabsTts(elevenKey, cleanText, voiceName);
      if (elevenResult) {
        return json(elevenResult);
      }
    }

    if (!geminiApiKey) {
      return json(
        { error: "Could not synthesize voice audio right now.", retryable: true },
        502
      );
    }

    const safeVoice =
      (voiceName && ELEVEN_TO_GEMINI_VOICE[voiceName]) || "Zephyr";

    const ttsAttempts: Array<{ model: string; withMetadata: boolean; delayMs: number }> = [
      { model: TTS_PRIMARY_MODEL, withMetadata: true, delayMs: 0 },
      { model: TTS_PRIMARY_MODEL, withMetadata: false, delayMs: 400 },
      { model: TTS_FALLBACK_MODEL, withMetadata: false, delayMs: 650 },
    ];

    let lastStatus = 502;
    let lastError = "Could not synthesize voice audio right now.";

    for (let i = 0; i < ttsAttempts.length; i += 1) {
      const attempt = ttsAttempts[i];
      if (attempt.delayMs > 0) await sleep(attempt.delayMs);

      const partPayload = attempt.withMetadata
        ? {
            text: cleanText,
            speechMetadata: {
              style:
                "Warm, natural, friendly human Physics tutor speaking clearly at a steady conversational pace with natural intonation and pauses",
            },
          }
        : { text: cleanText };

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${attempt.model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiApiKey,
              "User-Agent": "aistudio-build",
            },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [partPayload] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: safeVoice,
                    },
                  },
                },
              },
            }),
          }
        );

        const rawText = await res.text();
        let data: GeminiRestResponse = {};
        if (rawText) {
          try {
            data = JSON.parse(rawText) as GeminiRestResponse;
          } catch {
            data = { error: { message: rawText.slice(0, 200) } };
          }
        }

        if (res.ok) {
          const parts = data.candidates?.[0]?.content?.parts || [];
          const audioPart = parts.find((p) => Boolean(p.inlineData?.data));
          if (audioPart?.inlineData?.data) {
            const rawBytes = base64ToUint8Array(audioPart.inlineData.data);
            const wrapped = wrapRawPcmAsWavBytes(
              rawBytes,
              audioPart.inlineData.mimeType || "audio/wav"
            );
            return json({
              audioBase64: bytesToBase64(wrapped.bytes),
              mimeType: wrapped.mimeType,
              provider: "gemini",
            });
          }
          lastStatus = 502;
          lastError = "Voice synthesis returned no audio data.";
        } else {
          lastStatus = res.status;
          lastError = data.error?.message || `Gemini TTS returned ${res.status}.`;
        }
      } catch (err) {
        lastStatus = 503;
        lastError =
          err instanceof Error ? err.message : "Network error reaching Gemini TTS.";
      }
    }

    return json({ error: lastError, retryable: true }, lastStatus);
  } catch (error) {
    console.error("TTS error:", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not synthesize natural speech right now.",
        retryable: true,
      },
      500
    );
  }
}

async function handleAiChatPost(request: Request, env: Env): Promise<Response> {
  const geminiApiKey = (env?.GEMINI_API_KEY || "").trim();
  if (!geminiApiKey) {
    return json(
      {
        error:
          "GEMINI_API_KEY is missing in Cloudflare Worker Settings > Runtime variables.",
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

    const geminiRes = await callGeminiWithRetry(geminiApiKey, () => ({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: promptParts.join("\n\n") }] }],
    }));

    if (!geminiRes.ok) {
      return json(
        { error: geminiRes.error, retryable: geminiRes.retryable },
        geminiRes.status
      );
    }

    const answer = geminiRes.data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      return json(
        {
          error:
            "The AI Tutor returned an empty response. Please try rephrasing your question.",
          retryable: true,
        },
        502
      );
    }

    return json({ answer: answer.slice(0, 18000) });
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
      return json({
        ok: true,
        geminiConfigured: Boolean((env?.GEMINI_API_KEY || "").trim()),
        elevenLabsConfigured: Boolean((env?.ELEVENLABS_API_KEY || "").trim()),
      });
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

    if (url.pathname === "/api/extract") {
      if (request.method === "POST") {
        return handleExtractPost(request, env);
      }
      return json({ error: "Method not allowed." }, 405);
    }

    if (url.pathname === "/api/generate-study-set") {
      if (request.method === "POST") {
        return handleGenerateStudySetPost(request, env);
      }
      return json({ error: "Method not allowed." }, 405);
    }

    if (url.pathname === "/api/tts") {
      if (request.method === "GET") {
        return json({
          ok: true,
          service: "IsipAgham Text-to-Speech",
          geminiConfigured: Boolean((env?.GEMINI_API_KEY || "").trim()),
          elevenLabsConfigured: Boolean((env?.ELEVENLABS_API_KEY || "").trim()),
        });
      }
      if (request.method === "POST") {
        return handleTtsPost(request, env);
      }
      return json({ error: "Method not allowed." }, 405);
    }

    if (url.pathname.startsWith("/api/")) {
      return json(
        { error: `API route ${url.pathname} is not configured on this Worker.` },
        404
      );
    }

    if (env?.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return json({ ok: true, service: "IsipAgham AI Worker" });
  },
};
