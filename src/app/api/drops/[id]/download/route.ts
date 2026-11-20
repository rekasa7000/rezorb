import { NextResponse } from "next/server";
import { api, E } from "@/server/http";
import { requireDrop } from "@/server/drop-access";
import { isInlineImageMime } from "@/server/drops";
import { getStorage } from "@/server/storage";
import { RULES, enforceRate } from "@/server/ratelimit";

export const runtime = "nodejs";

/**
 * Grant-checked redirect to a short-lived presigned URL. Anything that isn't a
 * known-safe image type is forced to `attachment` (docs/SECURITY.md T6).
 */
export const GET = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const { who, drop } = await requireDrop(req, id);
  await enforceRate(RULES.download, who.userId);
  if (drop.status !== "ready" || drop.expiresAt < new Date()) throw E.notFound("Drop");

  const q = req.nextUrl.searchParams;
  const variant = q.get("variant") === "thumb" ? "thumb" : "blob";
  const key = variant === "thumb" ? drop.thumbKey : drop.blobKey;
  if (!key) throw E.notFound("File");

  const inline = q.get("inline") === "1" && (variant === "thumb" || isInlineImageMime(drop.mimeType));
  const url = await getStorage().presignGet({
    key,
    fileName: drop.fileName ?? undefined,
    contentType: variant === "thumb" ? "image/webp" : (drop.mimeType ?? undefined),
    inline,
  });
  const res = NextResponse.redirect(new URL(url, req.nextUrl.origin), 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
});
