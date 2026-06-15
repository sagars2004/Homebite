import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Shuffle } from "lucide-react";
import { AppShell } from "@/components/homebite/app-shell";
import { DishImage } from "@/components/homebite/dish-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cookingSession } from "@/lib/cooking-session";
import {
  browseMeals,
  getMeal,
  getMealFilters,
  randomMeal,
  type MealSummary,
} from "@/lib/meals.functions";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Recipes of the Week — Homebite" },
      {
        name: "description",
        content: "This week's real recipes — search by name, or filter by ingredient, category, or cuisine.",
      },
      { property: "og:title", content: "Recipes of the Week — Homebite" },
      {
        property: "og:description",
        content: "This week's real recipes — search by name, or filter by ingredient, category, or cuisine.",
      },
    ],
  }),
  component: BrowsePage,
});

type BrowseParams = {
  search?: string;
  ingredient?: string;
  category?: string;
  area?: string;
};

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function BrowsePage() {
  const navigate = useNavigate();
  const runBrowse = useServerFn(browseMeals);
  const loadFilters = useServerFn(getMealFilters);
  const hydrateMeal = useServerFn(getMeal);
  const surprise = useServerFn(randomMeal);

  const [categories, setCategories] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [ingredient, setIngredient] = useState("");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");

  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const requestId = useRef(0);

  const run = (params: BrowseParams) => {
    const current = ++requestId.current;
    setLoading(true);
    setError("");
    runBrowse({ data: params })
      .then((result) => {
        if (current !== requestId.current) return;
        setMeals(result.meals);
      })
      .catch(() => {
        if (current !== requestId.current) return;
        setError("Couldn't load recipes just now. Try again.");
        setMeals([]);
      })
      .finally(() => {
        if (current === requestId.current) setLoading(false);
      });
  };

  useEffect(() => {
    loadFilters()
      .then((result) => {
        setCategories(result.categories);
        setAreas(result.areas);
      })
      .catch(() => {});
    run({});
    // Run once on mount; server fns are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetFilters = () => {
    setSearch("");
    setIngredient("");
    setCategory("");
    setArea("");
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const value = search.trim();
    resetFilters();
    setSearch(value);
    run(value ? { search: value } : {});
  };

  const submitIngredient = (event: React.FormEvent) => {
    event.preventDefault();
    const value = ingredient.trim();
    resetFilters();
    setIngredient(value);
    run(value ? { ingredient: value } : {});
  };

  const onCategory = (value: string) => {
    resetFilters();
    setCategory(value);
    run(value ? { category: value } : {});
  };

  const onArea = (value: string) => {
    resetFilters();
    setArea(value);
    run(value ? { area: value } : {});
  };

  const openMeal = (summary: MealSummary) => {
    setOpeningId(summary.id);
    setError("");
    pendo.track("browse_recipe_opened", { mealId: summary.id, mealName: summary.name });
    hydrateMeal({ data: { id: summary.id } })
      .then((result) => {
        if (!result.ok) {
          setError(result.error);
          setOpeningId(null);
          return;
        }
        cookingSession.setRecipe(result.recipe);
        navigate({ to: "/recipe" });
      })
      .catch(() => {
        setError("Couldn't open that recipe. Try another.");
        setOpeningId(null);
      });
  };

  const onSurprise = () => {
    setError("");
    pendo.track("browse_surprise_me", {});
    surprise()
      .then((result) => {
        if (!result.ok) {
          setError(result.error);
          return;
        }
        cookingSession.setRecipe(result.recipe);
        navigate({ to: "/recipe" });
      })
      .catch(() => setError("Couldn't find a random dish. Try again."));
  };

  return (
    <AppShell backTo="/">
      <section className="pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          This week
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Recipes of the Week</h1>
          <Button variant="outline" onClick={onSurprise} className="rounded-xl">
            <Shuffle className="size-4" />
            Surprise me
          </Button>
        </div>
        <p className="mt-3 leading-7 text-muted-foreground">
          Real recipes from TheMealDB — search by name, or filter by ingredient, category, or
          cuisine to find this week&apos;s picks.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <form onSubmit={submitSearch} className="flex gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name (e.g. Arrabiata)"
              aria-label="Search recipes by name"
            />
            <Button type="submit" size="icon" variant="secondary" aria-label="Search">
              <Search className="size-4" />
            </Button>
          </form>

          <form onSubmit={submitIngredient} className="flex gap-2">
            <Input
              value={ingredient}
              onChange={(event) => setIngredient(event.target.value)}
              placeholder="Main ingredient (e.g. chicken breast)"
              aria-label="Filter by main ingredient"
            />
            <Button type="submit" size="icon" variant="secondary" aria-label="Filter by ingredient">
              <Search className="size-4" />
            </Button>
          </form>

          <select
            className={selectClass}
            value={category}
            onChange={(event) => onCategory(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={area}
            onChange={(event) => onArea(event.target.value)}
            aria-label="Filter by cuisine"
          >
            <option value="">All cuisines</option>
            {areas.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p role="alert" className="mt-6 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-8">
          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : meals.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              No recipes matched. Try a different filter.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {meals.map((meal) => (
                <li key={meal.id}>
                  <button
                    type="button"
                    onClick={() => openMeal(meal)}
                    disabled={openingId !== null}
                    className="group block w-full overflow-hidden rounded-2xl border border-border bg-card text-left transition-colors hover:border-primary disabled:opacity-60"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-muted">
                      <DishImage
                        src={meal.thumb}
                        alt={meal.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        width={300}
                        height={300}
                      />
                      {openingId === meal.id ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                          <Loader2 className="size-5 animate-spin" />
                        </div>
                      ) : null}
                    </div>
                    <div className="p-3">
                      <h2 className="line-clamp-2 text-sm font-semibold leading-snug">
                        {meal.name}
                      </h2>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AppShell>
  );
}
