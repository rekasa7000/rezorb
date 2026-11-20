import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

/*
 * Better Auth tables (user, session, account, verification, passkey, pairing)
 * started from `npx auth generate` and were then edited by hand:
 *   - timestamptz everywhere
 *   - session.device_id and pairing.user_id are real FKs; no stored storage counter (usage is SUMmed)
 * If you change the auth config, regenerate into a scratch file and diff.
 */

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });
const tz = (name: string) => timestamp(name, { withTimezone: true });

export const user = pgTable("user", {
  id: uuid("id")
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: tz("created_at").defaultNow().notNull(),
  updatedAt: tz("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  plan: text("plan").notNull().default("free"),
});

export const session = pgTable(
  "session",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    expiresAt: tz("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").references(() => device.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: tz("access_token_expires_at"),
    refreshTokenExpiresAt: tz("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: tz("expires_at").notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const passkey = pgTable(
  "passkey",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    credentialID: text("credential_id").notNull(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: boolean("backed_up").notNull(),
    transports: text("transports"),
    createdAt: tz("created_at"),
    aaguid: text("aaguid"),
  },
  (table) => [
    index("passkey_userId_idx").on(table.userId),
    index("passkey_credentialID_idx").on(table.credentialID),
  ],
);

/** Better Auth's built-in rate limiter, stored in Postgres so it works across serverless instances. */
export const rateLimit = pgTable("rate_limit", {
  id: uuid("id")
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const pairing = pgTable("pairing", {
  id: uuid("id")
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  userCode: text("user_code").notNull().unique(),
  secretHash: text("secret_hash").notNull(),
  status: text("status").notNull(),
  userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
  requesterUa: text("requester_ua"),
  requesterGeo: text("requester_geo"),
  expiresAt: tz("expires_at").notNull(),
  createdAt: tz("created_at").notNull(),
});


// ───────────────────────── Rezorb tables ─────────────────────────

export const device = pgTable(
  "device",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    kind: text("kind", { enum: ["desktop", "laptop", "phone", "tablet", "unknown"] })
      .notNull()
      .default("unknown"),
    createdAt: tz("created_at").notNull().defaultNow(),
    lastSeenAt: tz("last_seen_at").notNull().defaultNow(),
    revokedAt: tz("revoked_at"),
  },
  (t) => [index("device_user_active_idx").on(t.userId).where(sql`${t.revokedAt} is null`)],
);

export const space = pgTable(
  "space",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    slug: text("slug").notNull().unique(),
    pinHash: text("pin_hash").notNull(),
    pinVersion: integer("pin_version").notNull().default(1),
    accent: text("accent").notNull().default("nebula"),
    defaultLifetime: text("default_lifetime", { enum: ["1h", "24h", "7d"] })
      .notNull()
      .default("24h"),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockoutCount: integer("lockout_count").notNull().default(0),
    lockedUntil: tz("locked_until"),
    lastLockoutAt: tz("last_lockout_at"),
    // v2 end-to-end encryption (ADR-0007). Unused in v1.
    encryption: text("encryption", { enum: ["none", "e2e_v1"] }).notNull().default("none"),
    kdfSalt: bytea("kdf_salt"),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
    lastActivityAt: tz("last_activity_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("space_owner_name_idx").on(t.ownerId, t.nameKey),
    index("space_owner_activity_idx").on(t.ownerId, t.lastActivityAt.desc()),
  ],
);

export const spaceGrant = pgTable(
  "space_grant",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => device.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    pinVersion: integer("pin_version").notNull(),
    createdAt: tz("created_at").notNull().defaultNow(),
    expiresAt: tz("expires_at").notNull(),
    revokedAt: tz("revoked_at"),
  },
  (t) => [index("grant_space_idx").on(t.spaceId), index("grant_device_idx").on(t.deviceId)],
);

export const drop = pgTable(
  "drop",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    sourceDeviceId: uuid("source_device_id").references(() => device.id, { onDelete: "set null" }),
    kind: text("kind", { enum: ["text", "code", "link", "image", "file"] }).notNull(),
    status: text("status", { enum: ["uploading", "ready"] }).notNull().default("ready"),
    text: text("text"),
    language: text("language"),
    blobKey: text("blob_key"),
    thumbKey: text("thumb_key"),
    uploadId: text("upload_id"), // R2 multipart upload id, if any
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
    thumbBytes: integer("thumb_bytes").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    pinned: boolean("pinned").notNull().default(false),
    iv: bytea("iv"), // v2 E2E
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
    expiresAt: tz("expires_at").notNull(),
  },
  (t) => [
    index("drop_space_idx").on(t.spaceId, t.id.desc()),
    index("drop_expires_idx").on(t.expiresAt),
    index("drop_stale_upload_idx").on(t.createdAt).where(sql`${t.status} = 'uploading'`),
  ],
);

export type User = typeof user.$inferSelect;
export type Device = typeof device.$inferSelect;
export type Space = typeof space.$inferSelect;
export type SpaceGrant = typeof spaceGrant.$inferSelect;
export type Drop = typeof drop.$inferSelect;
