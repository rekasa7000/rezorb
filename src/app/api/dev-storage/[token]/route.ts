import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { NextResponse, type NextRequest } from "next/server";
import { devPartPath, devPath, readDevToken, usingDevStorage } from "@/server/storage";

export const runtime = "nodejs";

/** Local-dev stand-in for R2 presigned URLs. 404s everywhere else. */
const gone = () => new NextResponse("Not found", { status: 404 });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!usingDevStorage()) return gone();
  const t = readDevToken((await params).token);
  if (!t || (t.op !== "put" && t.op !== "part") || !req.body) return new NextResponse("Bad token", { status: 403 });
  const target = t.op === "part" ? devPartPath(t.key, t.uploadId!, t.part!) : devPath(t.key);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await pipeline(Readable.fromWeb(req.body as never), fs.createWriteStream(target));
  const etag = `"${path.basename(target)}"`;
  return new NextResponse(null, { status: 200, headers: { ETag: etag, "Access-Control-Expose-Headers": "ETag" } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!usingDevStorage()) return gone();
  const t = readDevToken((await params).token);
  if (!t || t.op !== "get") return new NextResponse("Bad token", { status: 403 });
  const file = devPath(t.key);
  const stat = await fsp.stat(file).catch(() => null);
  if (!stat) return gone();
  const disposition = t.inline ? "inline" : `attachment; filename*=UTF-8''${encodeURIComponent(t.fn ?? "download")}`;
  return new NextResponse(Readable.toWeb(fs.createReadStream(file)) as never, {
    headers: {
      "Content-Type": t.inline ? (t.ct ?? "application/octet-stream") : "application/octet-stream",
      "Content-Length": String(stat.size),
      "Content-Disposition": disposition,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
