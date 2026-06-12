import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChefHat } from "lucide-react";
import { AppShell } from "@/components/homebite/app-shell";
import { Button } from "@/components/ui/button";
import { cookingSession } from "@/lib/cooking-session";
import { makeRecipe } from "@/lib/recipe.functions";

export const Route = createFileRoute("/loading")({
  head: () => ({ meta: [
    { title: "Finding dinner — Homebite" },
    { name: "description", content: "Homebite is deciding what belongs on your table tonight." },
    { property: "og:title", content: "Finding dinner — Homebite" },
    { property: "og:description", content: "One good dinner answer is on the way." },
  ] }),
  component: LoadingPage,
});

const lines = ["Checking what actually goes together...", "Not going to give you five options...", "Finding something good for tonight...", "Almost there..."];

function LoadingPage() {
  const navigate = useNavigate({ from: "/loading" });
  const generate = useServerFn(makeRecipe);
  const [line, setLine] = useState(0);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setLine((current) => (current + 1) % lines.length), 1500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const input = cookingSession.getInput();
    if (!input) {
      navigate({ to: "/ingredients", replace: true });
      return;
    }
    let active = true;
    setError("");
    generate({ data: input })
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setError(result.error);
          return;
        }
        cookingSession.setRecipe(result.recipe);
        navigate({ to: "/recipe", replace: true });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Couldn't put a recipe together. Try again.");
      });
    return () => { active = false; };
  }, [attempt, generate, navigate]);

  return (
    <AppShell compact>
      <section className="flex min-h-[72vh] flex-col items-center justify-center text-center">
        <div className="relative flex size-24 items-center justify-center rounded-full bg-secondary text-secondary-foreground before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-secondary before:opacity-60"><ChefHat className="relative size-10" /></div>
        <h1 className="mt-8 font-display text-3xl font-semibold">I’m on it.</h1>
        <p className="mt-3 min-h-7 text-muted-foreground" aria-live="polite">{lines[line]}</p>
        {error ? <div className="mt-8 max-w-sm"><p role="alert" className="text-sm leading-6 text-destructive">{error}</p><Button onClick={() => setAttempt((value) => value + 1)} className="mt-5">Try again</Button></div> : null}
      </section>
    </AppShell>
  );
}