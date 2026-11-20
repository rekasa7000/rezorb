import { z } from "zod";
import { ACCENTS, DROP_KINDS, LIFETIMES, LIMITS } from "./limits";
import { PIN_MESSAGES, pinProblem } from "./pin-rules";

export const pinSchema = z.string().superRefine((pin, ctx) => {
  const p = pinProblem(pin);
  if (p) ctx.addIssue({ code: "custom", message: PIN_MESSAGES[p], params: { reason: p } });
});

/** Entering a PIN only needs the format check, never the strength check. */
export const pinEntrySchema = z.string().regex(new RegExp(`^\\d{${LIMITS.pinMinLength},${LIMITS.pinMaxLength}}$`), "Enter your PIN.");

export const spaceNameSchema = z
  .string()
  .trim()
  .min(1, "Give the Space a name.")
  .max(LIMITS.nameMaxLength, `Keep it under ${LIMITS.nameMaxLength} characters.`);

export const lifetimeSchema = z.enum(LIFETIMES);
export const accentSchema = z.enum(ACCENTS);
export const dropKindSchema = z.enum(DROP_KINDS);

export const createSpaceSchema = z.object({
  name: spaceNameSchema,
  pin: pinSchema,
  accent: accentSchema.default("nebula"),
  defaultLifetime: lifetimeSchema.default("24h"),
});

export const unlockSchema = z.object({ name: spaceNameSchema, pin: pinEntrySchema });

export const patchSpaceSchema = z
  .object({ name: spaceNameSchema, accent: accentSchema, defaultLifetime: lifetimeSchema })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const changePinSchema = z.object({ currentPin: pinEntrySchema, newPin: pinSchema });
export const deleteSpaceSchema = z.object({ confirmName: z.string() });

export const createTextDropSchema = z.object({
  kind: z.enum(["text", "code", "link"]).default("text"),
  text: z.string().min(1, "Nothing to beam."),
  language: z.string().max(30).optional(),
  lifetime: lifetimeSchema.optional(),
  clientId: z.string().max(64).optional(),
});

export const startUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(200).default("application/octet-stream"),
  sizeBytes: z.number().int().positive(),
  kind: z.enum(["image", "file"]).default("file"),
  width: z.number().int().positive().max(100_000).nullish(),
  height: z.number().int().positive().max(100_000).nullish(),
  withThumb: z.boolean().default(false),
  lifetime: lifetimeSchema.optional(),
  clientId: z.string().max(64).optional(),
});

export const completeUploadSchema = z.object({
  parts: z.array(z.object({ partNumber: z.number().int().min(1).max(10_000), etag: z.string().min(1).max(200) })).optional(),
  thumbBytes: z.number().int().min(0).max(2 * 1024 * 1024).optional(),
});

export const patchDropSchema = z
  .object({ pinned: z.boolean(), extend: lifetimeSchema })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const renameDeviceSchema = z.object({ label: z.string().trim().min(1).max(60) });
