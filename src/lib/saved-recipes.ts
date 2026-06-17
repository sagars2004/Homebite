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
/** Same-tab handoff when navigating recipe → saved (cleared after read). */
export const JUST_SAVED_KEY = "homebite:just-saved";

const CHANGE_EVENT = "homebite:saved-changed";

let snapshotCache: SavedRecipe[] = [];
let snapshotRaw: string | null = null;

export function recipeId(dishName: string): string {
  const slug = dishName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "recipe";
}

function assertClient() {
  if (typeof window === "undefined") {
    throw new Error("Saved recipes are only available in the browser.");
  }
}

function toPlainRecipe(recipe: HomebiteRecipe): HomebiteRecipe {
  return JSON.parse(JSON.stringify(recipe)) as HomebiteRecipe;
}

function parseStored(raw: string): SavedRecipe[] {
  try {
    const parsed = JSON.parse(raw) as SavedRecipe[];
    if (!Array.isArray(parsed)) return [];
    return [...parsed].sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

function invalidateSnapshot() {
  snapshotRaw = null;
}

function readSnapshot(): SavedRecipe[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(SAVED_KEY) ?? "[]";
  if (raw === snapshotRaw) return snapshotCache;

  snapshotRaw = raw;
  snapshotCache = parseStored(raw);
  return snapshotCache;
}

function writeAll(recipes: SavedRecipe[]) {
  assertClient();

  const raw = JSON.stringify(recipes);
  window.localStorage.setItem(SAVED_KEY, raw);
  snapshotRaw = raw;
  snapshotCache = [...recipes].sort((a, b) => b.savedAt - a.savedAt);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Consume a recipe passed from the save button on the previous screen. */
export function consumeJustSavedHandoff(): SavedRecipe | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(JUST_SAVED_KEY);
  if (!raw) return null;

  window.sessionStorage.removeItem(JUST_SAVED_KEY);
  try {
    return JSON.parse(raw) as SavedRecipe;
  } catch {
    return null;
  }
}

export const savedRecipes = {
  getAll: (): SavedRecipe[] => readSnapshot(),

  refresh: (): SavedRecipe[] => {
    invalidateSnapshot();
    return readSnapshot();
  },

  isSaved: (dishName: string): boolean => {
    const id = recipeId(dishName);
    return readSnapshot().some((item) => item.id === id);
  },

  save: (recipe: HomebiteRecipe): SavedRecipe => {
    const plain = toPlainRecipe(recipe);
    const id = recipeId(plain.dishName);
    const existing = readSnapshot();
    const saved: SavedRecipe = { ...plain, id, savedAt: Date.now() };
    const next = [saved, ...existing.filter((item) => item.id !== id)];
    writeAll(next);

    if (!readSnapshot().some((item) => item.id === id)) {
      throw new Error("Recipe did not persist to storage.");
    }

    return saved;
  },

  remove: (id: string) => {
    writeAll(readSnapshot().filter((item) => item.id !== id));
  },

  /** Toggle a recipe's saved state. Returns true if it is now saved. */
  toggle: (recipe: HomebiteRecipe): boolean => {
    const id = recipeId(recipe.dishName);
    if (readSnapshot().some((item) => item.id === id)) {
      savedRecipes.remove(id);
      return false;
    }
    savedRecipes.save(recipe);
    return true;
  },

  /** Persist and stage for the saved page on the next navigation. */
  saveAndStage: (recipe: HomebiteRecipe): SavedRecipe => {
    assertClient();
    const saved = savedRecipes.save(recipe);
    window.sessionStorage.setItem(JUST_SAVED_KEY, JSON.stringify(saved));
    return saved;
  },

  subscribe: (listener: () => void): (() => void) => {
    if (typeof window === "undefined") return () => {};
    const handler = () => listener();
    window.addEventListener(CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  },
};
