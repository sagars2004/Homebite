import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  ingredients: z.array(z.string().trim().min(1).max(80)).min(1).max(40),
  time: z.enum(["Quick (20 min)", "Normal (40 min)", "I have time"]),
  vibe: z.enum(["Comfort food", "Something new", "Keep it light", "Impress someone"]),
});

const RecommendationSchema = z.object({
  dish_name: z.string(),
  reason: z.string(),
  ingredients_used: z.array(z.string()),
  missing_ingredients: z.array(z.string()),
  time_estimate: z.string(),
  effort: z.string(),
  search_term: z.string(),
});

const GeneratedRecipeSchema = z.object({
  ingredients: z.array(z.object({ name: z.string(), measure: z.string() })),
  steps: z.array(z.string()),
});

type Meal = Record<string, string | null>;

function parseJson<T>(text: string, schema: z.ZodType<T>): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const candidate = firstBrace >= 0 && lastBrace > firstBrace
    ? cleaned.slice(firstBrace, lastBrace + 1)
    : cleaned;
  return schema.parse(JSON.parse(candidate));
}

async function generateJson<T>({
  model,
  system,
  prompt,
  schema,
}: {
  model: Parameters<typeof generateText>[0]["model"];
  system?: string;
  prompt: string;
  schema: z.ZodType<T>;
}) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await generateText({
        model,
        system,
        prompt: attempt === 0
          ? prompt
          : `${prompt}\n\nYour previous response was invalid. Return one complete JSON object only, with every requested field.`,
        maxOutputTokens: 4096,
      });
      if (!result.text.trim()) throw new Error(`Empty AI response (${result.finishReason})`);
      return parseJson(result.text, schema);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI returned invalid JSON twice");
}

function messageForError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("402")) return "Homebite is out of AI credits right now. Add workspace credits, then try again.";
  if (message.includes("429")) return "The kitchen is busy right now. Give it a minute, then try again.";
  return "Couldn't put a recipe together just now. Your ingredients are still here, so try again.";
}

export const makeRecipe = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const key = process.env.LOVABLE_API_KEY;
      if (!key) throw new Error("Missing LOVABLE_API_KEY");
      const gateway = createLovableAiGatewayProvider(key);
      const model = gateway("google/gemini-3-flash-preview");

      const recommendation = await generateJson({
        model,
        system: "You are a confident, experienced home cook advising a friend in their 20s cooking for themselves tonight. Speak plainly and directly. Give one clear recommendation, never a list. Sound like a knowledgeable friend, not a recipe app. Never say 'based on your ingredients' or 'I recommend'. Never use the words delicious, amazing, simply, or easy.",
        prompt: `I have these ingredients: ${data.ingredients.join(", ")}. I want ${data.vibe.toLowerCase()} and I have ${data.time.toLowerCase()}. Tell me exactly what to make tonight. Return ONLY raw JSON with these keys: dish_name (string), reason (one casual sentence under 20 words), ingredients_used (string array), missing_ingredients (string array, maximum 3 normal pantry staples), time_estimate (string), effort (string), search_term (string). No markdown.`,
        schema: RecommendationSchema,
      });

      const searchUrl = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(recommendation.search_term)}`;
      const mealResponse = await fetch(searchUrl);
      const mealData = mealResponse.ok ? (await mealResponse.json()) as { meals: Meal[] | null } : { meals: null };
      const meal = mealData.meals?.[0];

      if (meal) {
        const ingredients = Array.from({ length: 20 }, (_, index) => {
          const position = index + 1;
          const name = meal[`strIngredient${position}`]?.trim();
          const measure = meal[`strMeasure${position}`]?.trim() ?? "";
          return name ? { name, measure } : null;
        }).filter((item): item is { name: string; measure: string } => item !== null);
        const rawInstructions = meal.strInstructions?.trim() ?? "";
        let steps = rawInstructions.split(/\r?\n+/).map((step) => step.trim()).filter(Boolean);
        try {
          const rewritten = await generateJson({
            model,
            prompt: `Rewrite these recipe instructions as warm, conversational steps for a home cook in their 20s. Keep every action accurate. Reassure them on tricky moments and say what to look for, not just what to do. Never use delicious, amazing, simply, or easy. Return ONLY raw JSON shaped like {"steps":["step"]}. No markdown.\n\n${rawInstructions}`,
            schema: z.object({ steps: z.array(z.string().min(1)).min(1) }),
          });
          steps = rewritten.steps;
        } catch (error) {
          console.warn("Homebite step rewrite failed; using MealDB instructions", error);
        }
        return {
          ok: true as const,
          recipe: {
            dishName: recommendation.dish_name,
            reason: recommendation.reason,
            timeEstimate: recommendation.time_estimate,
            effort: recommendation.effort,
            imageUrl: meal.strMealThumb ?? null,
            ingredientsUsed: recommendation.ingredients_used,
            missingIngredients: recommendation.missing_ingredients,
            ingredients,
            steps,
          },
        };
      }

      const generated = await generateJson({
        model,
        prompt: `Generate a complete, accurate recipe for ${recommendation.dish_name}, suitable for a home cook. Use a warm, direct, conversational tone. Reassure tricky moments and describe what to look for. Never use delicious, amazing, simply, or easy. Return ONLY raw JSON shaped like {"ingredients":[{"name":"ingredient","measure":"amount"}],"steps":["step"]}. No markdown.`,
        schema: GeneratedRecipeSchema,
      });
      return {
        ok: true as const,
        recipe: {
          dishName: recommendation.dish_name,
          reason: recommendation.reason,
          timeEstimate: recommendation.time_estimate,
          effort: recommendation.effort,
          imageUrl: null,
          ingredientsUsed: recommendation.ingredients_used,
          missingIngredients: recommendation.missing_ingredients,
          ingredients: generated.ingredients,
          steps: generated.steps,
        },
      };
    } catch (error) {
      console.error("Homebite recipe generation failed", error);
      return { ok: false as const, error: messageForError(error) };
    }
  });