# Rezorb — Testing Strategy

## Pyramid

| Layer | Tool | What | Where |
|-------|------|------|-------|
| Unit | Vitest | Pure logic: `classify`, PIN strength, lockout math, lifetime math, quota math, cookie signing, Zod schemas | `src/**/*.test.ts` |
| Integration | Vitest + a real Postgres (Neon branch or Docker) | Route handlers called directly, with Ably and R2 replaced by in-memory fakes behind their interfaces | `src/server/**/*.int.test.ts` |
| E2E | Playwright | Real browser flows. **Two browser contexts = two devices.** | `e2e/` |
| Visual | Playwright screenshots | Kitchen sink + key screens: dark, daylight, calm | `e2e/visual/` |
| A11y | `@axe-core/playwright` | Every page in e2e | inline in e2e |

## Must-have E2E scenarios (release gates)

1. **The magic moment:** device A pastes text, device B sees it in under 2s
   (generous for CI), presses `C`, and the clipboard contains the text. This
   needs `context.grantPermissions(['clipboard-read','clipboard-write'])`.
2. **Screenshot paste:** A pastes an image (synthetic `ClipboardEvent` with a
   PNG file), B sees the thumbnail, and the download works.
3. **File upload over 25 MB** (multipart) with a visible progress bar, then
   downloaded on B with a matching SHA-256.
4. **Pairing:** B opens `/pair`, A approves on `/link`, and B is signed in without a password.
5. **Brute force:** 5 wrong PINs give `SPACE_SEALED`, and A sees the lockout notice live.
6. **PIN change:** after A changes the PIN, B is dropped to the PIN screen within 2s.
7. **Device revoke:** after A revokes B, B is signed out within 2s, and B's old cookies get 401/403.
8. **Expiry:** create a Drop with a 1h lifetime using a mocked clock
   (`page.clock`). It disappears on both devices at T+1h, and the cron run
   deletes the R2 object (verified via fake storage in CI, or a real dev bucket
   nightly).
9. **Keyboard-only:** sign in, enter a Space, paste, and copy with no mouse.
10. **Calm mode:** no canvas element is rendered and no animations run (checked
    via `getAnimations()`).

## Security tests

- The grant cookie of Space X cannot read Space Y. A user's grant cannot be used with another user's session.
- A tampered or expired grant cookie is rejected.
- A presigned GET for drop D only works for 60s and only for that key.
- An `Origin` mismatch on a mutation returns 403.
- Text containing `<script>` renders as literal text.
- An Ably token can't publish (assert a publish attempt fails).

## CI

- On every PR: typecheck, lint, unit tests, integration tests (Neon branch), then e2e against the Vercel preview URL.
- Nightly: full e2e + visual tests against production, using a dedicated test account.
- Coverage target: 80% on `src/server/**` and `src/lib/**`. UI is covered by e2e.
