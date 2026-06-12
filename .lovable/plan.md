# Homebite core-flow plan

## Product scope
Build the mobile-first Homebite experience through a complete manual ingredient → AI recommendation → recipe flow. Preserve the requested tone, warm visual direction, and one-confident-dish behavior.

The project will use its supported architecture:
- TanStack Start file-based routes instead of Next.js
- Lovable AI Gateway with a current Gemini Flash model instead of a direct legacy Gemini 1.5 key
- Lovable Cloud in the later authentication phase instead of Firebase

Google sign-in and a basic profile (display name and avatar), pantry persistence, photo extraction, substitutions, leftovers, and recipe saving remain explicitly deferred because “Core flow first” was selected.

## Routes and experience
1. **Home (`/`)**
   - Branded Homebite entry screen with the tagline “Tell me what to make tonight.”
   - Manual ingredient entry is fully active.
   - Receipt/fridge actions are visibly marked as upcoming rather than pretending to work.
   - Saved pantry is omitted until authentication and persistence are implemented.

2. **Ingredients (`/ingredients`)**
   - Add/remove ingredient chips with touch-friendly controls.
   - Time and mood pill selectors with sensible defaults.
   - Validation for an empty ingredient list.
   - “Tell me what to make” stores temporary cooking-session input and navigates to loading.

3. **Loading (`/loading`)**
   - Rotating requested copy every 1.5 seconds with restrained animation.
   - Calls one server-side orchestration function.
   - Navigates to `/recipe` on success and shows a specific, recoverable error on failure.

4. **Recipe (`/recipe`)**
   - MealDB hero image when available, dish name, reason, time/effort badge.
   - “What you have” and “You’ll also need” ingredient sections.
   - Conversational step list optimized for kitchen reading.
   - Deferred actions are shown disabled or omitted so the core flow has no misleading controls.
   - “Make something else” reruns the same inputs through the loading flow.
   - Missing session/recipe state redirects users back into the flow gracefully.

5. **Saved (`/saved`)**
   - Route and polished empty/deferred state are present; actual Google sign-in and saved recipes come in the auth phase.

## AI and recipe orchestration
- Add a server-only Lovable AI provider helper and a typed `createServerFn` boundary.
- Validate inputs and structured outputs with Zod.
- Ask Gemini for exactly one dish using the supplied confident-friend voice and prohibited-word rules.
- Search TheMealDB with the AI-produced search term and normalize its 20 ingredient/measure fields.
- Rewrite MealDB instructions into conversational steps with structured AI output.
- If MealDB has no match, generate the complete ingredient list and steps with AI; use a safe local visual fallback rather than hotlinking Unsplash.
- Return one plain recipe DTO to the client, with clear handling for validation, network, AI-credit, and malformed-response failures.

## State and components
- Use a small client-side cooking-session store backed by session storage only for in-progress, non-sensitive data across routes.
- Create focused reusable components for the app shell, ingredient chips, selector pills, loading state, and recipe sections.
- Use existing Button/Input design-system components for controls.

## Visual system and metadata
- Replace the placeholder with a committed warm editorial kitchen aesthetic.
- Define semantic OKLCH tokens for off-white, near-black, terracotta, olive, card, and muted roles.
- Load Playfair Display and Inter via document-head links.
- Keep sentence case, generous touch targets, full-width mobile composition, and readable 18px recipe steps.
- Add unique titles/descriptions/Open Graph copy for each route, with a single H1 per page and accessible labels/focus states.

## Validation
- Test the manual entry and selector workflow, temporary state transfer, AI/MealDB success path, generated fallback path, reroll action, missing-state recovery, and responsive layouts at mobile and desktop widths.