import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Loader2, Search, Shuffle } from "lucide-react";
import { AppShell } from "@/components/homebite/app-shell";
import { DishImage } from "@/components/homebite/dish-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cookingSession } from "@/lib/cooking-session";
import {
  getMeal,
  getMealFilters,
  getWeeklyCatalog,
  randomMeal,
  type WeeklyMealSummary,
} from "@/lib/meals.functions";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Recipes of the Week — Homebite" },
      {
        name: "description",
        content:
          "This week's real recipes — search by name, or filter by ingredient, category, or cuisine.",
      },
      { property: "og:title", content: "Recipes of the Week — Homebite" },
      {
        property: "og:description",
        content:
          "This week's real recipes — search by name, or filter by ingredient, category, or cuisine.",
      },
    ],
  }),
  component: BrowsePage,
});

const PAGE_SIZE = 12;
const CATALOG_CACHE_KEY = "homebite:weekly-catalog";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type CatalogCache = { weekLabel: string; meals: WeeklyMealSummary[] };

function readCatalogCache(): CatalogCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CatalogCache;
  } catch {
    return null;
  }
}

function writeCatalogCache(data: CatalogCache) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(data));
}

function filterCatalog(
  catalog: WeeklyMealSummary[],
  search: string,
  ingredient: string,
  category: string,
  area: string,
): WeeklyMealSummary[] {
  const searchTerm = search.trim().toLowerCase();
  const ingredientTerm = ingredient.trim().toLowerCase();

  return catalog.filter((meal) => {
    if (searchTerm && !meal.name.toLowerCase().includes(searchTerm)) return false;
    if (ingredientTerm && !meal.name.toLowerCase().includes(ingredientTerm)) return false;
    if (category && !meal.categories.includes(category)) return false;
    if (area && !meal.areas.includes(area)) return false;
    return true;
  });
}

function BrowsePage() {
  const navigate = useNavigate();
  const loadCatalog = useServerFn(getWeeklyCatalog);
  const loadFilters = useServerFn(getMealFilters);
  const hydrateMeal = useServerFn(getMeal);
  const surprise = useServerFn(randomMeal);

  const [categories, setCategories] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [weekLabel, setWeekLabel] = useState("");
  const [catalog, setCatalog] = useState<WeeklyMealSummary[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  const [search, setSearch] = useState("");
  const [ingredient, setIngredient] = useState("");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");
  const [page, setPage] = useState(1);

  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    loadFilters()
      .then((result) => {
        setCategories(result.categories);
        setAreas(result.areas);
      })
      .catch(() => {});

    const cached = readCatalogCache();
    if (cached?.meals.length) {
      setCatalog(cached.meals);
      setWeekLabel(cached.weekLabel);
      setCatalogLoading(false);
      return;
    }

    loadCatalog()
      .then((result) => {
        setCatalog(result.meals);
        setWeekLabel(result.weekLabel);
        writeCatalogCache({ meals: result.meals, weekLabel: result.weekLabel });
      })
      .catch(() => setCatalogError("Couldn't load this week's recipes. Try again."))
      .finally(() => setCatalogLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, ingredient, category, area]);

  const filteredMeals = useMemo(
    () => filterCatalog(catalog, search, ingredient, category, area),
    [catalog, search, ingredient, category, area],
  );

  const totalPages = Math.max(1, Math.ceil(filteredMeals.length / PAGE_SIZE));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const pageMeals = filteredMeals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
  };

  const submitIngredient = (event: React.FormEvent) => {
    event.preventDefault();
  };

  const clearFilters = () => {
    setSearch("");
    setIngredient("");
    setCategory("");
    setArea("");
  };

  const hasFilters = Boolean(search.trim() || ingredient.trim() || category || area);

  const openMeal = (summary: WeeklyMealSummary) => {
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
          This week{weekLabel ? ` · ${weekLabel}` : ""}
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Recipes of the Week</h1>
          <Button variant="outline" onClick={onSurprise} className="rounded-xl">
            <Shuffle className="size-4" />
            Surprise me
          </Button>
        </div>
        <p className="mt-3 leading-7 text-muted-foreground">
          {catalog.length > 0
            ? `${catalog.length} recipes loaded for this week — filter and browse pages without reshuffling the lineup.`
            : "Real recipes from TheMealDB — search and filter this week's stable catalog."}
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
              placeholder="Keyword in name (e.g. chicken)"
              aria-label="Filter by keyword in recipe name"
            />
            <Button type="submit" size="icon" variant="secondary" aria-label="Filter by keyword">
              <Search className="size-4" />
            </Button>
          </form>

          <select
            className={selectClass}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
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
            onChange={(event) => setArea(event.target.value)}
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

        {hasFilters ? (
          <div className="mt-3">
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : null}

        {error || catalogError ? (
          <p role="alert" className="mt-6 text-sm text-destructive">
            {error || catalogError}
          </p>
        ) : null}

        <div className="mt-8">
          {catalogLoading ? (
            <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : pageMeals.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              No recipes matched. Try a different filter.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filteredMeals.length)} of {filteredMeals.length}
                {hasFilters ? " matches" : " recipes"}
              </p>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {pageMeals.map((meal) => (
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

              {totalPages > 1 ? (
                <nav
                  className="mt-8 flex items-center justify-center gap-2"
                  aria-label="Recipe pages"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-lg"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="min-w-[7rem] text-center text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-lg"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next page"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
}
