import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPageWho } from "@/server/page-session";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; reset?: string }> }) {
  const { next, error, reset } = await searchParams;
  if (await getPageWho()) redirect(safeNext(next));
  return <SignInForm next={safeNext(next)} urlError={error} justReset={reset === "1"} />;
}

function safeNext(n?: string) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/spaces";
}
