import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type ModelMessage } from "ai";
import type { z } from "zod";
import { assertGeminiQuota, isRateLimitError } from "./gemini-quota.server";

// Text + JSON: gemini-2.0-flash — good free-tier RPM.
// Vision/OCR: gemini-2.5-flash (gemini-1.5-flash is no longer on the v1beta API).
const DEFAULT_TEXT_MODEL = "gemini-2.0-flash";
const DEFAULT_VISION_MODEL = "gemini-2.5-flash";

export function createAiProvider(kind: "text" | "vision" = "text") {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const modelId =
    kind === "vision"
      ? (process.env.GEMINI_VISION_MODEL ??
        process.env.GEMINI_MODEL ??
        DEFAULT_VISION_MODEL)
      : (process.env.GEMINI_MODEL ?? DEFAULT_TEXT_MODEL);

  const google = createGoogleGenerativeAI({ apiKey });
  return google(modelId);
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
  /** Use the vision-tuned model (receipt/fridge OCR). Defaults to text model. */
  modelKind?: "text" | "vision";
};

// A rate-limit / quota error (HTTP 429 or local throttle). Retrying within the
// same minute only burns more quota, so we surface it immediately instead.
export { isRateLimitError } from "./gemini-quota.server";

// Single place that talks to the model and guarantees a schema-valid JSON
// result. One attempt only on the free tier — a JSON-parse retry doubles quota
// usage. Never retries on rate-limit errors.
//
// maxRetries: 0 so the AI SDK doesn't silently retry each call up to 3x.
export async function generateJson<T>({
  schema,
  system,
  prompt,
  messages,
  maxOutputTokens = 4096,
  modelKind = "text",
}: GenerateJsonArgs<T>): Promise<T> {
  assertGeminiQuota();
  const model = createAiProvider(modelKind);

  try {
    const result = await generateText({
      model,
      system,
      ...(messages ? { messages } : { prompt: prompt ?? "" }),
      maxOutputTokens,
      maxRetries: 0,
    });
    if (!result.text.trim()) throw new Error(`Empty AI response (${result.finishReason})`);
    return parseJson(result.text, schema);
  } catch (error) {
    throw error instanceof Error ? error : new Error("AI returned invalid JSON");
  }
}
