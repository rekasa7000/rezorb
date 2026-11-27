import type { Metadata } from "next";
import { requirePageWho, pageRequest } from "@/server/page-session";
import { listSpaces, toSpaceDTOs } from "@/server/spaces";
import { grantedSpaceIds } from "@/server/grants";
import { AppHeader } from "@/components/launchpad/AppHeader";
import { Launchpad } from "@/components/launchpad/Launchpad";

export const metadata: Metadata = { title: "Where to?" };
export const dynamic = "force-dynamic";

export default async function SpacesPage({ searchParams }: { searchParams: Promise<{ space?: string }> }) {
  const { space } = await searchParams;
  // A name from a link (never a PIN). Bounded and treated as plain text.
  const prefill = typeof space === "string" ? space.trim().slice(0, 40) : "";
  const who = await requirePageWho(prefill ? `/spaces?space=${encodeURIComponent(prefill)}` : "/spaces");
  const [rows, unlocked] = await Promise.all([listSpaces(who.userId), pageRequest().then((r) => grantedSpaceIds(r, who))]);
  const spaces = await toSpaceDTOs(rows, new Set(unlocked));
  return (
    <>
      <AppHeader email={who.email} />
      <Launchpad initialSpaces={spaces} initialName={prefill} />
    </>
  );
}
