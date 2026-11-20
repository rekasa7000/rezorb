"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Fingerprint, Mail, QrCode } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "./AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { authClient } from "@/lib/auth-client";

export function SignInForm({ next, urlError }: { next: string; urlError?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "password" | "magic" | "passkey">(null);
  const [error, setError] = useState<string | null>(urlError ? "That sign-in link didn't work. Ask for a new one." : null);
  const [needsVerify, setNeedsVerify] = useState(false);

  async function onPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy("password");
    setError(null);
    const { error } = await authClient.signIn.email({ email, password });
    setBusy(null);
    if (error) {
      if (error.status === 403) {
        setNeedsVerify(true);
        setError("Confirm your email first. We sent you a link.");
      } else setError(error.message ?? "Wrong email or password.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function onMagic() {
    if (!email) return setError("Enter your email first.");
    setBusy("magic");
    setError(null);
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: next });
    setBusy(null);
    if (error) return setError(error.message ?? "Couldn't send the link.");
    toast.success("Link sent. Check your email.");
  }

  async function onPasskey() {
    setBusy("passkey");
    setError(null);
    const res = await authClient.signIn.passkey();
    setBusy(null);
    if (res?.error) return setError(res.error.message ?? "No passkey worked. Try another way.");
    router.push(next);
    router.refresh();
  }

  async function resend() {
    await authClient.sendVerificationEmail({ email, callbackURL: next });
    toast.success("Sent again.");
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in, then enter a Space with its name and PIN."
      footer={
        <p>
          New here?{" "}
          <Link href="/sign-up" className="font-bold text-starlight underline decoration-nebula decoration-2 underline-offset-4">
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={onPassword} className="space-y-4" noValidate>
        <Field label="Email">
          {(p) => <Input {...p} type="email" autoComplete="username webauthn" value={email} onChange={(e) => setEmail(e.target.value)} required />}
        </Field>
        <Field label="Password">
          {(p) => <Input {...p} type="password" autoComplete="current-password webauthn" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        {error && (
          <p role="alert" className="rounded-xl border border-redshift/50 bg-redshift/10 px-3 py-2 text-sm text-redshift">
            {error}{" "}
            {needsVerify && (
              <button type="button" className="font-bold underline" onClick={resend}>
                Resend
              </button>
            )}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy !== null || !email || !password}>
          {busy === "password" ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-dim">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      <div className="grid gap-3">
        <Button variant="secondary" onClick={onPasskey} disabled={busy !== null}>
          <Fingerprint size={18} strokeWidth={1.75} /> Use a passkey
        </Button>
        <Button variant="secondary" onClick={onMagic} disabled={busy !== null}>
          <Mail size={18} strokeWidth={1.75} /> Email me a sign-in link
        </Button>
        <Button variant="secondary" onClick={() => router.push("/pair")}>
          <QrCode size={18} strokeWidth={1.75} /> Sign in with a code from another device
        </Button>
      </div>
      <p className="mt-4 text-xs text-dim">
        On a computer you don&apos;t want to type your password on? Use a code. You&apos;ll approve it from a device you&apos;re already signed in on.
      </p>
    </AuthShell>
  );
}
