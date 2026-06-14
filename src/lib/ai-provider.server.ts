import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type ModelMessage } from "ai";
import type { z } from "zod";

// Direct Google Gemini API. Override the model with GEMINI_MODEL if needed.
const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

export function createAiProvider() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const google = createGoogleGenerativeAI({ apiKey });
  return google(process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL);
}

// Gemini returns either a JSON object or a JSON array depending on the prompt.
// Strip any markdown fences, then slice from the first opening bracket to the
// last matching closing bracket so trailing prose never breaks JSON.parse.
export function parseJson<T>(text: string, schema: z.ZodType<T>): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  const firstObject = cleaned.indexOf("{");
  const firstArray = cleaned.indexOf("[");
  const startsWithArray = firstArray >= 0 && (firstObject < 0 || firstArray < firstObject);

  const open = startsWithArray ? firstArray : firstObject;
  const close = startsWithArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
  const candidate = open >= 0 && close > open ? cleaned.slice(open, close + 1) : cleaned;

  return schema.parse(JSON.parse(candidate));
}

type GenerateJsonArgs<T> = {
  schema: z.ZodType<T>;
  system?: string;
  prompt?: string;
  messages?: ModelMessage[];
  maxOutputTokens?: number;
};

// A rate-limit / quota error (HTTP 429). Retrying within the same minute only
// burns more quota, so we surface it immediately instead of looping.
function isRateLimitError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  return (
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    message.includes("quota") ||
    message.includes("rate limit")
  );
}

// Single place that talks to the model and guarantees a schema-valid JSON
// result. Retries once with a nudge when the first response is unparseable, but
// never retries on rate-limit errors (that just multiplies quota usage).
//
// We also pass maxRetries: 0 so the AI SDK doesn't silently retry each call up
// to 3x — on a low quota that amplification is what trips the 429 limit.
export async function generateJson<T>({
  schema,
  system,
  prompt,
  messages,
  maxOutputTokens = 4096,
}: GenerateJsonArgs<T>): Promise<T> {
  const model = createAiProvider();
  const retryNote =
    "\n\nYour previous response was invalid. Return raw JSON only, exactly as requested, with no markdown.";

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await generateText({
        model,
        system,
        ...(messages
          ? { messages }
          : { prompt: attempt === 0 ? (prompt ?? "") : `${prompt ?? ""}${retryNote}` }),
        maxOutputTokens,
        maxRetries: 0,
      });
      if (!result.text.trim()) throw new Error(`Empty AI response (${result.finishReason})`);
      return parseJson(result.text, schema);
    } catch (error) {
      lastError = error;
      if (isRateLimitError(error)) break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI returned invalid JSON twice");
}
