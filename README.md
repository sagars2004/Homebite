# Homebite

Homebite is a cooking assistant that turns what's already in your kitchen into a confident dinner plan. Instead of scrolling through endless options, you get **one clear recommendation** with step-by-step instructions written like a friend talking you through it.

Snap a grocery receipt, upload a fridge photo, type what you have, or browse a curated weekly catalog — Homebite meets you where you are and helps you decide what to make tonight.

## Use cases

- **“What can I make with what I have?”** — Add ingredients manually, scan a receipt, or upload a photo; set cooking time and vibe; get a single AI-generated recipe with ingredients split into what you have vs. what you might need.
- **“Surprise me from real recipes”** — Browse a stable weekly catalog from [TheMealDB](https://www.themealdb.com), filter by name, category, or cuisine, and open full recipes without reshuffling the lineup on every visit.
- **“That’s not quite right”** — Re-roll for a different dish with the same ingredients, or jump back to edit your list and regenerate.
- **“Save this for later”** — Bookmark recipes in the browser so you can come back and cook them again.
- **“Quick question while I cook”** — Use the floating chat to ask about swaps, steps, or leftovers; it reads your current session context when available.

## How it works

```
Home → Ingredients → Loading → Recipe
         ↑                          │
         └──── edit & regenerate ───┘
```

1. **Home** — Choose how to start: type ingredients, scan a receipt, or upload a photo.
2. **Ingredients** — Review and refine your list, set time and meal vibe, then submit.
3. **Loading** — Gemini generates a structured recipe (with quota guards and retry on failure).
4. **Recipe** — Hero image, ingredient lists, and conversational steps; save, re-roll, or edit.

Parallel paths:

- **Browse** (`/browse`) — Paginated catalog of ~hundreds of MealDB recipes, client-filtered from a server-loaded weekly set.
- **Saved** (`/saved`) — Recipes persisted in `localStorage` per browser.
- **Product Pulse** (`/pulse`) — In-app view of Novus product memory and early funnel analytics.

## Technical overview

| Layer | Choices |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router) (React 19, full-document SSR, server functions) |
| Build | Vite 8, [Nitro](https://nitro.build) for production server output |
| UI | Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com), Framer Motion |
| AI | Google Gemini via Vercel AI SDK — `gemini-2.0-flash` for text/JSON, `gemini-2.5-flash` for vision (receipt OCR) |
| Recipes (browse) | TheMealDB API — stable weekly catalog from fixed category + area filters |
| Photos | MealDB thumbnails when available; optional Pexels API fallback; branded placeholder otherwise |
| Session state | In-memory `cookingSession` for the active cook flow (ingredients → recipe) |
| Analytics | Pendo SDK (Novus) — page loads and custom `pendo.track` events across core flows |

**Server functions** (`createServerFn`) handle AI calls, MealDB fetches, chat, and vision OCR on the server so API keys never reach the browser. Gemini usage is rate-limited in-process (`GEMINI_MAX_CALLS_PER_MINUTE`, default 4) to stay under free-tier limits.

**Key routes:** `/` · `/ingredients` · `/loading` · `/recipe` · `/browse` · `/saved` · `/pulse`

## Product intelligence (Novus)

Homebite is instrumented with [Novus](https://novus.io) via the Pendo agent. Novus auto-mapped the codebase into product memory — pages, tracked events, and funnels — surfaced in the app at **Product Pulse** (`/pulse`) and in the Novus dashboard.

### Mapping snapshot

| | Count |
| --- | --- |
| Pages | 6 |
| Track events | 25 |
| Funnels & journeys | 11 |

*Status: “Your codebase is mapped. Almost live.”*

### Persona

**Home Cook** — A young adult cooking at home with ingredients on hand but no clear plan. Wants one confident dinner recommendation — not a list to scroll through — in a friendly, conversational tone.

### Product areas

| Area | What it covers |
| --- | --- |
| Home | Landing — choose input method (type, receipt, photo) |
| Ingredient Input | Add ingredients, set time and vibe, submit for generation |
| Recipe Generation & Viewing | AI recommendation, hero image, lists, and steps |
| Saved Recipes | Bookmark favorite dinner plans (browser persistence today) |
| App Shell & Settings | Header, navigation, theme toggle, shared error handling |

### Key flows

- **Core Recipe Flow** — Ingredients → generation → recipe view (primary value chain)
- **Re-roll** — “Make something else” with the same ingredients
- **Edit Ingredients & Regenerate** — Refine the list from the recipe page and try again
- **Error Recovery** — Retry after API limits, network issues, or invalid AI responses
- **Missing State Recovery** — Guards when session state is empty or stale between pages

### Instrumented events (sample)

| Event | When it fires |
| --- | --- |
| `ingredients_submitted` | User submits ingredient list with time and vibe |
| `recipe_generated` | AI succeeds and navigates to the recipe view |
| `recipe_generation_failed` | Generation fails (limits, network, bad response) |
| `recipe_generation_retried` | User taps “Try again” on the loading screen |
| `recipe_rerolled` | User requests a different recipe with same ingredients |
| `recipe_saved` / `recipe_unsaved` | Save toggle on the recipe page |
| `browse_recipe_opened` | User opens a recipe from the weekly catalog |
| `browse_surprise_me` | Random MealDB pick from browse |

### Funnel insights (early sessions)

From Novus funnel analysis during development:

| Funnel | Conversion | Notable drop-off |
| --- | --- | --- |
| **Home → Recipe** | ~3.8% (2 / 53 sessions) | **Start cooking** — ~92% drop from Home to the ingredients step |
| **Ingredient configuration** | ~22% (2 / 9) | **Add ingredients** — ~78% leave before adding items |
| **Recipe reroll** | 100% (1 / 1) | Small sample; flow completes when used |
| **Generation error recovery** | 100% (1 / 1) | Retry path works when generation fails |
| **Recipe edit & regenerate** | 0% (0 sessions) | Flow exists; not yet exercised in tracked sessions |

The largest opportunity in early data is **getting users from Home into the ingredient flow** — most sessions never tap “Start cooking.” A surfaced Novus signal also notes **no in-app guides** deployed yet across product areas.