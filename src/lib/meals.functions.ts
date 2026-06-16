import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { HomebiteRecipe } from "./cooking-session";
import { prepareMealSteps } from "./recipe-steps.server";

// TheMealDB browse layer. Listing/filtering uses only free MealDB endpoints.
// Step formatting is local (no Gemini) unless ENABLE_AI_STEP_REWRITE=true.
type Meal = Record<string, string | null>;

function mealDbUrl(path: string): string {
  const key = process.env.MEALDB_API_KEY ?? "1";
  return `https://www.themealdb.com/api/json/v1/${key}/${path}`;
}

async function mealDbFetch<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(mealDbUrl(path));
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.warn("Homebite TheMealDB request failed", path, error);
    return null;
  }
}

// {id, name, thumb} cards for a results grid. The /small thumbnail variant keeps
// the grid light; the full image is loaded later on the recipe page.
export type MealSummary = { id: string; name: string; thumb: string | null };

function toSummaries(meals: Meal[] | null): MealSummary[] {
  if (!meals) return [];
  return meals
    .map((meal) => {
      const id = meal.idMeal?.trim();
      const name = meal.strMeal?.trim();
      if (!id || !name) return null;
      const thumb = meal.strMealThumb?.trim();
      return { id, name, thumb: thumb ? `${thumb}/small` : null };
    })
    .filter((item): item is MealSummary => item !== null);
}

// MealDB packs ingredients into 20 numbered slots; collapse them to a list.
function parseMealIngredients(meal: Meal): { name: string; measure: string }[] {
  return Array.from({ length: 20 }, (_, index) => {
    const position = index + 1;
    const name = meal[`strIngredient${position}`]?.trim();
    const measure = meal[`strMeasure${position}`]?.trim() ?? "";
    return name ? { name, measure } : null;
  }).filter((item): item is { name: string; measure: string } => item !== null);
}

async function mealToRecipe(meal: Meal): Promise<HomebiteRecipe> {
  const ingredients = parseMealIngredients(meal);
  const rawInstructions = meal.strInstructions?.trim() ?? "";
  let steps = rawInstructions ? await prepareMealSteps(rawInstructions, ingredients) : [];
  if (steps.length === 0) steps = ["Instructions weren't available for this one."];

  const tags = [meal.strArea, meal.strCategory].filter(Boolean).join(" ");

  return {
    dishName: meal.strMeal ?? "This dish",
    reason: tags ? `A ${tags} dish worth making tonight.` : "Worth making tonight.",
    // TheMealDB has no cook time, so leave it blank and let the effort/category
    // carry the meta line. The recipe view omits the "~time" part when empty.
    timeEstimate: "",
    effort: [meal.strArea, meal.strCategory].filter(Boolean).join(" · "),
    imageUrl: meal.strMealThumb ?? null,
    ingredientsUsed: [],
    missingIngredients: [],
    ingredients,
    steps,
  };
}

// Browseable category + area lists for the filter UI. Ingredient is left as a
// free-text field (the full ingredient list is ~600 entries).
export const getMealFilters = createServerFn({ method: "GET" }).handler(async () => {
  const [categories, areas] = await Promise.all([
    mealDbFetch<{ meals: { strCategory: string }[] | null }>("list.php?c=list"),
    mealDbFetch<{ meals: { strArea: string }[] | null }>("list.php?a=list"),
  ]);

  return {
    categories: (categories?.meals ?? [])
      .map((m) => m.strCategory)
      .filter(Boolean)
      .sort(),
    areas: (areas?.meals ?? [])
      .map((m) => m.strArea)
      .filter(Boolean)
      .sort(),
  };
});

const BrowseSchema = z.object({
  search: z.string().trim().max(80).optional(),
  ingredient: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  area: z.string().trim().max(80).optional(),
});

// TheMealDB's filter.php only supports ONE filter at a time, so we apply the
// most specific condition the user set, in priority order. Returns lightweight
// summary cards.
export const browseMeals = createServerFn({ method: "POST" })
  .validator((input: unknown) => BrowseSchema.parse(input))
  .handler(async ({ data }) => {
    let result: { meals: Meal[] | null } | null = null;

    if (data.search) {
      result = await mealDbFetch(`search.php?s=${encodeURIComponent(data.search)}`);
    } else if (data.ingredient) {
      const ingredient = data.ingredient.replace(/\s+/g, "_");
      result = await mealDbFetch(`filter.php?i=${encodeURIComponent(ingredient)}`);
    } else if (data.category) {
      result = await mealDbFetch(`filter.php?c=${encodeURIComponent(data.category)}`);
    } else if (data.area) {
      result = await mealDbFetch(`filter.php?a=${encodeURIComponent(data.area)}`);
    } else {
      // No filter chosen — show a varied starter set of random meals.
      const randoms = await Promise.all(
        Array.from({ length: 8 }, () => mealDbFetch<{ meals: Meal[] | null }>("random.php")),
      );
      const meals = randoms.flatMap((r) => r?.meals ?? []);
      // Dedupe in case random.php repeats a meal.
      const unique = Array.from(new Map(meals.map((m) => [m.idMeal, m])).values());
      return { meals: toSummaries(unique) };
    }

    return { meals: toSummaries(result?.meals ?? null) };
  });

const MealIdSchema = z.object({ id: z.string().trim().min(1).max(40) });

// Hydrate a chosen summary card into a full recipe via lookup.php.
export const getMeal = createServerFn({ method: "POST" })
  .validator((input: unknown) => MealIdSchema.parse(input))
  .handler(async ({ data }) => {
    const result = await mealDbFetch<{ meals: Meal[] | null }>(
      `lookup.php?i=${encodeURIComponent(data.id)}`,
    );
    const meal = result?.meals?.[0];
    if (!meal) return { ok: false as const, error: "Couldn't load that recipe. Try another." };
    return { ok: true as const, recipe: await mealToRecipe(meal) };
  });

// One random meal — powers "Surprise me".
export const randomMeal = createServerFn({ method: "GET" }).handler(async () => {
  const result = await mealDbFetch<{ meals: Meal[] | null }>("random.php");
  const meal = result?.meals?.[0];
  if (!meal) return { ok: false as const, error: "Couldn't find a random dish. Try again." };
  return { ok: true as const, recipe: await mealToRecipe(meal) };
});
