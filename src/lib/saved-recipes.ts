import type { HomebiteRecipe } from "./cooking-session";

// Saved recipes live in localStorage (persists across sessions) rather than
// sessionStorage, since the whole point is to keep them around. There are no
// accounts, so "saved" means "saved on this device/browser".

export type SavedRecipe = HomebiteRecipe & {
  /** Stable id derived from the dish name; used for dedupe + toggling. */
  id: string;
  /** Epoch ms the recipe was saved, for newest-first ordering. */
  savedAt: number;
};

const SAVED_KEY = "homebite:saved";

// Fires whenever the saved list changes so open views (the /saved list, the
// save toggle) can re-read without prop drilling or a global store.
const CHANGE_EVENT = "homebite:saved-changed";

export function recipeId(dishName: string): string {
  const slug = dishName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "recipe";
}

function readAll(): SavedRecipe[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedRecipe[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(recipes: SavedRecipe[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_KEY, JSON.stringify(recipes));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export const savedRecipes = {
  getAll: (): SavedRecipe[] => readAll().sort((a, b) => b.savedAt - a.savedAt),

  isSaved: (dishName: string): boolean => {
    const id = recipeId(dishName);
    return readAll().some((item) => item.id === id);
  },

  save: (recipe: HomebiteRecipe): SavedRecipe => {
    const id = recipeId(recipe.dishName);
    const existing = readAll();
    const saved: SavedRecipe = { ...recipe, id, savedAt: Date.now() };
    const next = [saved, ...existing.filter((item) => item.id !== id)];
    writeAll(next);
    return saved;
  },

  remove: (id: string) => {
    writeAll(readAll().filter((item) => item.id !== id));
  },

  /** Toggle a recipe's saved state. Returns true if it is now saved. */
  toggle: (recipe: HomebiteRecipe): boolean => {
    const id = recipeId(recipe.dishName);
    if (readAll().some((item) => item.id === id)) {
      savedRecipes.remove(id);
      return false;
    }
    savedRecipes.save(recipe);
    return true;
  },

  /** Subscribe to saved-list changes. Returns an unsubscribe function. */
  subscribe: (listener: () => void): (() => void) => {
    if (typeof window === "undefined") return () => {};
    const handler = () => listener();
    window.addEventListener(CHANGE_EVENT, handler);
    // Also react to changes from other tabs.
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  },
};
