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

/** Catalog entry with tags for client-side filtering (stable weekly set). */
export type WeeklyMealSummary = MealSummary & {
  categories: string[];
  areas: string[];
};

function summaryFromMeal(meal: Meal): MealSummary | null {
  const id = meal.idMeal?.trim();
  const name = meal.strMeal?.trim();
  if (!id || !name) return null;
  const thumb = meal.strMealThumb?.trim();
  return { id, name, thumb: thumb ? `${thumb}/small` : null };
}

function toSummaries(meals: Meal[] | null): MealSummary[] {
  if (!meals) return [];
  return meals
    .map((meal) => summaryFromMeal(meal))
    .filter((item): item is MealSummary => item !== null);
}

// Fixed MealDB filters — deterministic, same recipes every time until the DB changes.
const WEEKLY_CATEGORIES = [
  "Chicken",
  "Beef",
  "Seafood",
  "Pasta",
  "Vegetarian",
  "Dessert",
  "Breakfast",
  "Side",
  "Lamb",
  "Pork",
] as const;

const WEEKLY_AREAS = [
  "American",
  "British",
  "Chinese",
  "French",
  "Indian",
  "Italian",
  "Japanese",
  "Mexican",
  "Thai",
  "Spanish",
] as const;

function mergeWeeklyEntry(
  map: Map<string, WeeklyMealSummary>,
  meal: Meal,
  tag: { category?: string; area?: string },
) {
  const base = summaryFromMeal(meal);
  if (!base) return;

  const existing = map.get(base.id) ?? {
    ...base,
    categories: [],
    areas: [],
  };

  if (tag.category && !existing.categories.includes(tag.category)) {
    existing.categories.push(tag.category);
  }
  if (tag.area && !existing.areas.includes(tag.area)) {
    existing.areas.push(tag.area);
  }

  map.set(base.id, existing);
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

// Load a fixed catalog from MealDB category + area filters. The set is stable
// across page loads; the browse UI filters and paginates client-side.
export const getWeeklyCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const [categoryResults, areaResults] = await Promise.all([
    Promise.all(
      WEEKLY_CATEGORIES.map((category) =>
        mealDbFetch<{ meals: Meal[] | null }>(`filter.php?c=${encodeURIComponent(category)}`).then(
          (result) => ({ category, meals: result?.meals ?? [] }),
        ),
      ),
    ),
    Promise.all(
      WEEKLY_AREAS.map((area) =>
        mealDbFetch<{ meals: Meal[] | null }>(`filter.php?a=${encodeURIComponent(area)}`).then(
          (result) => ({ area, meals: result?.meals ?? [] }),
        ),
      ),
    ),
  ]);

  const map = new Map<string, WeeklyMealSummary>();

  for (const { category, meals } of categoryResults) {
    for (const meal of meals) mergeWeeklyEntry(map, meal, { category });
  }
  for (const { area, meals } of areaResults) {
    for (const meal of meals) mergeWeeklyEntry(map, meal, { area });
  }

  const meals = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));

  return { meals, weekLabel: weekLabel() };
});

function weekLabel(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86_400_000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

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
