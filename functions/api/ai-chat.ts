
interface Env {
  GEMINI_API_KEY: string;
  FIREBASE_API_KEY: string;
}

interface TutorContext {
  request: Request;
  env: Env;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
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
  apiKey: string
): Promise<boolean> {
  const authorization = request.headers.get("Authorization") || "";

  if (!authorization.startsWith("Bearer ")) return false;

  const idToken = authorization.slice(7).trim();
  if (!idToken) return false;

  const response = await fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" +
      encodeURIComponent(apiKey),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!response.ok) return false;

  const data = await response.json() as {
    users?: Array<{ localId?: string; disabled?: boolean }>;
  };

  return Boolean(
    data.users?.[0]?.localId &&
    !data.users[0].disabled
  );
}

export async function onRequestGet() {
  return json({
    ok: true,
    service: "IsipAgham AI Tutor",
  });
}

export async function onRequestPost({
  request,
  env,
}: TutorContext): Promise<Response> {

  if (!env.GEMINI_API_KEY || !env.FIREBASE_API_KEY) {
    return json({
      error: "AI service configuration is incomplete.",
    }, 503);
  }

  try {
    if (!(await verifyUser(request, env.FIREBASE_API_KEY))) {
      return json({
        error: "Session expired. Please sign in again.",
      }, 401);
    }

    let body: {
      question?: string;
      history?: Array<{
        role: "user" | "assistant";
        content: string;
      }>;
      simpleMode?: boolean;
      materialContext?: {
        title?: string;
        course?: string;
        extractedText?: string;
      };
    };

    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request." }, 400);
    }

    if (
      typeof body.question !== "string" ||
      !body.question.trim() ||
      body.question.length > 2000
    ) {
      return json({
        error: "Please enter a valid Physics question.",
      }, 400);
    }

    const history = Array.isArray(body.history)
      ? body.history.filter(
          (item) =>
            item &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string"
        ).slice(-6)
      : [];

    const promptParts: string[] = [];

    if (history.length) {
      promptParts.push(
        "Recent Conversation:\n" +
        history.map((item) =>
          `${item.role === "user" ? "Student" : "Tutor"}: ${redact(item.content).slice(0, 1200)}`
        ).join("\n")
      );
    }

    const material = body.materialContext;

    if (
      material &&
      typeof material.extractedText === "string"
    ) {
      promptParts.push(
        `Study Material (${String(material.course || "").slice(0, 60)} - ${String(material.title || "").slice(0, 160)}):\n` +
        redact(material.extractedText).slice(0, 20000)
      );
    }

    promptParts.push(
      "Student Question: " + redact(body.question).slice(0, 2000)
    );

    const systemInstruction = `
You are IsipAgham's Physics Study Assistant for Grade 12
Academic Track students in the Philippines.

1. Specialize in General Physics 1, 2, and 3.
2. Explain concepts clearly and step by step.
3. For numerical problems, use Given, Formula,
Step-by-step Solution, and Final Answer.
4. Always provide appropriate SI units.
5. Use KaTeX-compatible dollar signs for equations.
6. Prefer provided study materials when relevant.
7. Explain concepts in simple language when simpleMode is enabled.
8. Never ask students for personal information.
${body.simpleMode ? "Use everyday analogies and short explanations." : ""}
`;

    const models = [
      "gemini-4-hydrogen",
      "gemini-3.1-flash-lite",
    ];

    for (const model of models) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents: [{
              role: "user",
              parts: [{
                text: promptParts.join("\n\n"),
              }],
            }],
          }),
        }
      );

      const result = await response.json() as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
        error?: { message?: string };
      };

      if (response.ok) {
        const answer = result.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("")
          .trim();

        if (answer) {
          return json({ answer: answer.slice(0, 18000) });
        }

        return json({
          error: "The AI returned an empty response.",
        }, 502);
      }

      if (response.status === 404 && model !== models[1]) {
        continue;
      }

      if (response.status === 429) {
        return json({
          error: "Gemini usage limit reached. Please try again later.",
        }, 429);
      }

      console.error("Gemini error:", response.status, result.error);

      return json({
        error: "Gemini could not process the request. Please try again.",
      }, 502);
    }

    return json({
      error: "No available Gemini model responded.",
    }, 502);

  } catch (error) {
    console.error("AI Tutor error:", error);

    return json({
      error: "The AI Tutor could not complete the request.",
    }, 500);
  }
}
