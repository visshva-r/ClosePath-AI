import { PRODUCT } from "./product";
import type { SessionState } from "./types";

function env(name: string): string {
  return (process.env[name] || "").trim().replace(/^["']|["']$/g, "");
}

export function isLlmConfigured(): boolean {
  return Boolean(
    env("GEMINI_API_KEY") ||
      env("GOOGLE_GENERATIVE_AI_API_KEY") ||
      env("OPENAI_API_KEY")
  );
}

type GeminiPart = {
  text?: string;
  thought?: boolean;
};

/** Stable defaults if ListModels is unavailable. No deprecated *-latest 1.5 IDs. */
const GEMINI_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
];

function extractGeminiText(data: {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
}): string {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const visible = parts
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text || "")
    .join("")
    .trim();
  if (visible) return visible;
  return parts
    .map((p) => p.text || "")
    .join("")
    .trim();
}

function cleanPolishedText(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```[\w]*\n?|\n?```$/g, "").trim();
  text = text.replace(/^Rewritten (?:reply|message):\s*/i, "").trim();
  text = text
    .replace(/^Here(?:'s| is) (?:the )?(?:rewritten|polished)[^:]*:\s*/i, "")
    .trim();
  return text.trim();
}

function isUsablePolish(polished: string, draft: string): boolean {
  if (!polished) return false;
  if (polished.length < 40) return false;
  if (/got cut off|^\s*["']?\s*->/i.test(polished)) return false;
  if (/^\s*\*\s+\w+\s*$/m.test(polished) && polished.length < 80) return false;
  if (polished.length < Math.min(60, Math.floor(draft.length * 0.35))) {
    return false;
  }
  return true;
}

function isModelMissingError(message: string): boolean {
  return /not found|not supported|is not found for API version/i.test(message);
}

async function listGeminiGenerateModels(geminiKey: string): Promise<string[]> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiKey)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const models = (data?.models || []) as Array<{
      name?: string;
      supportedGenerationMethods?: string[];
    }>;

    return models
      .filter((m) =>
        (m.supportedGenerationMethods || []).includes("generateContent")
      )
      .map((m) => (m.name || "").replace(/^models\//, ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function rankGeminiModels(available: string[], preferred: string): string[] {
  const flash = available.filter(
    (m) => /flash/i.test(m) && !/embed|tts|image|robotics/i.test(m)
  );
  const pool = flash.length > 0 ? flash : available;

  const score = (m: string) => {
    let s = 0;
    if (m === preferred) s += 100;
    if (/2\.5.*flash(?!.*lite)/i.test(m)) s += 50;
    if (/2\.0.*flash(?!.*lite)/i.test(m)) s += 40;
    if (/flash-latest/i.test(m)) s += 30;
    if (/flash-lite/i.test(m)) s += 10;
    if (/pro/i.test(m)) s += 5;
    return s;
  };

  return [...pool].sort((a, b) => score(b) - score(a));
}

async function resolveGeminiModels(geminiKey: string): Promise<string[]> {
  const preferred = env("GEMINI_MODEL") || "gemini-2.5-flash";
  const listed = await listGeminiGenerateModels(geminiKey);
  const ranked = listed.length
    ? rankGeminiModels(listed, preferred)
    : [];

  return [preferred, ...ranked, ...GEMINI_FALLBACK_MODELS].filter(
    (m, i, a) => Boolean(m) && a.indexOf(m) === i
  );
}

async function callGemini(
  geminiKey: string,
  prompt: string,
  draft: string
): Promise<{ text?: string; error?: string; model?: string }> {
  const models = await resolveGeminiModels(geminiKey);
  let lastError = "Gemini request failed";
  let attempted = 0;

  for (const model of models) {
    // Cap attempts so we don't hammer dozens of ListModels entries
    if (attempted >= 6) break;
    attempted += 1;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.error?.message || `Gemini ${model} HTTP ${res.status}`;
        lastError = msg;
        // Skip missing/unsupported model IDs quickly
        if (isModelMissingError(msg)) continue;
        continue;
      }

      const finish = data?.candidates?.[0]?.finishReason as string | undefined;
      const text = cleanPolishedText(extractGeminiText(data));

      if (text && isUsablePolish(text, draft)) {
        return { text, model };
      }

      if (finish === "MAX_TOKENS") {
        lastError = `Gemini ${model} truncated the reply. Try Enhance again.`;
      } else if (text) {
        lastError = `Gemini ${model} returned unusable text; original reply kept.`;
      } else {
        lastError = `Gemini ${model} returned an empty response`;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Gemini network error";
    }
  }

  return { error: lastError };
}

export async function polishReplyWithLlm(
  draft: string,
  session: SessionState,
  userText: string
): Promise<{
  text: string;
  provider: "gemini" | "openai" | "none";
  error?: string;
}> {
  const geminiKey = env("GEMINI_API_KEY") || env("GOOGLE_GENERATIVE_AI_API_KEY");
  const openaiKey = env("OPENAI_API_KEY");

  if (!geminiKey && !openaiKey) {
    return {
      text: draft,
      provider: "none",
      error:
        "No LLM API key configured. Add GEMINI_API_KEY from Google AI Studio to .env.local and restart npm run dev.",
    };
  }

  const prompt = `You are ClosePath, a B2B sales assistant for ${PRODUCT.name}.

Task: Rewrite the DRAFT into a clearer sales reply.
Rules:
- Output ONLY the final customer-facing message
- No preamble, no analysis, no markdown code fences
- Keep under 130 words
- Preserve every number, plan name, price, company name, and CTA from the draft
- Do not invent new facts
- Current sales stage: ${session.stage}

Prospect said:
${userText}

DRAFT:
${draft}`;

  if (geminiKey) {
    const result = await callGemini(geminiKey, prompt, draft);
    if (result.text && isUsablePolish(result.text, draft)) {
      return { text: result.text, provider: "gemini" };
    }
    if (!openaiKey) {
      return {
        text: draft,
        provider: "none",
        error:
          result.error ||
          "Gemini polish looked incomplete, so the original reply was kept. Click Enhance again.",
      };
    }
  }

  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env("OPENAI_MODEL") || "gpt-4o-mini",
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content: `You are ClosePath for ${PRODUCT.name}. Output ONLY the rewritten sales message. No preamble.`,
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = cleanPolishedText(
          data.choices?.[0]?.message?.content?.trim() || ""
        );
        if (text && isUsablePolish(text, draft)) {
          return { text, provider: "openai" };
        }
        return {
          text: draft,
          provider: "none",
          error: "LLM polish looked incomplete; original reply kept.",
        };
      }
      const data = await res.json().catch(() => ({}));
      return {
        text: draft,
        provider: "none",
        error: data?.error?.message || `OpenAI HTTP ${res.status}`,
      };
    } catch (err) {
      return {
        text: draft,
        provider: "none",
        error: err instanceof Error ? err.message : "OpenAI network error",
      };
    }
  }

  return { text: draft, provider: "none", error: "LLM polish failed" };
}
