interface Env {
  GEMINI_API_KEY: string;
  FIREBASE_API_KEY?: string;
}

interface TutorContext {
  request: Request;
  env: Env;
}

// Public Firebase Web API key from firebase-applet-config.json (used as fallback if FIREBASE_API_KEY env var is not set in Cloudflare)
const DEFAULT_FIREBASE_WEB_API_KEY = "AIzaSyAQtHBRr4_RhX-3U3mb2n67IeR-qGcEEr8";

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

async function verifyUser(
  request: Request,
  firebaseApiKey: string
): Promise<{ ok: boolean; error?: string }> {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return { ok: false, error: "Authentication required. Please sign in." };
  }

  const idToken = authorization.slice(7).trim();
  if (!idToken) {
    return { ok: false, error: "Missing authentication token." };
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!response.ok) {
    return { ok: false, error: "Session expired. Please sign in again." };
  }

  const data = (await response.json()) as {
    users?: Array<{ localId?: string; disabled?: boolean }>;
  };

  const user = data.users?.[0];
  if (!user?.localId || user.disabled) {
    return { ok: false, error: "Session expired. Please sign in again." };
  }

  return { ok: true };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function onRequestGet(): Promise<Response> {
  return json({
    ok: true,
    service: "IsipAgham AI Tutor",
  });
}

export async function onRequestPost({
  request,
  env,
}: TutorContext): Promise<Response> {
  const geminiApiKey = (env.GEMINI_API_KEY || "").trim();
  if (!geminiApiKey) {
    return json(
      {
        error:
          "AI service is not configured. Add GEMINI_API_KEY in Cloudflare Pages > Settings > Environment variables.",
        retryable: false,
      },
      503
    );
  }

  const firebaseApiKey = (
    env.FIREBASE_API_KEY || DEFAULT_FIREBASE_WEB_API_KEY
  ).trim();

  try {
    const authResult = await verifyUser(request, firebaseApiKey);
    if (!authResult.ok) {
      return json({ error: authResult.error || "Unauthorized." }, 401);
    }

    let body: {
      question?: unknown;
      history?: Array<{
        role?: string;
        content?: unknown;
      }>;
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
      if (attempt.delayMs > 0) {
        await sleep(attempt.delayMs);
      }

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
              systemInstruction: {
                parts: [{ text: systemInstruction }],
              },
              contents: [
                {
                  role: "user",
                  parts: [{ text: promptParts.join("\n\n") }],
                },
              ],
            }),
          }
        );
      } catch (networkErr) {
        lastStatus = 503;
        lastErrorMessage =
          networkErr instanceof Error
            ? networkErr.message
            : "Network error reaching Gemini API.";
        if (i < attempts.length - 1) continue;
        return json(
          {
            error:
              "Could not reach the AI Tutor right now. Please try again in a moment.",
            retryable: true,
          },
          503
        );
      }

      const rawText = await response.text();
      let result: {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
        error?: { code?: number; status?: string; message?: string };
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
      if (isRetryableStatus && i < attempts.length - 1) {
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        return json(
          {
            error:
              "The Gemini API key in Cloudflare environment variables is invalid or lacks permission.",
            retryable: false,
          },
          403
        );
      }

      if (response.status === 429) {
        return json(
          {
            error:
              "AI request limit reached for the moment. Please wait a short while and try again.",
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

      if (response.status === 400) {
        return json(
          {
            error:
              "The AI Tutor could not process that request. Try shortening your question or uploaded excerpt.",
            retryable: false,
          },
          400
        );
      }

      return json(
        {
          error:
            "Could not reach the AI Tutor right now. Please try again in a moment.",
          retryable: true,
        },
        lastStatus >= 400 ? lastStatus : 502
      );
    }

    return json({ error: lastErrorMessage, retryable: true }, lastStatus);
  } catch (error) {
    console.error("AI Tutor error:", error);
    return json(
      {
        error: "The AI Tutor could not complete the request.",
        retryable: true,
      },
      500
    );
  }
}
