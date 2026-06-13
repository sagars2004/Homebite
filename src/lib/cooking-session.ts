export type CookingPreferences = {
  ingredients: string[];
  /** Minutes the cook is willing to spend, from a slider. 120 means "120+ / I have time". */
  timeMinutes: number;
  /** Optional free-text note about tonight (e.g. "minimal cleanup, I'm wiped"). */
  timeNote?: string;
  /** What they're feeling — moods, cuisines, and styles. Can be several at once. */
  vibes: string[];
};

export const DEFAULT_PREFERENCES: Pick<CookingPreferences, "timeMinutes" | "vibes"> = {
  timeMinutes: 40,
  vibes: ["Comfort food"],
};

export type RecipeIngredient = { name: string; measure: string };

export type HomebiteRecipe = {
  dishName: string;
  reason: string;
  timeEstimate: string;
  effort: string;
  imageUrl: string | null;
  ingredientsUsed: string[];
  missingIngredients: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
};

const INPUT_KEY = "homebite:input";
const RECIPE_KEY = "homebite:recipe";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export const cookingSession = {
  getInput: () => read<CookingPreferences>(INPUT_KEY),
  setInput: (input: CookingPreferences) =>
    window.sessionStorage.setItem(INPUT_KEY, JSON.stringify(input)),
  getRecipe: () => read<HomebiteRecipe>(RECIPE_KEY),
  setRecipe: (recipe: HomebiteRecipe) =>
    window.sessionStorage.setItem(RECIPE_KEY, JSON.stringify(recipe)),
  clearRecipe: () => window.sessionStorage.removeItem(RECIPE_KEY),
};
