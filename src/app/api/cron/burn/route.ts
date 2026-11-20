import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { burnExpiredEverywhere } from "@/server/drops";
import { env } from "@/server/env";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = env.cronSecret;
  if (!secret) return false; // never open by default
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No." } }, { status: 401 });
  }
  const t0 = Date.now();
  const { burned, staleUploads } = await burnExpiredEverywhere();
  return NextResponse.json({ burned, staleUploads, durationMs: Date.now() - t0 });
}
