# Rezorb — Data Model

Postgres (Neon) with Drizzle ORM. The schema of record is
[`src/server/db/schema.ts`](../src/server/db/schema.ts); migrations are in
`src/server/db/migrations` (committed). Timestamps are `timestamptz`.

IDs: Rezorb tables use **UUIDv7** (time-sortable). Better Auth tables use
`gen_random_uuid()` (v4), because Better Auth generates them (`generateId: "uuid"`).

## 1. Entity overview

```
user 1───* device 1───* session          (session.device_id)
user 1───* space  1───* drop             (drop.source_device_id → device, set null)
space 1───* space_grant *───1 device
user 1───* passkey        user 1───* pairing (once approved)     rate_limit (Better Auth)
```

## 2. Tables

### 2.1 Better Auth tables

Started from `npx auth generate` and then edited by hand (timestamptz; real FKs). If the
auth config changes, regenerate into a scratch file and diff.

| Table | Notes |
|-------|-------|
| `user` | `id, name, email (unique), email_verified, image, created_at, updated_at, plan (default 'free')`. No storage counter (see §4). |
| `session` | Better Auth columns plus **`device_id uuid → device(id) on delete cascade`**. |
| `account` | Credentials (scrypt password hash) and any linked providers. |
| `verification` | Email verification and magic-link tokens. |
| `passkey` | WebAuthn credentials (`@better-auth/passkey`). |
| `rate_limit` | Better Auth's own limiter state (`key unique, count, last_request` ms). Postgres-backed so it works across serverless instances. |
| `pairing` | Custom plugin. `user_code (unique), secret_hash, status (pending/approved/consumed/denied), user_id → user, requester_ua, requester_geo, expires_at, created_at`. |

### 2.2 `device`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → user, cascade | |
| `label` | text | From the User-Agent ("Chrome on Windows"); user-renameable |
| `kind` | text | `desktop · laptop · phone · tablet · unknown` |
| `created_at`, `last_seen_at` | timestamptz | `last_seen_at` updated on sign-in |
| `revoked_at` | timestamptz null | Set on revoke; the device's sessions are deleted and its grants revoked at the same time |

The device id also lives in an `rz_dev` cookie (HttpOnly, **unsigned**). That is safe by
construction: lookups require `device.user_id = session user`, so a forged id for someone
else's device just creates a new device. Limit: **10 active devices per user**
(`QUOTA_DEVICES`, enforced when a session is created).

Index: `(user_id) where revoked_at is null`.

### 2.3 `space`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `owner_id` | uuid FK → user, cascade | |
| `name`, `name_key` | text | Display name (1–40 chars) and `lower(trim(name))` for lookup |
| `slug` | text unique | 10 base58 chars; used in `/s/{slug}`; not secret |
| `pin_hash` | text | Argon2id (m=19456, t=2, p=1) |
| `pin_version` | int default 1 | Bumped on PIN change; grants must match |
| `accent` | text | One of 8 accent names |
| `default_lifetime` | text | `1h · 24h · 7d` |
| `failed_attempts` | int | Reset on success and on lockout |
| `lockout_count`, `last_lockout_at`, `locked_until` | | Doubling lockout; count decays after 24 h |
| `encryption`, `kdf_salt` | text / bytea | **v2 E2E.** Unused in v1 |
| `created_at`, `updated_at`, `last_activity_at` | timestamptz | |

Constraints: `unique (owner_id, name_key)`; index `(owner_id, last_activity_at desc)`.
Limit: **10 Spaces per user** (`QUOTA_SPACES`).

### 2.4 `space_grant`

`id` (uuid; the value inside the signed `rz_g_{spaceId}` cookie), `space_id`, `device_id`,
`user_id`, `pin_version`, `created_at`, `expires_at` (sliding, 12 h idle), `revoked_at`.
One live grant per (space, device): issuing a new one revokes the old.

### 2.5 `drop`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK (v7) | Sort order = creation order |
| `space_id` | FK → space, cascade | |
| `source_device_id` | FK → device, set null | |
| `kind` | text | `text · code · link · image · file` |
| `status` | text | `uploading · ready` |
| `text`, `language` | text | text/code/link only (≤ 1 MB) |
| `blob_key`, `thumb_key` | text | R2 keys `u/{userId}/s/{spaceId}/d/{dropId}/{blob|thumb.webp}` |
| `upload_id` | text | R2 multipart upload id while uploading |
| `file_name`, `mime_type` | text | File name is sanitised (no path separators/control chars) |
| `size_bytes` | bigint | UTF-8 byte length for text |
| `thumb_bytes` | int | Reserved while uploading, trued up on complete |
| `width`, `height` | int | Images |
| `pinned` | bool | Pinned → `expires_at = created_at + 7d` |
| `iv` | bytea | **v2 E2E.** Unused in v1 |
| `created_at`, `updated_at`, `expires_at` | timestamptz | `updated_at` powers `?since=` polling |

Indexes: `(space_id, id desc)` feed; `(expires_at)` burn job;
`(created_at) where status = 'uploading'` stale uploads.

## 3. Invariants

1. A drop with `kind in (image, file)` has a `blob_key` once started; `text/code/link`
   drops have `text`.
2. A grant is valid iff `revoked_at is null and expires_at > now()`, its `pin_version`
   equals the space's, it belongs to this user **and this device**, and the device isn't revoked.
3. Deleting a Space cascades to its drops and grants **and** deletes its R2 prefix
   `u/{userId}/s/{spaceId}/` (the lifecycle rule is the backstop).
4. A Space has at most 500 visible drops; the oldest unpinned are burned first.
5. A user's storage in use is computed, never stored (see §4).

## 4. Quota accounting

Storage used = `SUM(size_bytes + thumb_bytes)` over the user's drops where
`expires_at > now()` **and** (`status = 'ready'` **or** created within the last hour). So:
expired-but-not-yet-burned bytes never count (important on Hobby's daily cron), and fresh
in-flight uploads *do* count so parallel uploads can't overshoot. Checks run inside a
transaction holding `pg_advisory_xact_lock(hashtext(user_id))`. See
[ADR-0008](adr/0008-quota-by-sum.md).

## 5. Migrations

- `pnpm db:generate` (drizzle-kit) writes SQL; commit it. `pnpm db:migrate` applies it
  (`scripts/migrate.ts`, which uses `DATABASE_URL_UNPOOLED` and skips if no URL is set).
- `pnpm build:vercel` = `db:migrate && next build`.
- Keep migrations **backward compatible with the previous deployment** (expand/contract):
  previews and production can overlap.
