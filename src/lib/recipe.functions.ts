import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateJson } from "./ai-provider.server";

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

const StepsSchema = z.array(z.string().min(1)).min(1);

const GeneratedRecipeSchema = z.object({
  ingredients: z.array(z.object({ name: z.string(), measure: z.string() })),
  steps: z.array(z.string()),
  image_search_term: z.string(),
});

type Meal = Record<string, string | null>;

// Verbatim PRD system prompt for the recommendation call.
const RECOMMENDATION_SYSTEM =
  "You are a confident, experienced home cook advising a friend in their 20s cooking for themselves tonight. Speak plainly and directly. Give one clear recommendation, never a list. Sound like a knowledgeable friend, not a recipe app. Never say 'based on your ingredients' or 'I recommend' — just tell them what to make.";

function messageForError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("402"))
    return "Homebite is out of AI credits right now. Add workspace credits, then try again.";
  if (message.includes("429"))
    return "The kitchen is busy right now. Give it a minute, then try again.";
  return "Couldn't put a recipe together just now. Your ingredients are still here, so try again.";
}

export const makeRecipe = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      // Verbatim PRD recommendation user prompt, with placeholders filled.
      const recommendation = await generateJson({
        system: RECOMMENDATION_SYSTEM,
        prompt: `I have these ingredients: ${data.ingredients.join(", ")}. I want something ${data.vibe} and I have ${data.time} time. What should I make tonight?

Return ONLY a valid JSON object with these exact fields:
{
  "dish_name": "string — the name of the dish",
  "reason": "string — one casual sentence (max 20 words) explaining why this is right for tonight",
  "ingredients_used": ["array of strings from my ingredient list that this dish needs"],
  "missing_ingredients": ["array of common pantry staples this dish needs that I didn't list — keep this short, max 3 items"],
  "time_estimate": "string — e.g. '25 minutes'",
  "effort": "string — e.g. 'Normal effort'",
  "search_term": "string — best single search term to find this dish on a recipe database"
}

Return raw JSON only, no markdown, no explanation.`,
        schema: RecommendationSchema,
      });

      // TheMealDB: "1" is the free test key; a paid key drops into the same path slot.
      const mealDbKey = process.env.MEALDB_API_KEY ?? "1";
      const searchUrl = `https://www.themealdb.com/api/json/v1/${mealDbKey}/search.php?s=${encodeURIComponent(recommendation.search_term)}`;
      const mealResponse = await fetch(searchUrl);
      const mealData = mealResponse.ok
        ? ((await mealResponse.json()) as { meals: Meal[] | null })
        : { meals: null };
      const meal = mealData.meals?.[0];

      if (meal) {
        const ingredients = Array.from({ length: 20 }, (_, index) => {
          const position = index + 1;
          const name = meal[`strIngredient${position}`]?.trim();
          const measure = meal[`strMeasure${position}`]?.trim() ?? "";
          return name ? { name, measure } : null;
        }).filter((item): item is { name: string; measure: string } => item !== null);

        const rawInstructions = meal.strInstructions?.trim() ?? "";
        let steps = rawInstructions
          .split(/\r?\n+/)
          .map((step) => step.trim())
          .filter(Boolean);

        if (rawInstructions) {
          try {
            // Verbatim PRD steps-rewrite prompt — returns a JSON array of strings.
            steps = await generateJson({
              prompt: `Rewrite these recipe steps in a warm, conversational tone for a home cook in their 20s. Keep every step accurate. Sound like a knowledgeable friend talking them through it — reassure them on tricky steps, say what to look for not just what to do, cut formal language. Return ONLY a valid JSON array of step strings. No markdown, no numbering, no explanation.

Steps to rewrite:
${rawInstructions}`,
              schema: StepsSchema,
            });
          } catch (error) {
            console.warn("Homebite step rewrite failed; using MealDB instructions", error);
          }
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

      // Fallback — full Gemini recipe generation (verbatim PRD prompt).
      const generated = await generateJson({
        prompt: `Generate a complete recipe for ${recommendation.dish_name} suitable for a home cook. Return ONLY a valid JSON object:
{
  "ingredients": [{"name": "string", "measure": "string"}],
  "steps": ["array of step strings in conversational friendly tone"],
  "image_search_term": "string — a descriptive term to find a photo of this dish"
}
No markdown, no explanation.`,
        schema: GeneratedRecipeSchema,
      });

      const imageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(generated.image_search_term)},food`;

      return {
        ok: true as const,
        recipe: {
          dishName: recommendation.dish_name,
          reason: recommendation.reason,
          timeEstimate: recommendation.time_estimate,
          effort: recommendation.effort,
          imageUrl,
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
