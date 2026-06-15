import { useEffect, useState } from "react";
import { savedRecipes, type SavedRecipe } from "@/lib/saved-recipes";

// Reactive view of the saved-recipes list. Re-reads on mount (avoids SSR/client
// hydration mismatch by starting empty) and on any change, including other tabs.
export function useSavedRecipes(): SavedRecipe[] {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);

  useEffect(() => {
    const sync = () => setRecipes(savedRecipes.getAll());
    sync();
    return savedRecipes.subscribe(sync);
  }, []);

  return recipes;
}

// Whether a given dish is currently saved, kept in sync with the store.
export function useIsSaved(dishName: string | undefined): boolean {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!dishName) {
      setSaved(false);
      return;
    }
    const sync = () => setSaved(savedRecipes.isSaved(dishName));
    sync();
    return savedRecipes.subscribe(sync);
  }, [dishName]);

  return saved;
}
