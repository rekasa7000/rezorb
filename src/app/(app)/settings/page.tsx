import type { Metadata } from "next";
import { requirePageWho } from "@/server/page-session";
import { AppHeader } from "@/components/launchpad/AppHeader";
import { SettingsView } from "@/components/launchpad/SettingsView";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const who = await requirePageWho("/settings");
  return (
    <>
      <AppHeader email={who.email} />
      <SettingsView email={who.email} name={who.name} />
    </>
  );
}
