export {};

// Pendo (Novus) web SDK. The agent is injected by the CDN snippet in
// `src/routes/__root.tsx`, which also stubs these methods on a queue before the
// real agent loads, so they are always safe to call on the client.
interface PendoSDK {
  initialize: (options?: Record<string, unknown>) => void;
  identify: (...args: unknown[]) => void;
  updateOptions: (...args: unknown[]) => void;
  pageLoad: (...args: unknown[]) => void;
  track: (...args: unknown[]) => void;
  trackAgent: (...args: unknown[]) => void;
  clearSession?: () => void;
}

declare global {
  const pendo: PendoSDK;
}
