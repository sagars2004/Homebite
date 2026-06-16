// Soft client-side throttle so we stay under Gemini's free-tier RPM (often 5/min
// for flash models). Reserves one slot for headroom. Counts all guarded calls
// in-process — enough for a single dev server or one Vercel instance.

const WINDOW_MS = 60_000;
const MAX_CALLS_PER_WINDOW = Number(process.env.GEMINI_MAX_CALLS_PER_MINUTE ?? 4);

const timestamps: number[] = [];

export class GeminiQuotaError extends Error {
  constructor() {
    super("Gemini free-tier quota reached (429). Try again in a minute.");
    this.name = "GeminiQuotaError";
  }
}

export function isRateLimitError(error: unknown): boolean {
  if (error instanceof GeminiQuotaError) return true;
  const message = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  return (
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    message.includes("quota") ||
    message.includes("rate limit")
  );
}

/** Throws GeminiQuotaError when the in-process minute window is full. */
export function assertGeminiQuota(): void {
  const now = Date.now();
  while (timestamps.length > 0 && timestamps[0]! < now - WINDOW_MS) {
    timestamps.shift();
  }
  if (timestamps.length >= MAX_CALLS_PER_WINDOW) {
    throw new GeminiQuotaError();
  }
  timestamps.push(now);
}
