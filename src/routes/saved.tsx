import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, Clock3, Loader2, Trash2 } from "lucide-react";
import { AppShell } from "@/components/homebite/app-shell";
import { DishImage } from "@/components/homebite/dish-image";
import { Button } from "@/components/ui/button";
import { cookingSession } from "@/lib/cooking-session";
import { savedRecipes, type SavedRecipe } from "@/lib/saved-recipes";
import { useSavedRecipes } from "@/hooks/use-saved-recipes";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved recipes — Homebite" },
      { name: "description", content: "Keep the Homebite dinners you want to make again." },
      { property: "og:title", content: "Saved recipes — Homebite" },
      { property: "og:description", content: "Your Homebite recipe collection." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const recipes = useSavedRecipes();

  if (recipes === null) {
    return (
      <AppShell backTo="/" compact>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (recipes.length === 0) return <EmptyState />;

  return (
    <AppShell backTo="/" compact>
      <section className="pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Your collection
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Saved recipes</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Saved on this device. {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}.
        </p>

        <ul className="mt-8 grid gap-5 sm:grid-cols-2">
          {recipes.map((recipe) => (
            <SavedCard key={recipe.id} recipe={recipe} />
          ))}
        </ul>
      </section>
    </AppShell>
  );
}

function SavedCard({ recipe }: { recipe: SavedRecipe }) {
  const navigate = useNavigate();

  const open = () => {
    cookingSession.setRecipe(recipe);
    navigate({ to: "/recipe" });
  };

  const metaLine = [recipe.timeEstimate ? `~${recipe.timeEstimate}` : null, recipe.effort]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="group overflow-hidden rounded-2xl border border-border bg-card">
      <button type="button" onClick={open} className="block w-full text-left">
        <div className="h-44 w-full overflow-hidden bg-muted">
          <DishImage
            src={recipe.imageUrl}
            alt={recipe.dishName}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            width={600}
            height={400}
          />
        </div>
        <div className="p-5">
          <h2 className="font-display text-xl font-semibold leading-tight">{recipe.dishName}</h2>
          {metaLine ? (
            <div className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 className="size-4" />
              {metaLine}
            </div>
          ) : null}
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <span className="text-sm font-medium text-primary">Make this again</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => savedRecipes.remove(recipe.id)}
          aria-label={`Remove ${recipe.dishName}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <AppShell backTo="/" compact>
      <section className="flex min-h-[65vh] flex-col items-center justify-center text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Bookmark className="size-7" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold">Save the good ones.</h1>
        <p className="mt-3 max-w-sm leading-7 text-muted-foreground">
          Tap “Save” on any recipe and it’ll show up here — kept on this device, no account needed.
        </p>
        <Button asChild className="mt-7 h-12 rounded-xl px-7">
          <Link to="/ingredients">Start cooking</Link>
        </Button>
      </section>
    </AppShell>
  );
}
