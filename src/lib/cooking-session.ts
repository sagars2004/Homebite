export type CookingPreferences = {
  ingredients: string[];
  time: "Quick (20 min)" | "Normal (40 min)" | "I have time";
  vibe: "Comfort food" | "Something new" | "Keep it light" | "Impress someone";
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
