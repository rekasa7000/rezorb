# Rezorb — Domain Language

Use these words consistently in code, UI copy, issues, and docs. If a term isn't
here, don't invent a synonym; add it here first.

| Term | Meaning | In code |
|------|---------|---------|
| **User** | A person with a Rezorb account. In v1 a User only ever shares with themselves. | `user` |
| **Device** | One browser on one machine that a User has signed in from (for example "Work laptop", "Phone"). Created on first sign-in and revocable. | `device` |
| **Space** | A PIN-protected, private room owned by one User. It holds Drops. The product's core object. (The user-facing word is "Space". Never call it "room" in the UI.) | `space` |
| **Space name** | A human-readable name, unique per User (case-insensitive). Typed together with the PIN to enter. | `space.name` |
| **Slug** | A short random ID used in the URL: `rezorb.app/s/{slug}`. Not secret. Knowing it does not grant access. | `space.slug` |
| **PIN** | 6–8 digits that unlock a Space on a Device. Stored only as an Argon2id hash. | `space.pinHash` |
| **Unlock** | Entering the correct name + PIN on a Device. Creates a **Space grant** for that Device. | `unlockSpace()` |
| **Space grant** | Proof that this Device unlocked this Space. Has an expiry (default 12h idle). It is a signed cookie backed by a DB row so it can be revoked. | `space_grant` |
| **Lock** | Ending a Space grant (manually, by idle timeout, by PIN change, or by device revocation). | `lockSpace()` |
| **Lockout** | A temporary seal on a Space after too many wrong PINs. | `space.lockedUntil` |
| **Drop** | One item inside a Space: text, code, link, image, or file. | `drop` |
| **Drop kind** | `text` · `code` · `link` · `image` · `file`. | `drop.kind` |
| **Beam** | The act of sending a Drop into a Space (paste, type + Enter, upload). | `beamDrop()` |
| **Catch** | Getting a Drop out on another Device (copy or download). | — (UI only) |
| **Lifetime** | How long a Drop lives before it expires. Options are 1h, 24h (default), or 7d. Each Space has a default. | `drop.expiresAt`, `space.defaultLifetime` |
| **Pin (a Drop)** | Keep a Drop until the Space's maximum lifetime (7d) instead of its own lifetime. Not to be confused with **PIN**. | `drop.pinned` |
| **Burn / burn-up** | A Drop expiring or being deleted, so its content and blob are removed. | `burnDrop()` |
| **Dock** | The input bar at the bottom of a Space. | `<Dock/>` |
| **Launchpad** | The signed-in home page (`/spaces`) listing a User's Spaces. | `/spaces` |
| **Constellation** | The presence indicator showing which Devices are currently in a Space. | `<Constellation/>` |
| **Pairing** | Signing in a new Device by approving a short code from an already-signed-in Device, with no password typed on the new Device. | `pairing` |
| **Calm mode** | A per-Device low-distraction visual mode. | `prefs.calm` |
| **Quota** | Limits per User: storage bytes in orbit, max file size, number of Spaces. | `quota` |
