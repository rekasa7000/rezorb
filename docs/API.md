# Rezorb — API Contract

All endpoints are Next.js Route Handlers under `/api`, running on the Node.js
runtime. Request and response bodies are JSON, validated with Zod schemas in
`src/lib/schemas/`, which the client also imports.

## Conventions

- **Auth:** a Better Auth session cookie. Every endpoint except `/api/auth/**` and
  `/api/cron/**` returns `401` without a session.
- **Space grant:** every endpoint marked **(grant)** also needs a valid `rz_g_{spaceId}`
  cookie (see [ARCHITECTURE § 4.1](ARCHITECTURE.md#41-unlocking-a-space)). If it
  is missing or invalid, the endpoint returns `403 {code: "SPACE_LOCKED"}`.
- **CSRF:** cookies are `SameSite=Lax`; all mutations must send
  `Content-Type: application/json` (else `415 UNSUPPORTED_MEDIA_TYPE`); and if an
  `Origin` header is present it must match the app origin (else `403 BAD_ORIGIN`).
  Browsers always send `Origin` on mutations; non-browser clients (tests, cron) may omit it.
- **Errors:** `{ "error": { "code": "STRING_CODE", "message": "Human text", "details"?: {} } }`
- **Rate limit:** exceeding a limit returns `429 {code:"RATE_LIMITED"}` with a
  `Retry-After` header (seconds). Limits are listed in [SECURITY.md §4](SECURITY.md#4-rate-limits).
  (`RateLimit-Remaining` headers are **not** sent.)
- **Pagination:** cursor-based. Pass `?cursor=<dropId>&limit=50`. Responses
  include `nextCursor`.
- **Times:** ISO-8601 UTC strings.

### Shared types

```ts
type Lifetime = "1h" | "24h" | "7d";
type DropKind = "text" | "code" | "link" | "image" | "file";
type Accent = "nebula" | "plasma" | "ion" | "flare" | "aurora" | "redshift" | "corona" | "chartreuse";

interface SpaceDTO {
  id: string; slug: string; name: string; accent: Accent;
  defaultLifetime: Lifetime; dropCount: number; lastActivityAt: string;
  unlockedHere: boolean;                 // this device has a valid grant
}

interface DropDTO {
  id: string; spaceId: string; kind: DropKind; status: "uploading" | "ready";
  text?: string; language?: string;      // text/code/link
  fileName?: string; mimeType?: string; sizeBytes: number;
  width?: number; height?: number; thumbUrl?: string;  // image (thumbUrl: short-lived)
  sourceDevice: { id: string; label: string; kind: string } | null;
  pinned: boolean; createdAt: string; expiresAt: string;
}

interface DeviceDTO {
  id: string; label: string; kind: string; createdAt: string;
  lastSeenAt: string; current: boolean;
}
```

## Auth (Better Auth)

| Method | Path | Notes |
|--------|------|-------|
| * | `/api/auth/**` | Better Auth: `sign-up/email`, `sign-in/email`, `sign-in/magic-link`, `sign-out`, `verify-email`, passkey routes, `revoke-sessions`, … |

Rezorb adds a hook on session creation: find or create the `device` from the `rz_dev`
cookie and the User-Agent, and attach `device_id` to the session. Creating an 11th active
device fails with `403 QUOTA_DEVICES`.

Better Auth's built-in limiter is on in production (Postgres-backed): sign-in 10 / 10 s,
sign-up 10 / 60 s, magic link 5 / 60 s per IP, 100 / 10 s default.

### Device pairing (custom plugin, mounted under `/api/auth`)

| Endpoint | Auth | Body → Response |
|----------|------|-----------------|
| `POST /pairing/start` | none (IP rate limit 10 / 10 min) | `{}` → `{ userCode: "XXXX-XXXX", secret, expiresAt }`. Keep `secret` private to that browser. |
| `POST /pairing/poll` | none (120 / min per IP) | `{ userCode, secret }` → `{ status: "pending" \| "approved" \| "denied" \| "expired" }`. On `approved` the response sets the session cookie. Single use. |
| `POST /pairing/info` | session (10 / 10 min per user) | `{ code }` → `{ userCode, label, kind, geo, requestedAt, expiresAt }` or `404` |
| `POST /pairing/decide` | session (10 / 10 min per user) | `{ code, approve }` → `{ ok: true }` or `404`/`409` |

## Spaces

### `GET /api/spaces`
Returns `{ spaces: SpaceDTO[] }` for the current user, ordered by `lastActivityAt desc`.

### `POST /api/spaces`
```json
{ "name": "Work swap", "pin": "482913", "accent": "nebula", "defaultLifetime": "24h" }
```
- `name`: 1–40 characters, unique per user (case-insensitive). Otherwise `409 NAME_TAKEN`.
- `pin`: 6–8 digits that pass the strength check. Otherwise `422 WEAK_PIN`.
- Maximum 10 Spaces. Otherwise `403 QUOTA_SPACES`.
- On success it also grants this device, so the creator lands inside the Space.
  Returns `201 { space: SpaceDTO }` and sets the grant cookie.

### `POST /api/spaces/unlock`
```json
{ "name": "Work swap", "pin": "482913" }
```
| Result | Response |
|--------|----------|
| OK | `200 { space }` + `Set-Cookie: rz_g_{id}` |
| Unknown name **or** wrong PIN | `401 { code: "BAD_CREDENTIALS", details: { attemptsLeft?: number } }`. `attemptsLeft` is present only when the name exists, which deliberately reveals nothing extra: the user owns their own names. |
| Locked out | `423 { code: "SPACE_SEALED", details: { until } }` |

Rate limits: 10/min per user, 30/min per IP.

### `PATCH /api/spaces/:id` (grant)
`{ name?, accent?, defaultLifetime? }` → `{ space }`

### `POST /api/spaces/:id/pin` (grant)
`{ currentPin, newPin }`. Bumps `pin_version`, revokes all grants except this
device's (which is re-issued), and publishes `space.relocked`.

### `POST /api/spaces/:id/lock` (grant)
Revokes this device's grant and clears the cookie. Returns `204`.

### `DELETE /api/spaces/:id` (grant)
Body `{ confirmName }`, which must equal the Space name. Deletes the Space and its
drops, schedules R2 prefix deletion, and publishes `space.deleted`. Returns `204`.

## Drops

### `GET /api/spaces/:id/drops` (grant)
`?cursor&limit=50&since=<ISO>` → `{ drops: DropDTO[], nextCursor, serverTime }`.
Pass a previous `serverTime` as `since` to get only drops created/updated after it.
`since` returns drops created or updated after that time. Polling fallback uses it.
Only unexpired drops with status `ready` are returned, plus any `uploading` drops
from this device.

### `POST /api/spaces/:id/drops` (grant)
Creates a text, code, or link drop.
```json
{ "kind": "text", "text": "…", "lifetime": "24h", "clientId": "tmp_123" }
```
- `text`: at most 1 MB in UTF-8. Otherwise `413 TOO_LARGE`.
- `clientId` is echoed back so the client can reconcile its optimistic card.
- The server re-validates the `kind` (for example, `link` must be a single
  http(s) URL, otherwise it is stored as `text`).
- Returns `201 { drop }` and publishes `drop.created`.

### `POST /api/spaces/:id/uploads` (grant)
Starts a file or image upload.
```json
{ "fileName": "report.pdf", "mimeType": "application/pdf", "sizeBytes": 2483022,
  "kind": "file", "width": null, "height": null, "withThumb": false, "lifetime": "24h" }
```
- Checks: size ≤ 50 MB (`413`), storage quota (`403 QUOTA_STORAGE`).
- The MIME type is advisory. Downloads are always `attachment`.
- Response:
```json
{ "drop": { …status: "uploading" },
  "upload": { "method": "single", "url": "https://…r2…", "headers": { "Content-Type": "…" }, "expiresAt": "…" },
  "thumbUpload": { "url": "…" } }
```
  For sizes over 25 MB: `"upload": { "method": "multipart", "uploadId": "…", "partSize": 8388608, "parts": [{ "partNumber": 1, "url": "…" }, …] }`.

### `POST /api/drops/:id/complete` (grant)
`{ "parts"?: [{ "partNumber": 1, "etag": "…" }] }`. Finalizes the upload: it
completes the multipart upload if needed, runs a `HEAD` on the object and
verifies the size (`422 SIZE_MISMATCH` and burn on mismatch), sets status to
`ready`, updates the quota, and publishes `drop.created`. Returns `{ drop }`.

### `PATCH /api/drops/:id` (grant)
`{ pinned?: boolean, extend?: Lifetime }`. `extend` sets
`expiresAt = now + lifetime`, capped at `createdAt + 7d`. Publishes `drop.updated`.

### `DELETE /api/drops/:id` (grant)
Hard-deletes the row and its R2 objects, and publishes `drop.burned`. Returns `204`.
The client's 5-second **undo** is implemented by *delaying* this call, not by
soft delete.

### `GET /api/drops/:id/download` (grant)
`?variant=blob|thumb&inline=0|1`. Returns `302` to a presigned R2 GET URL (TTL 60s).
`inline=1` is allowed **only** for `image/png|jpeg|webp|gif` (used for `<img>`
and copy-as-image). Everything else is forced to `attachment`.

## Realtime

### `POST /api/realtime/token`
Returns one of:

```json
{ "mode": "poll" }
```
(no `ABLY_API_KEY`; the client polls `GET …/drops`; `device: { id, label, kind }` is included here too), or

```json
{ "mode": "ably", "tokenRequest": { … }, "spaceIds": ["…"], "userChannel": "user:{id}",
  "device": { "id": "…", "label": "Chrome on Windows", "kind": "laptop" } }
```
The token's capability is `subscribe` + `presence` on `space:{id}` for each Space this
device currently holds a valid grant for, plus `subscribe` on `user:{userId}`. The Ably
`clientId` is the **device id**. TTL 1 h; the client re-requests on expiry. A device must
re-request a token after unlocking another Space. Rate limit 60 / min per user.

### Realtime events

Channel `space:{spaceId}` (published by the server only):

| Event name | Payload |
|------------|---------|
| `drop.created` | `{ drop: DropDTO, clientId? }`. `text` is omitted if over 64 KB, in which case clients fetch the drop. |
| `drop.updated` | `{ drop: DropDTO }` |
| `drop.burned` | `{ ids: string[], reason: "deleted" \| "expired" }` |
| `space.updated` | `{ space: SpaceDTO }` |
| `space.relocked` | `{ pinVersion }`. Every device except the initiator drops to the PIN screen. |
| `space.deleted` | `{}` |
| `space.sealed` | `{ until }`. Lockout notice. |

Presence on `space:{spaceId}`: `{ deviceId, label, kind }`.

Channel `user:{userId}`:

| Event name | Payload |
|------------|---------|
| `device.revoked` | `{ deviceId }`. The revoked device signs itself out immediately. |
| `space.created` / `space.deleted` | Keeps the Launchpad fresh |

## Devices

| Method | Path | Body | Result |
|--------|------|------|--------|
| GET | `/api/usage` | — | `{ usage: { storageBytes, storageMaxBytes, spaces, spacesMax, devices, devicesMax } }` |
| GET | `/api/devices` | — | `{ devices: DeviceDTO[] }` |
| PATCH | `/api/devices/:id` | `{ label }` | `{ device }` |
| DELETE | `/api/devices/:id` | — | Revokes the device: deletes its sessions and grants and publishes `device.revoked`. Returns `204`. |

## Cron

### `GET /api/cron/burn`
Requires `Authorization: Bearer ${CRON_SECRET}` (sent automatically by Vercel Cron).
It deletes expired drops and stale uploads in batches of 500, deletes their R2
objects, fixes quotas, and publishes `drop.burned` per Space. It is idempotent.
Returns `{ burned, staleUploads, durationMs }`.

## Error codes

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHENTICATED` | 401 | No session |
| `BAD_CREDENTIALS` | 401 | Space name/PIN didn't match |
| `SPACE_LOCKED` | 403 | No valid grant for this Space on this device |
| `QUOTA_SPACES` / `QUOTA_STORAGE` / `QUOTA_DEVICES` | 403 | Limit reached |
| `NOT_FOUND` | 404 | Also returned for resources the user doesn't own |
| `NAME_TAKEN` | 409 | |
| `NOT_YOURS` | 403 | Only the uploading device can complete an upload |
| `BAD_ORIGIN` | 403 | `Origin` header doesn't match the app |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Mutations must be `application/json` |
| `CONFIRM_MISMATCH` | 422 | Space delete: typed name didn't match |
| `INTERNAL` | 500 | Unexpected; the cause is logged without content |
| `TOO_LARGE` | 413 | |
| `WEAK_PIN` / `VALIDATION` / `SIZE_MISMATCH` | 422 | |
| `SPACE_SEALED` | 423 | Lockout active |
| `RATE_LIMITED` | 429 | |

## Dev-only

`GET|PUT /api/dev-storage/:token`: local stand-in for R2 presigned URLs. Tokens are
HMAC-signed and expire; the route returns **404 unless R2 is unconfigured and
`NODE_ENV !== "production"`** (or the e2e switch is on). Never reachable on a real deploy.
