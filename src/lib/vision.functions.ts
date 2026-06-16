import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateJson } from "./ai-provider.server";
import { isRateLimitError } from "./gemini-quota.server";

const InputSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().min(1).max(80),
  source: z.enum(["receipt", "fridge"]).default("receipt"),
});

const IngredientsSchema = z.array(z.string().trim().min(1)).max(80);

// Verbatim PRD ingredient-extraction (Gemini Vision) prompt.
const VISION_PROMPT =
  'This is a photo of a grocery receipt (or refrigerator). Extract every food ingredient you can identify. Return ONLY a valid JSON array of ingredient name strings. Example: ["chicken breast", "garlic", "lemon"]. Do not include prices, quantities, non-food items, or any other text. Return raw JSON only, no markdown.';

function errorMessage(source: "receipt" | "fridge", error: unknown) {
  if (isRateLimitError(error)) {
    return "The kitchen is busy right now. Give it a minute, then try your photo again.";
  }
  return source === "fridge"
    ? "Couldn't read that fridge photo — try better lighting or just type what you have."
    : "Couldn't read that receipt — try better lighting or just type what you have.";
}

export const extractIngredients = createServerFn({ method: "POST" })
  .validator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    if (!data.imageBase64.trim()) {
      return { ok: false as const, error: errorMessage(data.source, null) };
    }

    try {
      const raw = await generateJson({
        modelKind: "vision",
        schema: IngredientsSchema,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: VISION_PROMPT },
              {
                type: "image",
                image: data.imageBase64,
                mediaType: data.mimeType || "image/jpeg",
              },
            ],
          },
        ],
      });

      const ingredients = Array.from(new Set(raw.map((item) => item.trim()).filter(Boolean)));

      if (ingredients.length === 0) {
        return { ok: false as const, error: errorMessage(data.source, null) };
      }

      return { ok: true as const, ingredients };
    } catch (error) {
      console.error("Homebite ingredient extraction failed", error);
      return { ok: false as const, error: errorMessage(data.source, error) };
    }
  });
