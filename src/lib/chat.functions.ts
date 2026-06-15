import { createServerFn } from "@tanstack/react-start";
import { generateText, type ModelMessage } from "ai";
import { z } from "zod";
import { createAiProvider } from "./ai-provider.server";

const InputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
  context: z.string().max(2000).optional(),
});

const SYSTEM_PROMPT =
  "You are Homebite, a confident, experienced home cook talking to a friend in their 20s who is cooking for themselves tonight. Speak plainly and directly, like a knowledgeable friend — not a recipe app. Give one clear answer, never a long list of options. Keep replies short: 2 to 4 sentences. Use sentence case. Never use the words delicious, amazing, simply, or easy, and never say 'based on your ingredients' or 'I recommend'. You help with what to cook, substitutions, techniques, and using up leftovers. If asked something unrelated to food or cooking, steer it back to the kitchen with a light touch.";

export const askHomebite = createServerFn({ method: "POST" })
  .validator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const model = createAiProvider();
      const system = data.context
        ? `${SYSTEM_PROMPT}\n\nWhat the cook is working with right now: ${data.context}`
        : SYSTEM_PROMPT;

      const messages: ModelMessage[] = data.messages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      // maxRetries: 0 — like generateJson, don't let the AI SDK silently retry
      // up to 3x on a 429. On the free tier that amplification is what trips the
      // per-minute quota; we'd rather surface the busy message immediately.
      const result = await generateText({
        model,
        system,
        messages,
        maxOutputTokens: 600,
        maxRetries: 0,
      });
      const reply = result.text.trim();
      if (!reply) throw new Error(`Empty AI response (${result.finishReason})`);

      return { ok: true as const, reply };
    } catch (error) {
      console.error("Homebite chat failed", error);
      const message = error instanceof Error ? error.message : "";
      if (message.includes("402")) {
        return { ok: false as const, error: "Homebite is out of AI credits right now. Add workspace credits, then try again." };
      }
      if (message.includes("429")) {
        return { ok: false as const, error: "The kitchen is busy right now. Give it a minute, then try again." };
      }
      return { ok: false as const, error: "Couldn’t get an answer just now. Try asking again." };
    }
  });
