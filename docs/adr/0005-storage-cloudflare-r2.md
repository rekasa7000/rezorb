# ADR-0005: Cloudflare R2 with presigned URLs

**Status:** Proposed

## Context
Files up to 50 MB must not pass through Vercel functions (4.5 MB body limit).
Files must be **private**, because a Space is PIN-locked, and downloads are
frequent (the whole point is catching them on another device). The current
backend uses Cloudinary, which is built for media transformation, not arbitrary
private files.

## Decision
Use **Cloudflare R2** through the S3 API (`@aws-sdk/client-s3` and
`@aws-sdk/s3-request-presigner`). The bucket is private. The browser PUTs
directly with a presigned URL (multipart above 25 MB). Downloads use a 60-second
presigned GET minted after a grant check. Object keys use the pattern
`u/{userId}/s/{spaceId}/d/{dropId}/{blob|thumb.webp}`. A lifecycle rule deletes
objects older than 8 days as a backstop. CORS allows PUT/GET from the app
origins only.

## Consequences
- ✅ **Zero egress fees**, which matters for a download-heavy product.
- ✅ Private by default, with S3-compatible tooling.
- ➖ An extra vendor. Thumbnails are generated client-side, because there's no
  image transformation service.

## Alternatives considered
- **Vercel Blob:** the simplest integration. Rejected for v1 because its private
  storage and egress pricing fit a download-heavy, private-by-default product
  less well. Re-evaluate if its private storage meets our needs, since it would
  remove a vendor.
- **AWS S3:** equivalent API, but has egress costs.
- **Cloudinary** (current): poor fit for arbitrary files and private access.
