import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const DEFAULT_AI_BASE_URL = "https://ai.gateway.lovable.dev/v1";
const DEFAULT_AI_MODEL = "google/gemini-3-flash-preview";

export function createAiProvider() {
  const apiKey = process.env.AI_API_KEY ?? process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Missing AI_API_KEY");

  const baseURL = process.env.AI_BASE_URL ?? DEFAULT_AI_BASE_URL;
  const isLovableGateway = baseURL.includes("ai.gateway.lovable.dev");

  const provider = createOpenAICompatible({
    name: "homebite-ai",
    baseURL,
    apiKey,
    headers: isLovableGateway
      ? { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }
      : undefined,
  });

  return provider(process.env.AI_MODEL ?? DEFAULT_AI_MODEL);
}