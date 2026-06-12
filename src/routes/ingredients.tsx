import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/homebite/app-shell";
import { IngredientChip } from "@/components/homebite/ingredient-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cookingSession, type CookingPreferences } from "@/lib/cooking-session";

export const Route = createFileRoute("/ingredients")({
  head: () => ({
    meta: [
      { title: "What do you have? — Homebite" },
      {
        name: "description",
        content: "Add your ingredients and tell Homebite what kind of night this is.",
      },
      { property: "og:title", content: "What do you have? — Homebite" },
      { property: "og:description", content: "Add your ingredients and get one dinner plan." },
    ],
  }),
  component: IngredientsPage,
});

const times: CookingPreferences["time"][] = ["Quick (20 min)", "Normal (40 min)", "I have time"];
const vibes: CookingPreferences["vibe"][] = [
  "Comfort food",
  "Something new",
  "Keep it light",
  "Impress someone",
];

function IngredientsPage() {
  const navigate = useNavigate({ from: "/ingredients" });
  const [ingredients, setIngredients] = useState<string[]>(
    () => cookingSession.getInput()?.ingredients ?? [],
  );
  const [draft, setDraft] = useState("");
  const [time, setTime] = useState<CookingPreferences["time"]>(
    () => cookingSession.getInput()?.time ?? "Normal (40 min)",
  );
  const [vibe, setVibe] = useState<CookingPreferences["vibe"]>(
    () => cookingSession.getInput()?.vibe ?? "Comfort food",
  );
  const [error, setError] = useState("");

  const addIngredient = (event: FormEvent) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name || ingredients.some((item) => item.toLowerCase() === name.toLowerCase())) return;
    setIngredients((current) => [...current, name]);
    setDraft("");
    setError("");
  };

  const submit = () => {
    if (ingredients.length === 0) {
      setError("Add at least one ingredient so I have somewhere to start.");
      return;
    }
    cookingSession.setInput({ ingredients, time, vibe });
    cookingSession.clearRecipe();
    pendo.track("ingredients_submitted", {
      ingredientCount: ingredients.length,
      ingredients: ingredients.join(", "),
      time,
      vibe,
    });
    navigate({ to: "/loading" });
  };

  return (
    <AppShell backTo="/" compact>
      <section className="pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          First, the kitchen
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">What do you have?</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          A rough list is fine. No quantities needed.
        </p>

        <form onSubmit={addIngredient} className="mt-8 flex gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Chicken, tomatoes, rice…"
            aria-label="Add an ingredient"
            className="h-12 rounded-xl bg-card px-4"
          />
          <Button
            type="submit"
            size="icon"
            className="size-12 shrink-0 rounded-xl"
            aria-label="Add ingredient"
          >
            <Plus />
          </Button>
        </form>
        <div className="mt-4 flex min-h-14 flex-wrap gap-2">
          {ingredients.map((ingredient) => (
            <IngredientChip
              key={ingredient}
              name={ingredient}
              onRemove={() =>
                setIngredients((items) => items.filter((item) => item !== ingredient))
              }
            />
          ))}
          {ingredients.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              Your ingredients will show up here.
            </p>
          ) : null}
        </div>

        <Selector title="How much time?" options={times} value={time} onChange={setTime} />
        <Selector title="What are you feeling?" options={vibes} value={vibe} onChange={setVibe} />
        {error ? (
          <p role="alert" className="mt-6 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <Button onClick={submit} size="lg" className="mt-7 h-14 w-full rounded-xl text-base">
          Tell me what to make
        </Button>
      </section>
    </AppShell>
  );
}

function Selector<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="mt-9">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant={value === option ? "secondary" : "outline"}
            onClick={() => onChange(option)}
            aria-pressed={value === option}
            className={
              value === option
                ? "border-accent bg-accent text-accent-foreground hover:bg-accent/90"
                : "bg-card shadow-none"
            }
          >
            {option}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
