# ADR-0007: End-to-end encryption (v2)

**Status:** Deferred to v2 (schema-ready in v1)

## Context
Users may move sensitive content. E2E encryption means the server only sees
ciphertext. It is also Rezorb's strongest trust differentiator.

## Proposed design
- On unlocking, the browser derives a **Space key** from the PIN plus a
  per-Space `kdf_salt`, using Argon2id (WASM) or PBKDF2-SHA256 with 600k
  iterations. It is held in memory only, as a non-extractable `CryptoKey`.
- Each Drop gets AES-256-GCM with a random 96-bit IV (`drop.iv`). Files are
  encrypted in 8 MB chunks, each with its own IV.
- The server still verifies the PIN through a **separate** Argon2id hash with a
  different salt, so the server-side verifier can't be used to derive the key.

## Open problems (why it's deferred)
- **A 6-digit PIN is weak key material.** It has about 20 bits of entropy, so
  anyone with the ciphertext and salt can brute-force it offline in seconds. E2E
  needs a **longer passphrase**, or a random Space key wrapped by
  passkey/WebAuthn PRF, and transferred to new devices via the pairing flow.
- Changing the PIN means re-encrypting, or using key wrapping.
- Server-side features that read content (code-language detection, thumbnails)
  must move to the client. They already are client-side in v1.

## Decision for v1
Add the nullable columns `space.encryption`, `space.kdf_salt`, and `drop.iv`. Keep
classification and thumbnailing on the client so v2 needs no server changes to
those paths.
