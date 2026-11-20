import type { Metadata } from "next";
import { requirePageWho } from "@/server/page-session";
import { LinkApprove } from "@/components/auth/LinkApprove";

export const metadata: Metadata = { title: "Approve a device" };

export default async function LinkPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  await requirePageWho(code ? `/link?code=${encodeURIComponent(code)}` : "/link");
  return <LinkApprove initialCode={code ?? ""} />;
}
