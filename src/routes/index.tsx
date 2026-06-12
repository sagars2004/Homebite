import { createFileRoute } from "@tanstack/react-router";
import { Camera, ChevronRight, IceCreamBowl, Pencil } from "lucide-react";
import { AppShell } from "@/components/homebite/app-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Homebite — Tell me what to make tonight" },
      { name: "description", content: "Turn the ingredients you have into one confident dinner plan." },
      { property: "og:title", content: "Homebite" },
      { property: "og:description", content: "Tell me what to make tonight." },
    ],
  }),
  component: Index,
});

function Index() {
  const choices = [
    { icon: Camera, label: "Snap your receipt", note: "Coming next" },
    { icon: Pencil, label: "Type what you have", to: "/ingredients" as const },
    { icon: IceCreamBowl, label: "Photo my fridge", note: "Beta · coming next" },
  ];
  return (
    <AppShell compact>
      <section className="flex min-h-[calc(100vh-8rem)] flex-col justify-center py-10">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Dinner, decided</p>
        <h1 className="max-w-lg font-display text-5xl font-semibold leading-[1.03] tracking-tight sm:text-7xl">Tell me what to make tonight.</h1>
        <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">Give me what’s in the kitchen. I’ll give you one good answer and talk you through it.</p>
        <div className="mt-10 space-y-3">
          {choices.map(({ icon: Icon, label, note, to }) => (
            <Button key={label} asChild={Boolean(to)} variant={to ? "default" : "outline"} disabled={!to} className="h-16 w-full justify-start rounded-xl px-5 text-base shadow-none disabled:opacity-55">
              {to ? <a href={to}><Icon className="mr-2 size-5" />{label}<ChevronRight className="ml-auto size-5" /></a> : <span><Icon className="mr-2 size-5" />{label}<small className="ml-auto text-xs font-normal opacity-70">{note}</small></span>}
            </Button>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
