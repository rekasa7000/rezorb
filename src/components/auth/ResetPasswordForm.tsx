"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "./AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({ token, linkError }: { token: string | null; linkError: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tooShort = password.length > 0 && password.length < 10;

  if (linkError || !token) {
    return (
      <AuthShell
        title="That link didn't work"
        subtitle="Reset links work once and expire after an hour."
        footer={<Link href="/sign-in" className="font-bold text-starlight underline decoration-nebula decoration-2 underline-offset-4">Back to sign in</Link>}
      >
        <Link href="/forgot-password" className="font-bold underline decoration-nebula decoration-2 underline-offset-4">
          Send a new link
        </Link>
      </AuthShell>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setError("Use at least 10 characters.");
    setBusy(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! });
    setBusy(false);
    if (error) return setError(error.message ?? "That link expired. Ask for a new one.");
    router.push("/sign-in?reset=1");
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="You'll be signed out everywhere else, so any device you don't recognize loses access."
      footer={<Link href="/sign-in" className="font-bold text-starlight underline decoration-nebula decoration-2 underline-offset-4">Back to sign in</Link>}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="New password" hint="At least 10 characters. A passphrase works well." error={tooShort ? "A bit longer, please (10+ characters)." : error}>
          {(p) => <Input {...p} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={busy || !password}>
          {busy ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthShell>
  );
}
