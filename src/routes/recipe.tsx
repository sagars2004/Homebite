import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Clock3, RotateCcw, ShoppingBasket } from "lucide-react";
import { AppShell } from "@/components/homebite/app-shell";
import { Button } from "@/components/ui/button";
import { cookingSession, type HomebiteRecipe } from "@/lib/cooking-session";
import fallbackImage from "@/assets/homebite-fallback.jpg";

export const Route = createFileRoute("/recipe")({
  head: () => ({ meta: [
    { title: "Tonight's recipe — Homebite" },
    { name: "description", content: "Your one confident dinner plan, with ingredients and conversational steps." },
    { property: "og:title", content: "Tonight's recipe — Homebite" },
    { property: "og:description", content: "One confident dinner plan for tonight." },
  ] }),
  component: RecipePage,
});

function RecipePage() {
  const navigate = useNavigate({ from: "/recipe" });
  const [recipe, setRecipe] = useState<HomebiteRecipe | null>(null);

  useEffect(() => {
    const stored = cookingSession.getRecipe();
    if (!stored) navigate({ to: "/ingredients", replace: true });
    else setRecipe(stored);
  }, [navigate]);

  if (!recipe) return null;
  const reroll = () => { cookingSession.clearRecipe(); navigate({ to: "/loading" }); };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative h-[40vh] min-h-80 w-full overflow-hidden bg-muted">
        <img src={recipe.imageUrl ?? fallbackImage} alt={recipe.dishName} className="h-full w-full object-cover" width={1200} height={800} />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-foreground/45 to-transparent" />
        <div className="absolute left-4 top-4"><Button variant="secondary" className="rounded-full bg-background/90 shadow-sm" onClick={() => navigate({ to: "/ingredients" })}>Edit ingredients</Button></div>
      </div>
      <AppShell compact>
        <article className="-mt-3 pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Make this tonight</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">{recipe.dishName}</h1>
          <p className="mt-4 text-lg italic leading-8 text-muted-foreground">“{recipe.reason}”</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"><Clock3 className="size-4" />~{recipe.timeEstimate} · {recipe.effort}</div>

          <IngredientList icon={Check} title="What you have" items={recipe.ingredientsUsed} />
          <IngredientList icon={ShoppingBasket} title="You’ll also need" items={recipe.missingIngredients} />

          <section className="mt-12 border-t border-border pt-9">
            <h2 className="font-display text-3xl font-semibold">Let’s cook.</h2>
            <ol className="mt-7 space-y-8">
              {recipe.steps.map((step, index) => <li key={`${index}-${step.slice(0, 16)}`} className="grid grid-cols-[2rem_1fr] gap-3"><span className="font-display text-xl font-semibold text-primary">{index + 1}</span><p className="text-lg leading-[1.7]">{step}</p></li>)}
            </ol>
          </section>
          <div className="mt-12 border-t border-border pt-7"><Button onClick={reroll} variant="outline" className="h-13 w-full rounded-xl bg-card text-base"><RotateCcw />Make something else</Button></div>
        </article>
      </AppShell>
    </div>
  );
}

function IngredientList({ icon: Icon, title, items }: { icon: typeof Check; title: string; items: string[] }) {
  return <section className="mt-10"><h2 className="flex items-center gap-2 text-lg font-semibold"><Icon className="size-5 text-accent" />{title}</h2><ul className="mt-4 divide-y divide-border border-y border-border">{items.length ? items.map((item) => <li key={item} className="flex min-h-12 items-center py-3 text-base">{item}</li>) : <li className="py-3 text-muted-foreground">Nothing else.</li>}</ul></section>;
}