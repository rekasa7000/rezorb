import { LIFETIME_MS, MAX_LIFETIME_MS, type Lifetime } from "./limits";

export function expiryFor(createdAt: Date, lifetime: Lifetime, pinned = false): Date {
  return new Date(createdAt.getTime() + (pinned ? MAX_LIFETIME_MS : LIFETIME_MS[lifetime]));
}

/** "Extend": never shortens, never exceeds createdAt + 7d. */
export function extendedExpiry(createdAt: Date, current: Date, lifetime: Lifetime, now = new Date()): Date {
  const cap = createdAt.getTime() + MAX_LIFETIME_MS;
  const wanted = now.getTime() + LIFETIME_MS[lifetime];
  return new Date(Math.min(cap, Math.max(current.getTime(), wanted)));
}

/** Unpin: back to the Space's default lifetime, but never vanish within 5 minutes. */
export function unpinnedExpiry(createdAt: Date, defaultLifetime: Lifetime, now = new Date()): Date {
  const natural = createdAt.getTime() + LIFETIME_MS[defaultLifetime];
  return new Date(Math.max(natural, now.getTime() + 5 * 60 * 1000));
}
