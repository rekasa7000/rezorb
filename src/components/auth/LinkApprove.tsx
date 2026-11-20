"use client";
import Link from "next/link";
import { useState } from "react";
import { Laptop, ShieldAlert, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Wordmark } from "@/components/cosmos/Orb";

interface Info {
  userCode: string;
  label: string;
  kind: string;
  geo: string | null;
  requestedAt: string;
}

async function post<T>(path: string, body: unknown): Promise<{ ok: boolean; data: T & { message?: string } }> {
  const res = await fetch(`/api/auth${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: (await res.json().catch(() => ({}))) as T & { message?: string } };
}

/** Signed-in side of pairing: shows who is asking before approving (SECURITY T5). */
export function LinkApprove({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [info, setInfo] = useState<Info | null>(null);
  const [result, setResult] = useState<"approved" | "denied" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    const r = await post<Info>("/pairing/info", { code });
    setBusy(false);
    if (!r.ok) return setError(r.data.message ?? "That code isn't valid or has expired.");
    setInfo(r.data);
  }

  async function decide(approve: boolean) {
    if (!info) return;
    setBusy(true);
    const r = await post("/pairing/decide", { code: info.userCode, approve });
    setBusy(false);
    if (!r.ok) return setError(r.data.message ?? "Something went wrong.");
    setResult(approve ? "approved" : "denied");
  }

  const Icon = info?.kind === "phone" || info?.kind === "tablet" ? Smartphone : Laptop;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <Link href="/spaces" className="mb-6 text-starlight">
        <Wordmark />
      </Link>
      <div className="panel p-6 sm:p-8">
        <h1 className="font-display text-2xl font-extrabold">Approve a device</h1>

        {result ? (
          <div className="mt-4 space-y-4" role="status">
            <p className="text-moondust">{result === "approved" ? "Approved. That device is signed in now." : "Declined. Nothing was signed in."}</p>
            <Link href="/spaces" className="font-bold underline decoration-nebula decoration-2 underline-offset-4">
              Back to your Spaces
            </Link>
          </div>
        ) : !info ? (
          <form onSubmit={lookup} className="mt-4 space-y-4">
            <Field label="Code from the new device" error={error}>
              {(p) => (
                <Input
                  {...p}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="font-mono-cargo text-center text-2xl tracking-widest"
                />
              )}
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={busy || code.replace(/[^A-Z0-9]/gi, "").length < 8}>
              Continue
            </Button>
          </form>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="hull flex items-center gap-4 p-4">
              <Icon className="shrink-0 text-ion" size={32} strokeWidth={1.5} />
              <div>
                <p className="font-bold">{info.label}</p>
                <p className="text-sm text-moondust">
                  {info.geo ? `${info.geo} · ` : ""}asked {new Date(info.requestedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
            <p className="flex gap-2 rounded-md border border-flare/50 bg-flare/10 p-3 text-sm text-flare">
              <ShieldAlert className="mt-0.5 shrink-0" size={18} />
              Only approve if you are looking at this code on your own screen right now.
            </p>
            {error && <p role="alert" className="text-sm text-redshift">{error}</p>}
            <div className="flex gap-3">
              <Button className="flex-1" size="lg" onClick={() => decide(true)} disabled={busy}>
                Approve
              </Button>
              <Button variant="secondary" className="flex-1" size="lg" onClick={() => decide(false)} disabled={busy}>
                Decline
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
