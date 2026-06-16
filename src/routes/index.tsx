import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  Check,
  ChefHat,
  ChevronRight,
  Clock3,
  Fish,
  Flame,
  IceCreamBowl,
  Menu,
  MessageCircle,
  Pencil,
  Soup,
  Sparkles,
  Wheat,
} from "lucide-react";
import { PhotoUploadButton } from "@/components/homebite/photo-upload-button";
import { ThemeToggle } from "@/components/homebite/theme-toggle";
import { Button } from "@/components/ui/button";
import DisplayCards from "@/components/ui/display-cards";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cookingSession } from "@/lib/cooking-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Homebite — Tell me what to make tonight" },
      {
        name: "description",
        content: "Turn the ingredients you have into one confident dinner plan.",
      },
      { property: "og:title", content: "Homebite" },
      { property: "og:description", content: "Tell me what to make tonight." },
    ],
  }),
  component: Index,
});

const navItems = [
  { title: "How it works", href: "#how" },
  { title: "Recipes of the Week", to: "/browse" as const },
  { title: "Saved recipes", to: "/saved" as const },
];

const valueLabels = [
  { icon: Clock3, label: "Fits your time" },
  { icon: Check, label: "Uses what you have" },
  { icon: MessageCircle, label: "Talked through it" },
];

const features = [
  {
    icon: Camera,
    title: "Start from anything",
    description: "Snap a grocery receipt, photograph your fridge, or just type a few ingredients.",
  },
  {
    icon: ChefHat,
    title: "One dish, not a list",
    description: "No scrolling through ten recipes — one confident answer for tonight.",
  },
  {
    icon: MessageCircle,
    title: "Cooked with a friend",
    description: "Conversational steps, quick substitutions, and a plan for the leftovers.",
  },
];

const heroCards = [
  {
    icon: <Soup className="size-4 text-primary-foreground" />,
    cuisine: "Thai",
    title: "Green curry",
    quote: "You’ve got the aromatics — this is a one-pan kind of night.",
    ingredients: ["Chicken", "Coconut milk", "Curry paste", "Basil"],
    meta: "~35 min · Easy",
    className: "[grid-area:stack] hover:-translate-y-12",
  },
  {
    icon: <Flame className="size-4 text-primary-foreground" />,
    cuisine: "Chinese",
    title: "Tomato egg stir-fry",
    quote: "Five things you already have, faster than takeout.",
    ingredients: ["Eggs", "Tomatoes", "Spring onion", "Rice"],
    meta: "~15 min · Quick",
    className: "[grid-area:stack] translate-x-14 translate-y-14 hover:-translate-y-1",
  },
  {
    icon: <Fish className="size-4 text-primary-foreground" />,
    cuisine: "Tex-Mex",
    title: "Cajun fish tacos",
    quote: "Fish cooks in minutes — dinner before you’re hungry again.",
    ingredients: ["White fish", "Tortillas", "Lime", "Cabbage"],
    meta: "~25 min · Easy",
    className: "[grid-area:stack] translate-x-28 translate-y-28 hover:-translate-y-1",
  },
  {
    icon: <Wheat className="size-4 text-primary-foreground" />,
    cuisine: "Italian",
    title: "Garlic butter pasta",
    quote: "Pantry magic — comes together while the water boils.",
    ingredients: ["Pasta", "Garlic", "Parmesan", "Parsley"],
    meta: "~20 min · Easy",
    className: "[grid-area:stack] translate-x-[10.5rem] translate-y-[10.5rem] hover:translate-y-20",
  },
];

const headlineWords = ["Tell", "me", "what", "to", "make", "tonight."];

const headline = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

const word = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5 } },
};

function Index() {
  // Returning home starts a fresh kitchen — clear any in-progress ingredient list.
  useEffect(() => {
    cookingSession.clearInput();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" className="font-display text-2xl font-semibold tracking-tight">
          Homebite
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) =>
            item.to ? (
              <Link
                key={item.title}
                to={item.to}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.title}
              </Link>
            ) : (
              <a
                key={item.title}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.title}
              </a>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild className="hidden rounded-lg md:inline-flex">
            <Link to="/ingredients">
              Start cooking
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent>
              <nav className="mt-8 flex flex-col gap-5">
                {navItems.map((item) =>
                  item.to ? (
                    <Link
                      key={item.title}
                      to={item.to}
                      className="text-base font-medium text-foreground"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <a
                      key={item.title}
                      href={item.href}
                      className="text-base font-medium text-foreground"
                    >
                      {item.title}
                    </a>
                  ),
                )}
                <Button asChild className="mt-2 rounded-lg">
                  <Link to="/ingredients">
                    Start cooking
                    <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground"
            >
              <Sparkles className="size-3.5" />
              Dinner, decided
            </motion.span>

            <motion.h1
              variants={headline}
              initial="hidden"
              animate="show"
              className="flex flex-wrap justify-center gap-x-3 gap-y-1 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:justify-start lg:text-7xl"
            >
              {headlineWords.map((text, index) => (
                <motion.span
                  key={text}
                  variants={word}
                  className={`inline-block ${index === headlineWords.length - 1 ? "text-primary" : ""}`}
                >
                  {text}
                </motion.span>
              ))}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground"
            >
              Give me what’s in your kitchen — a receipt, a fridge photo, or a quick list — and I’ll
              tell you one good thing to cook. No BS.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="mt-10 w-full max-w-md space-y-3"
            >
              <PhotoUploadButton icon={Camera} label="Snap your receipt" source="receipt" />
              <Button
                asChild
                variant="default"
                className="h-16 w-full justify-start rounded-xl px-5 text-base shadow-none"
              >
                <Link to="/ingredients">
                  <Pencil className="mr-2 size-5" />
                  Type what you have
                  <ChevronRight className="ml-auto size-5" />
                </Link>
              </Button>
              <PhotoUploadButton
                icon={IceCreamBowl}
                label="Photo my fridge"
                source="fridge"
                note="Beta"
              />
              <p className="pt-1 text-center text-sm text-muted-foreground">
                Not sure?{" "}
                <Link to="/browse" className="font-medium text-primary hover:underline">
                  Recipes of the Week
                </Link>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-3 lg:justify-start"
            >
              {valueLabels.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="size-4 text-primary" />
                  {label}
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.7, type: "spring", stiffness: 90, damping: 16 }}
            className="flex min-h-[34rem] w-full items-center justify-center"
          >
            <div className="-translate-x-4 -translate-y-36 scale-90 sm:scale-100 lg:-translate-x-10 lg:-translate-y-16">
              <DisplayCards cards={heroCards} />
            </div>
          </motion.div>
        </section>

        <section
          id="how"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-24 pt-12 sm:px-8 sm:pt-20"
        >
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className="text-center font-display text-3xl font-semibold sm:text-4xl"
          >
            How Homebite works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mx-auto mt-3 max-w-md text-center leading-7 text-muted-foreground"
          >
            No accounts, no scrolling. Three steps from “what’s in the fridge” to dinner.
          </motion.p>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, description }, index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.12, duration: 0.5 }}
                className="rounded-2xl border border-border bg-card p-7 text-left"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">{title}</h3>
                <p className="mt-2 leading-7 text-muted-foreground">{description}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Button asChild size="lg" className="h-13 rounded-xl px-8 text-base">
              <Link to="/ingredients">
                Tell me what to make
                <ArrowRight className="ml-1 size-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:px-8">
          <span className="font-display text-base font-semibold text-foreground">Homebite</span>
          <span>Tell me what to make tonight.</span>
        </div>
      </footer>
    </div>
  );
}
