import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPageWho } from "@/server/page-session";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage() {
  if (await getPageWho()) redirect("/settings");
  return <ForgotPasswordForm />;
}
