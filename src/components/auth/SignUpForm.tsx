"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { authClient } from "@/lib/auth-client";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const tooShort = password.length > 0 && password.length < 10;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setError("Use at least 10 characters.");
    setBusy(true);
    setError(null);
    const { data, error } = await authClient.signUp.email({ name: name.trim() || email.split("@")[0]!, email, password, callbackURL: "/spaces" });
    setBusy(false);
    if (error) return setError(error.message ?? "Couldn't create your account.");
    // With email verification on, there's no session yet.
    if (!data?.token) return setSent(true);
    router.push("/spaces");
    router.refresh();
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a confirmation link to ${email}.`}
        footer={<Link href="/sign-in" className="font-bold text-starlight underline decoration-nebula decoration-2 underline-offset-4">Back to sign in</Link>}
      >
        <div className="flex items-center gap-3 rounded-lg border-2 border-aurora bg-aurora/10 p-4 text-sm">
          <MailCheck className="shrink-0 text-aurora" />
          <p>Tap the link and you&apos;ll land in your Launchpad.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Make your account"
      subtitle="Your Spaces live under it. Only you can open them."
      footer={
        <p>
          Already in orbit?{" "}
          <Link href="/sign-in" className="font-bold text-starlight underline decoration-nebula decoration-2 underline-offset-4">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Name (optional)">{(p) => <Input {...p} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="Email">{(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}</Field>
        <Field label="Password" hint="At least 10 characters. A passphrase works well." error={tooShort ? "A bit longer, please (10+ characters)." : null}>
          {(p) => <Input {...p} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
        </Field>
        {error && (
          <p role="alert" className="rounded-md border border-redshift/50 bg-redshift/10 px-3 py-2 text-sm text-redshift">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy || !email || !password}>
          {busy ? "Launching…" : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-xs text-dim">
        Rezorb is for moving your own things between your own devices. If this is a work computer, your organization&apos;s data policies still apply.
      </p>
    </AuthShell>
  );
}
