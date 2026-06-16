import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/homebite/app-shell";
import { IngredientChip } from "@/components/homebite/ingredient-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cookingSession, DEFAULT_PREFERENCES } from "@/lib/cooking-session";

export const Route = createFileRoute("/ingredients")({
  validateSearch: z.object({
    edit: z.boolean().optional().default(false),
  }),
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

const TIME_MIN = 10;
const TIME_MAX = 120;
const TIME_STEP = 5;

const vibeGroups: { label: string; options: string[] }[] = [
  {
    label: "Mood",
    options: ["Comfort food", "Something new", "Keep it light", "Impress someone"],
  },
  {
    label: "Cuisine",
    options: [
      "Italian",
      "Mexican",
      "Indian",
      "Thai",
      "Chinese",
      "Japanese",
      "Mediterranean",
      "Middle Eastern",
      "American",
    ],
  },
  {
    label: "Style",
    options: [
      "Protein heavy",
      "Vegetarian",
      "Vegan",
      "Low carb",
      "One pan",
      "Spicy",
      "Fresh & healthy",
    ],
  },
];

function formatTime(minutes: number) {
  if (minutes >= TIME_MAX) return "I have time (2 hr+)";
  if (minutes <= 20) return `${minutes} min · quick`;
  return `${minutes} min`;
}

function IngredientsPage() {
  const navigate = useNavigate({ from: "/ingredients" });
  const { edit } = Route.useSearch();
  const saved = edit ? cookingSession.getInput() : null;

  const [ingredients, setIngredients] = useState<string[]>(() => {
    const photoIngredients = cookingSession.consumePhotoDraft();
    if (photoIngredients?.length) return photoIngredients;
    if (edit) return saved?.ingredients ?? [];
    return [];
  });
  const [draft, setDraft] = useState("");
  const [timeMinutes, setTimeMinutes] = useState<number>(
    () => saved?.timeMinutes ?? DEFAULT_PREFERENCES.timeMinutes,
  );
  const [timeNote, setTimeNote] = useState(() => saved?.timeNote ?? "");
  const [vibes, setVibes] = useState<string[]>(
    () => saved?.vibes ?? DEFAULT_PREFERENCES.vibes,
  );
  const [error, setError] = useState("");

  // Fresh visits (home, reload, new session) start with a blank list. Only
  // "Edit ingredients" from a recipe should keep the saved session input.
  useEffect(() => {
    if (!edit) cookingSession.clearInput();
  }, [edit]);

  const addIngredient = (event: FormEvent) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name || ingredients.some((item) => item.toLowerCase() === name.toLowerCase())) return;
    setIngredients((current) => [...current, name]);
    setDraft("");
    setError("");
  };

  const toggleVibe = (option: string) => {
    setVibes((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  };

  const submit = () => {
    if (ingredients.length === 0) {
      setError("Add at least one ingredient so I have somewhere to start.");
      return;
    }
    const trimmedNote = timeNote.trim();
    cookingSession.setInput({
      ingredients,
      timeMinutes,
      timeNote: trimmedNote || undefined,
      vibes,
    });
    cookingSession.clearRecipe();
    pendo.track("ingredients_submitted", {
      ingredientCount: ingredients.length,
      ingredients: ingredients.join(", "),
      timeMinutes,
      vibes: vibes.join(", "),
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
            placeholder="Please type an ingredient or food item and press enter"
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

        <fieldset className="mt-9">
          <div className="flex items-baseline justify-between">
            <legend className="text-sm font-semibold">How much time?</legend>
            <span className="text-sm font-semibold text-primary">{formatTime(timeMinutes)}</span>
          </div>
          <Slider
            className="mt-4"
            min={TIME_MIN}
            max={TIME_MAX}
            step={TIME_STEP}
            value={[timeMinutes]}
            onValueChange={(values) => setTimeMinutes(values[0] ?? TIME_MIN)}
            aria-label="How much time do you have to cook?"
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Quick</span>
            <span>I have time</span>
          </div>
          <Textarea
            value={timeNote}
            onChange={(event) => setTimeNote(event.target.value)}
            placeholder="Anything else? (optional) — e.g. minimal cleanup, cooking for two, no oven tonight"
            aria-label="Optional note about tonight"
            className="mt-4 min-h-[44px] rounded-xl bg-card"
            rows={2}
          />
        </fieldset>

        <fieldset className="mt-9">
          <legend className="text-sm font-semibold">What are you feeling?</legend>
          <p className="mt-1 text-sm text-muted-foreground">Pick as many as you like.</p>
          <div className="mt-4 space-y-5">
            {vibeGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((option) => {
                    const active = vibes.includes(option);
                    return (
                      <Button
                        key={option}
                        type="button"
                        variant={active ? "secondary" : "outline"}
                        onClick={() => toggleVibe(option)}
                        aria-pressed={active}
                        className={
                          active
                            ? "border-accent bg-accent text-accent-foreground hover:bg-accent/90"
                            : "bg-card shadow-none"
                        }
                      >
                        {option}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        {error ? (
          <p role="alert" className="mt-6 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <Button onClick={submit} size="lg" className="mt-8 h-14 w-full rounded-xl text-base">
          Tell me what to make
        </Button>
      </section>
    </AppShell>
  );
}
