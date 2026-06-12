import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bookmark, ChevronLeft } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

type AppShellProps = {
  children: ReactNode;
  backTo?: "/" | "/ingredients";
  compact?: boolean;
};

export function AppShell({ children, backTo, compact = false }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
        <div className="w-10">
          {backTo ? (
            <Link to={backTo} aria-label="Go back" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-secondary">
              <ChevronLeft className="size-5" />
            </Link>
          ) : null}
        </div>
        <Link to="/" className="font-display text-2xl font-semibold tracking-tight">Homebite</Link>
        <div className="flex items-center">
          <ThemeToggle />
          <Link to="/saved" aria-label="Saved recipes" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-secondary">
            <Bookmark className="size-5" />
          </Link>
        </div>
      </header>
      <main className={compact ? "mx-auto w-full max-w-2xl px-5 pb-28 sm:px-8" : "mx-auto w-full max-w-5xl px-5 pb-28 sm:px-8"}>
        {children}
      </main>
    </div>
  );
}