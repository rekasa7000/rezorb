import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPageWho } from "@/server/page-session";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage() {
  if (await getPageWho()) redirect("/spaces");
  return <SignUpForm />;
}
