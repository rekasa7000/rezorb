import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { space as spaceT } from "@/server/db/schema";
import { pageRequest, requirePageWho } from "@/server/page-session";
import { verifySpaceGrant } from "@/server/grants";
import { listDrops } from "@/server/drops";
import { SpaceView } from "@/components/space/SpaceView";
import { UnlockGate } from "@/components/space/UnlockGate";
import type { Accent } from "@/lib/limits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Space", robots: { index: false } };

export default async function SpacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const who = await requirePageWho(`/s/${slug}`);
  if (!/^[1-9A-HJ-NP-Za-km-z]{6,16}$/.test(slug)) notFound();

  // Only the owner can even learn a Space exists.
  const [s] = await db.select().from(spaceT).where(and(eq(spaceT.slug, slug), eq(spaceT.ownerId, who.userId))).limit(1);
  if (!s) notFound();

  const req = await pageRequest();
  try {
    await verifySpaceGrant(req, who, s.id);
  } catch {
    return <UnlockGate spaceName={s.name} />;
  }

  const { drops } = await listDrops({ spaceId: s.id, deviceId: who.deviceId, limit: 100 });
  return (
    <SpaceView
      space={{ id: s.id, slug: s.slug, name: s.name, accent: s.accent as Accent, defaultLifetime: s.defaultLifetime }}
      initialDrops={drops}
    />
  );
}
