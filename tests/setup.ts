import { vi } from "vitest";

// `after()` only works inside a Next.js request scope.
vi.mock("next/server", async (orig) => {
  const actual = await orig<typeof import("next/server")>();
  return { ...actual, after: (fn: () => unknown) => void Promise.resolve().then(fn).catch(() => {}) };
});
