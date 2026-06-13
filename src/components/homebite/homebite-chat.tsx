import { type ReactNode, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { ChefHat, MessageCircle, X } from "lucide-react";
import { AIInput } from "@/components/ui/ai-input";
import { cookingSession } from "@/lib/cooking-session";
import { askHomebite } from "@/lib/chat.functions";

type ChatMessage = { role: "user" | "assistant"; content: string };

const GREETING =
  "Tell me what you’ve got or what you’re in the mood for, and I’ll give you one good idea — plus help with swaps, steps, or leftovers.";

function buildContext(): string | undefined {
  const input = cookingSession.getInput();
  const recipe = cookingSession.getRecipe();
  const parts: string[] = [];
  if (input?.ingredients?.length)
    parts.push(`Ingredients on hand: ${input.ingredients.join(", ")}.`);
  if (typeof input?.timeMinutes === "number") {
    const time =
      input.timeMinutes >= 120 ? "plenty of time (2 hr+)" : `about ${input.timeMinutes} minutes`;
    parts.push(`Time tonight: ${time}.`);
  }
  if (input?.timeNote) parts.push(`Note from them: ${input.timeNote}.`);
  if (input?.vibes?.length) parts.push(`Feeling like: ${input.vibes.join(", ")}.`);
  if (recipe?.dishName) parts.push(`Currently looking at: ${recipe.dishName}.`);
  return parts.length ? parts.join(" ") : undefined;
}

export function HomebiteChat() {
  const ask = useServerFn(askHomebite);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open]);

  const send = async (text: string) => {
    if (busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setBusy(true);
    try {
      const result = await ask({ data: { messages: next, context: buildContext() } });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.ok ? result.reply : result.error,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "Couldn’t get an answer just now. Try asking again." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-h-[70vh] w-auto max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-foreground/10 sm:inset-x-auto sm:right-5 sm:w-96"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <ChefHat className="size-4" />
                </span>
                <div>
                  <p className="font-display text-base font-semibold leading-none">Ask Homebite</p>
                  <p className="mt-1 text-xs text-muted-foreground">Your kitchen sidekick</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <Bubble role="assistant">{GREETING}</Bubble>
              {messages.map((message, index) => (
                <Bubble key={index} role={message.role}>
                  {message.content}
                </Bubble>
              ))}
              {busy ? (
                <div
                  className="flex gap-1.5 px-1 text-muted-foreground"
                  aria-label="Homebite is thinking"
                >
                  <Dot delay={0} />
                  <Dot delay={0.15} />
                  <Dot delay={0.3} />
                </div>
              ) : null}
            </div>

            <div className="border-t border-border px-4 py-3">
              <AIInput
                placeholder="Ask about tonight’s dinner…"
                minHeight={48}
                maxHeight={140}
                disabled={busy}
                onSubmit={send}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close chat" : "Ask Homebite"}
        className="fixed bottom-5 right-5 z-50 inline-flex h-13 items-center gap-2 rounded-full bg-primary px-5 text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.03] active:scale-95"
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
        <span className="text-sm font-semibold">{open ? "Close" : "Ask Homebite"}</span>
      </button>
    </>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm leading-6 text-primary-foreground"
            : "max-w-[85%] rounded-2xl rounded-bl-sm bg-secondary px-4 py-2.5 text-sm leading-6 text-secondary-foreground"
        }
      >
        {children}
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="size-2 rounded-full bg-muted-foreground/60"
      animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
      transition={{ duration: 1, repeat: Infinity, delay }}
    />
  );
}
