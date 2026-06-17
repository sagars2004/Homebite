import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  ArrowRight,
  BookOpen,
  ChevronRight,
  GitBranch,
  Lightbulb,
  Loader2,
  Map,
  Radar,
  Sparkles,
  TrendingDown,
  User,
} from "lucide-react";
import { AppShell } from "@/components/homebite/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getProductPulse,
  type NovusFunnel,
  type ProductPulseData,
} from "@/lib/novus.functions";

export const Route = createFileRoute("/pulse")({
  head: () => ({
    meta: [
      { title: "Product Pulse — Homebite × Novus" },
      {
        name: "description",
        content: "Novus product memory and early session analytics for Homebite.",
      },
      { property: "og:title", content: "Product Pulse — Homebite × Novus" },
      {
        property: "og:description",
        content: "See what Novus mapped in your codebase — pages, flows, and early funnel data.",
      },
    ],
  }),
  component: PulsePage,
});

function PulsePage() {
  const loadPulse = useServerFn(getProductPulse);
  const [data, setData] = useState<ProductPulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPulse()
      .then(setData)
      .catch(() => setError("Couldn't load product pulse right now."))
      .finally(() => setLoading(false));
  }, [loadPulse]);

  if (loading) {
    return (
      <AppShell backTo="/">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell backTo="/">
        <div className="pt-16 text-center">
          <p className="text-muted-foreground">{error || "Something went wrong."}</p>
          <Button asChild className="mt-6 rounded-lg">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const coreFunnel = data.funnels[0];
  const syncedLabel = new Date(data.syncedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <AppShell backTo="/">
      <section className="pt-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="gap-1.5 rounded-full px-3 py-1">
            <Activity className="size-3.5" />
            Product Pulse
          </Badge>
          <Badge variant="outline" className="rounded-full">
            Powered by Novus
          </Badge>
          <Badge variant="outline" className="rounded-full text-muted-foreground">
            Synced {syncedLabel}
          </Badge>
        </div>

        <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {data.statusMessage}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
          Novus scanned the Homebite codebase and mapped your product structure. Usage signals are
          still light — this view mirrors what you&apos;ll see in the Novus dashboard.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Pages mapped"
            value={String(data.mappingStats.pages)}
            hint="From codebase scan"
          />
          <MetricCard
            label="Events cataloged"
            value={String(data.mappingStats.events)}
            hint="Features + track events"
            accent
          />
          <MetricCard
            label="Funnels & journeys"
            value={String(data.mappingStats.funnelsAndJourneys)}
            hint="Defined in Novus Memory"
          />
        </div>
      </section>

      <section className="mt-16">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Understand — Memory
          </p>
          <Badge variant="secondary" className="text-[10px] uppercase">Live</Badge>
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
          Your product context, mapped by Novus
        </h2>

        <Card className="mt-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="size-4 text-primary" />
              <CardTitle className="font-display text-lg">1 Persona</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{data.memory.persona.name}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {data.memory.persona.description}
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Map className="size-4 text-primary" />
                <CardTitle className="font-display text-lg">
                  {data.memory.productAreas.length} Product areas
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.memory.productAreas.map((area) => (
                  <li key={area.name} className="text-sm">
                    <span className="font-medium">{area.name}</span>
                    <p className="mt-0.5 leading-6 text-muted-foreground">{area.description}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-primary" />
                <CardTitle className="font-display text-lg">
                  {data.memory.keyFlows.length} Key flows
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.memory.keyFlows.map((flow) => (
                  <li key={flow.name} className="text-sm">
                    <span className="font-medium">{flow.name}</span>
                    <p className="mt-0.5 leading-6 text-muted-foreground">{flow.description}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {data.signals.length > 0 ? (
        <section className="mt-16">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-5 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Detect — Signals
            </p>
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
            Early product signals
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Richer usage signals appear as more sessions flow through after your install PR merges.
          </p>
          <ul className="mt-6 space-y-4">
            {data.signals.map((signal) => (
              <li key={signal.id} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={signal.priority === "high" ? "destructive" : "secondary"}
                    className="text-[10px] uppercase tracking-wider"
                  >
                    {signal.priority}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    {signal.category}
                  </Badge>
                  <span className="text-sm font-medium text-primary">
                    {signal.keyMetric.label}: {signal.keyMetric.value}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold leading-snug">
                  {signal.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{signal.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Early session data
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
              {coreFunnel.name}
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">{coreFunnel.description}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Sessions started on Home"
            value={String(coreFunnel.totalSessions)}
            hint="Last 30 days · early data"
          />
          <MetricCard
            label="Reached recipe view"
            value={`${data.headline.coreConversionPercent}%`}
            hint="Core flow completion"
            accent
          />
          <MetricCard
            label="Biggest drop-off"
            value={
              data.headline.biggestDropOffRate
                ? `${data.headline.biggestDropOffRate}%`
                : "—"
            }
            hint={data.headline.biggestDropOffStep ?? "—"}
            icon={TrendingDown}
          />
        </div>

        <FunnelChart funnel={coreFunnel} className="mt-8" />

        <details className="mt-8 group">
          <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
            {data.funnels.length - 1} more funnels in Novus
          </summary>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {data.funnels.slice(1).map((funnel) => (
              <Card key={funnel.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-lg">{funnel.name}</CardTitle>
                  <CardDescription>{funnel.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {funnel.totalSessions} sessions started ·{" "}
                    {Math.round(funnel.overallConversionRate * 100)}% completion
                  </p>
                  <FunnelChart funnel={funnel} compact />
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      </section>

      <section className="mt-16">
        <div className="flex items-center gap-2">
          <Radar className="size-5 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Track events
          </p>
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
          Instrumentation Novus discovered
        </h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Custom events wired in the app — documented automatically, no manual spec sheet.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {data.trackEvents.map((event) => (
            <li
              key={event.name}
              className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
            >
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold">
                  {event.name}
                </code>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                  {event.surface}
                </Badge>
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Sparkles className="size-3" />
                  Novus
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{event.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 rounded-2xl border border-border bg-gradient-to-br from-secondary/80 to-card p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Ask Novus in Cursor
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold">
          Query live analytics from your editor
        </h2>
        <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
          Connect the Novus MCP server in Cursor to explore funnels, signals, and session replays
          while you build. This page shows a synced snapshot — ask{" "}
          <em>&ldquo;where do sessions drop off before a recipe?&rdquo;</em> for the latest data.
        </p>
        <Button asChild variant="outline" className="mt-6 rounded-lg">
          <Link to="/ingredients">
            Start a cooking session
            <ArrowRight className="ml-1 size-4" />
          </Link>
        </Button>
      </section>
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  hint,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
  icon?: typeof TrendingDown;
}) {
  return (
    <Card className={accent ? "border-primary/40 bg-primary/5" : undefined}>
      <CardContent className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </p>
        <div className="mt-2 flex items-center gap-2">
          {Icon ? <Icon className="size-5 shrink-0 text-destructive" /> : null}
          <p className={`font-display text-3xl font-semibold ${accent ? "text-primary" : ""}`}>
            {value}
          </p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function FunnelChart({
  funnel,
  compact = false,
  className = "",
}: {
  funnel: NovusFunnel;
  compact?: boolean;
  className?: string;
}) {
  const maxSessions = Math.max(...funnel.steps.map((s) => s.sessionCount), 1);

  return (
    <div className={`space-y-3 ${className}`}>
      {funnel.steps.map((step) => {
        const width = Math.max(
          (step.sessionCount / maxSessions) * 100,
          step.sessionCount > 0 ? 8 : 2,
        );
        const isDropOff = funnel.highestDropOffStep === step.stepNumber && step.dropOffRate > 0;

        return (
          <div key={step.stepNumber} className="group">
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1 font-medium">
                <span className="text-muted-foreground">{step.stepNumber}.</span>
                {step.label}
                {isDropOff ? (
                  <ChevronRight className="size-3.5 text-destructive" aria-hidden />
                ) : null}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {step.sessionCount} sessions
                {step.dropOffRate > 0 ? (
                  <span className="ml-2 text-destructive">
                    −{Math.round(step.dropOffRate * 100)}%
                  </span>
                ) : null}
              </span>
            </div>
            <div
              className={`overflow-hidden rounded-lg bg-muted ${compact ? "h-2" : "h-3"}`}
              role="presentation"
            >
              <div
                className={`h-full rounded-lg transition-all ${
                  isDropOff ? "bg-destructive/80" : "bg-primary"
                }`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
