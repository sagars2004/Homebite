import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { AppShell } from "@/components/homebite/app-shell";
import { Button } from "@/components/ui/button";

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
  return (
    <AppShell backTo="/" compact>
      <section className="flex min-h-[65vh] flex-col items-center justify-center text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Bookmark className="size-7" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold">Save the good ones.</h1>
        <p className="mt-3 max-w-sm leading-7 text-muted-foreground">
          Google sign-in and saved recipes are coming in the next build. For now, make something
          tonight.
        </p>
        <Button asChild className="mt-7 h-12 rounded-xl px-7">
          <Link to="/ingredients">Start cooking</Link>
        </Button>
      </section>
    </AppShell>
  );
}
