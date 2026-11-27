"use client";
import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setBusy(false);
    // The server answers the same whether or not the account exists, so we never confirm either.
    if (error && error.status === 429) return setError("Too many requests. Wait a minute and try again.");
    setSent(true);
  }

  const back = (
    <Link href="/sign-in" className="font-bold text-starlight underline decoration-nebula decoration-2 underline-offset-4">
      Back to sign in
    </Link>
  );

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle="If an account exists for that address, a reset link is on its way. It works for one hour." footer={back}>
        <div role="status" className="flex items-center gap-3 rounded-md border border-aurora bg-aurora/10 p-4 text-sm">
          <MailCheck className="shrink-0 text-aurora" aria-hidden />
          <p>Nothing arrived after a few minutes? Check spam, or try again.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll send a link to choose a new one." footer={back}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Email" error={error}>
          {(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={busy || !email}>
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthShell>
  );
}
