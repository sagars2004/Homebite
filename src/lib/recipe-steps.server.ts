import { z } from "zod";
import { generateJson } from "./ai-provider.server";
import { isRateLimitError } from "./gemini-quota.server";

export const StepsSchema = z.array(z.string().min(1)).min(1);

export const GeneratedRecipeSchema = z.object({
  ingredients: z.array(z.object({ name: z.string(), measure: z.string() })),
  steps: z.array(z.string()),
  image_search_term: z.string(),
});

/** Split MealDB's block of instructions into step-sized chunks. */
export function splitInstructions(raw: string): string[] {
  return raw
    .split(/\r?\n+/)
    .map((step) => step.trim())
    .filter(Boolean);
}

/**
 * Format MealDB instructions without Gemini — splits paragraphs into steps and
 * prepends a gather step with full ingredient amounts so quantities are visible.
 */
export function formatMealStepsLocally(
  rawInstructions: string,
  ingredients: { name: string; measure: string }[] = [],
): string[] {
  const trimmed = rawInstructions.trim();
  if (!trimmed) return [];

  let steps = splitInstructions(trimmed);

  // Single long paragraph — break into sentences.
  if (steps.length === 1 && steps[0].length > 120) {
    const sentences = steps[0]
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 10);
    if (sentences.length > 1) steps = sentences;
  }

  // Numbered block: "1. Heat oil 2. Add onion"
  if (steps.length === 1) {
    const numbered = trimmed
      .split(/\s*(?=\d+[\.\)]\s)/)
      .map((part) => part.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter(Boolean);
    if (numbered.length > 1) steps = numbered;
  }

  if (ingredients.length > 0) {
    const gather = ingredients
      .map((item) => (item.measure ? `${item.measure} ${item.name}` : item.name))
      .join(", ");
    steps = [`Gather your ingredients: ${gather}.`, ...steps];
  }

  return steps;
}

function formatIngredientsForPrompt(ingredients: { name: string; measure: string }[]): string {
  if (ingredients.length === 0) return "";
  const lines = ingredients
    .map((item) => (item.measure ? `- ${item.measure} ${item.name}` : `- ${item.name}`))
    .join("\n");
  return `\n\nIngredient amounts for this dish:\n${lines}`;
}

const REWRITE_STEPS_PROMPT = `Rewrite these recipe steps in a warm, conversational tone for a home cook in their 20s.

Requirements:
- Keep every step accurate to the original instructions
- Preserve ALL measurements, quantities, temperatures, and cook times from the original — do not drop or round them
- When a step uses an ingredient, include the amount in the step text (e.g. "add 2 tbsp olive oil", "bake at 400°F", "simmer for 10 minutes")
- If the original omits an amount, pull it from the ingredient list below
- Sound like a knowledgeable friend — reassure on tricky steps, say what to look for not just what to do
- Return ONLY a valid JSON array of step strings. No markdown, no numbering, no explanation.`;

async function rewriteMealStepsWithAi(
  rawInstructions: string,
  ingredients: { name: string; measure: string }[],
): Promise<string[]> {
  return generateJson({
    prompt: `${REWRITE_STEPS_PROMPT}${formatIngredientsForPrompt(ingredients)}

Steps to rewrite:
${rawInstructions.trim()}`,
    schema: StepsSchema,
  });
}

/**
 * Prepare MealDB steps for display. Uses local formatting by default (no Gemini).
 * Set ENABLE_AI_STEP_REWRITE=true to opt into a conversational AI rewrite — costs
 * one extra API call per recipe.
 */
export async function prepareMealSteps(
  rawInstructions: string,
  ingredients: { name: string; measure: string }[] = [],
): Promise<string[]> {
  const local = formatMealStepsLocally(rawInstructions, ingredients);
  if (!rawInstructions.trim()) return local;

  if (process.env.ENABLE_AI_STEP_REWRITE !== "true") {
    return local;
  }

  try {
    return await rewriteMealStepsWithAi(rawInstructions, ingredients);
  } catch (error) {
    if (!isRateLimitError(error)) {
      console.warn("Homebite step rewrite failed; using formatted instructions", error);
    }
    return local;
  }
}

export function generatedRecipePrompt(dishName: string): string {
  return `Generate a complete recipe for ${dishName} suitable for a home cook. Return ONLY a valid JSON object:
{
  "ingredients": [{"name": "string", "measure": "string — specific amounts (e.g. \\"2 tbsp\\", \\"400g\\", \\"1 cup\\")"}],
  "steps": ["array of step strings in a warm conversational tone. Each step MUST include specific quantities, temperatures (°F or °C), and cook times wherever relevant — e.g. \\"Heat 2 tbsp oil in a pan over medium-high heat for 2 minutes\\", \\"Bake at 375°F for 25 minutes\\". Do not write vague steps like \\"add the chicken\\" without amounts or times."],
  "image_search_term": "string — a descriptive term to find a photo of this dish"
}
No markdown, no explanation.`;
}
