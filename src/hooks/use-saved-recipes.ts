import { useCallback, useEffect, useState } from "react";
import {
  consumeJustSavedHandoff,
  savedRecipes,
  type SavedRecipe,
} from "@/lib/saved-recipes";

function readList(): SavedRecipe[] {
  const handoff = consumeJustSavedHandoff();
  if (handoff && !savedRecipes.isSaved(handoff.dishName)) {
    try {
      savedRecipes.save(handoff);
    } catch {
      // Fall through to whatever is already in storage.
    }
  }
  return savedRecipes.refresh();
}

// null = still loading on the client; [] = loaded but empty.
export function useSavedRecipes(): SavedRecipe[] | null {
  const [recipes, setRecipes] = useState<SavedRecipe[] | null>(null);

  const sync = useCallback(() => setRecipes(readList()), []);

  useEffect(() => {
    sync();
    return savedRecipes.subscribe(sync);
  }, [sync]);

  return recipes;
}

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
