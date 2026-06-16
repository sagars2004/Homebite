import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateJson } from "./ai-provider.server";
import {
  GeneratedRecipeSchema,
  generatedRecipePrompt,
  prepareMealSteps,
} from "./recipe-steps.server";

const InputSchema = z.object({
  ingredients: z.array(z.string().trim().min(1).max(80)).min(1).max(40),
  timeMinutes: z.number().int().min(5).max(240),
  timeNote: z.string().trim().max(400).optional(),
  vibes: z.array(z.string().trim().min(1).max(60)).max(24).default([]),
});

function describeTime(minutes: number) {
  if (minutes >= 120) return "plenty of time tonight (two hours or more if it's worth it)";
  if (minutes <= 20) return `only about ${minutes} minutes — keep it fast`;
  return `about ${minutes} minutes`;
}

const RecommendationSchema = z.object({
  dish_name: z.string(),
  reason: z.string(),
  ingredients_used: z.array(z.string()),
  missing_ingredients: z.array(z.string()),
  time_estimate: z.string(),
  effort: z.string(),
  search_term: z.string(),
});

type Meal = Record<string, string | null>;

// Verbatim PRD system prompt for the recommendation call.
const RECOMMENDATION_SYSTEM =
  "You are a confident, experienced home cook advising a friend in their 20s cooking for themselves tonight. Speak plainly and directly. Give one clear recommendation, never a list. Sound like a knowledgeable friend, not a recipe app. Never say 'based on your ingredients' or 'I recommend' — just tell them what to make.";

type PexelsResponse = { photos?: Array<{ src?: { large?: string; landscape?: string } }> };

// Look up a real photo for a dish on Pexels. Returns null when there's no key,
// no match, or the request fails, so callers can fall back to the placeholder.
async function fetchDishPhoto(searchTerm: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  const query = searchTerm.trim();
  if (!apiKey || !query) return null;

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    const response = await fetch(url, { headers: { Authorization: apiKey } });
    if (!response.ok) return null;
    const data = (await response.json()) as PexelsResponse;
    const src = data.photos?.[0]?.src;
    return src?.landscape ?? src?.large ?? null;
  } catch (error) {
    console.warn("Homebite Pexels photo lookup failed", error);
    return null;
  }
}

function messageForError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("402"))
    return "Homebite is out of AI credits right now. Add workspace credits, then try again.";
  if (message.includes("429"))
    return "The kitchen is busy right now. Give it a minute, then try again.";
  return "Couldn't put a recipe together just now. Your ingredients are still here, so try again.";
}

export const makeRecipe = createServerFn({ method: "POST" })
  .validator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const vibePhrase =
        data.vibes.length > 0 ? data.vibes.join(", ") : "anything good — cook's choice";
      const notePhrase = data.timeNote ? ` Extra context from me: ${data.timeNote}.` : "";

      // Recommendation prompt — the cook's vibes (moods, cuisines, styles) and
      // time budget steer both this answer and the search_term used to query
      // TheMealDB below.
      const recommendation = await generateJson({
        system: RECOMMENDATION_SYSTEM,
        prompt: `I have these ingredients: ${data.ingredients.join(", ")}. Tonight I'm feeling: ${vibePhrase}. I have ${describeTime(data.timeMinutes)}.${notePhrase} What should I make tonight?

Honor what I'm feeling — if I named a cuisine (e.g. Thai, Italian, Mexican) lean into it, and if I named a style (e.g. protein heavy, vegetarian, low carb, one pan) respect it. Pick one dish that fits my time.

Return ONLY a valid JSON object with these exact fields:
{
  "dish_name": "string — the name of the dish",
  "reason": "string — one casual sentence (max 20 words) explaining why this is right for tonight",
  "ingredients_used": ["array of strings from my ingredient list that this dish needs"],
  "missing_ingredients": ["array of common pantry staples this dish needs that I didn't list — keep this short, max 3 items"],
  "time_estimate": "string — e.g. '25 minutes'",
  "effort": "string — e.g. 'Normal effort'",
  "search_term": "string — best single search term to find this dish on a recipe database, reflecting any cuisine I asked for"
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
          ? await prepareMealSteps(rawInstructions, ingredients)
          : [];
        if (steps.length === 0) steps = ["Instructions weren't available for this one."];

        const imageUrl =
          meal.strMealThumb ?? (await fetchDishPhoto(recommendation.search_term));

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
            ingredients,
            steps,
          },
        };
      }

      // Fallback — full Gemini recipe when MealDB has no match.
      const generated = await generateJson({
        prompt: generatedRecipePrompt(recommendation.dish_name),
        schema: GeneratedRecipeSchema,
      });

      // No MealDB match, so search Pexels for a real photo of the dish using
      // the model's image search term (falling back to the dish name). If that
      // also comes up empty the client shows a clean branded placeholder.
      const imageUrl =
        (await fetchDishPhoto(generated.image_search_term)) ??
        (await fetchDishPhoto(recommendation.dish_name));

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
