import { NextResponse } from "next/server";
import { api } from "@/server/http";
import { requireSpace } from "@/server/access";
import { clearGrantCookie, revokeGrantsForDevice } from "@/server/grants";

export const runtime = "nodejs";

export const POST = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const { who, space } = await requireSpace(req, id);
  await revokeGrantsForDevice(space.id, who.deviceId);
  const res = new NextResponse(null, { status: 204 });
  clearGrantCookie(res, space.id);
  return res;
});
