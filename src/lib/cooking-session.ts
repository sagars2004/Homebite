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
const PHOTO_DRAFT_KEY = "homebite:photo-draft";

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
  clearInput: () => window.sessionStorage.removeItem(INPUT_KEY),
  /** One-time handoff from photo upload → ingredients page (read once, then removed). */
  setPhotoDraft: (ingredients: string[]) =>
    window.sessionStorage.setItem(PHOTO_DRAFT_KEY, JSON.stringify(ingredients)),
  consumePhotoDraft: (): string[] | null => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(PHOTO_DRAFT_KEY);
    window.sessionStorage.removeItem(PHOTO_DRAFT_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  getRecipe: () => read<HomebiteRecipe>(RECIPE_KEY),
  setRecipe: (recipe: HomebiteRecipe) =>
    window.sessionStorage.setItem(RECIPE_KEY, JSON.stringify(recipe)),
  clearRecipe: () => window.sessionStorage.removeItem(RECIPE_KEY),
};
