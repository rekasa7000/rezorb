/** Product limits (see docs/PRD.md §9). Shared by client and server. */
export const LIMITS = {
  maxSpacesPerUser: 10,
  maxDevicesPerUser: 10,
  maxTextBytes: 1024 * 1024,
  maxFileBytes: 50 * 1024 * 1024,
  maxStorageBytes: 1024 * 1024 * 1024,
  maxDropsPerSpace: 500,
  multipartThresholdBytes: 25 * 1024 * 1024,
  multipartPartBytes: 8 * 1024 * 1024,
  /** Text over this size is not embedded in realtime events. */
  maxRealtimeTextBytes: 64 * 1024,
  pinMinLength: 6,
  pinMaxLength: 8,
  nameMaxLength: 40,
  maxFailedPinAttempts: 5,
  baseLockoutMs: 15 * 60 * 1000,
  maxLockoutMs: 24 * 60 * 60 * 1000,
  grantIdleMs: 12 * 60 * 60 * 1000,
  grantSlideDebounceMs: 60 * 1000,
  presignPutSeconds: 300,
  presignGetSeconds: 60,
  pairingTtlSeconds: 600,
} as const;

export const LIFETIMES = ["1h", "24h", "7d"] as const;
export type Lifetime = (typeof LIFETIMES)[number];

export const LIFETIME_MS: Record<Lifetime, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

export const MAX_LIFETIME_MS = LIFETIME_MS["7d"];

export const ACCENTS = [
  "nebula",
  "plasma",
  "ion",
  "flare",
  "aurora",
  "redshift",
  "corona",
  "chartreuse",
] as const;
export type Accent = (typeof ACCENTS)[number];

export const DROP_KINDS = ["text", "code", "link", "image", "file"] as const;
export type DropKind = (typeof DROP_KINDS)[number];

export const INLINE_IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
