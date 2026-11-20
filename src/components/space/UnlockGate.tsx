"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PinKeypad } from "./PinKeypad";
import { api, ApiRequestError } from "@/lib/api-client";
import { Coordinates } from "@/components/cosmos/Ornament";

/** The PIN screen (DESIGN §9.4) with attempts-left, shake and a live lockout countdown. */
export function UnlockPanel({ name, onUnlocked, nameEditable = false, initialName = "" }: { name?: string; onUnlocked: (slug: string) => void; nameEditable?: boolean; initialName?: string }) {
  const [spaceName, setSpaceName] = useState(name ?? initialName);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [sealedUntil, setSealedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!sealedUntil) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= sealedUntil) {
        setSealedUntil(null);
        setError(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [sealedUntil]);

  const sealed = sealedUntil !== null && sealedUntil > now;
  const remaining = sealed ? Math.ceil((sealedUntil! - now) / 1000) : 0;
  const mmss = `${String(Math.floor(remaining / 3600)).padStart(2, "0")}:${String(Math.floor((remaining % 3600) / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  async function submit() {
    if (busy || sealed || pin.length < 6 || !spaceName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { space } = await api<{ space: { slug: string } }>("/api/spaces/unlock", { body: { name: spaceName.trim(), pin } });
      onUnlocked(space.slug);
    } catch (e) {
      setPin("");
      setShake((s) => s + 1);
      if (e instanceof ApiRequestError) {
        if (e.code === "SPACE_SEALED") {
          setSealedUntil(new Date(String(e.details?.until)).getTime());
          setNow(Date.now());
          setError("Too many tries. This Space is sealed.");
        } else if (e.code === "BAD_CREDENTIALS") {
          const left = e.details?.attemptsLeft;
          setError(typeof left === "number" ? `That PIN didn't open this Space. ${left} ${left === 1 ? "try" : "tries"} left.` : "That name and PIN didn't open a Space.");
        } else if (e.code === "RATE_LIMITED") setError("Slow down a little, then try again.");
        else setError(e.message);
      } else setError("Couldn't reach Rezorb. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-5"
    >
      {nameEditable && (
        <div className="space-y-1.5">
          <label htmlFor="space-name" className="fs-micro block text-moondust">Space name</label>
          <input
            id="space-name"
            value={spaceName}
            onChange={(e) => setSpaceName(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            data-testid="space-name-input"
            className="h-12 w-full rounded-[14px] border-2 border-line bg-hull px-4 text-starlight placeholder:text-dim focus:border-nebula focus:outline-none"
            placeholder="e.g. Work swap"
          />
        </div>
      )}
      <div key={shake}>
        <PinKeypad value={pin} onChange={setPin} onSubmit={submit} disabled={busy || sealed} shake={shake > 0} invalid={!!error} describedBy="unlock-msg" autoFocus={!nameEditable || !!spaceName} />
      </div>
      <div id="unlock-msg" role="alert" aria-live="assertive" className="min-h-6 text-center text-sm">
        {error && <p className={sealed ? "text-redshift" : "text-redshift"}>{error}</p>}
        {sealed && (
          <p className="font-mono-cargo mt-1 text-2xl font-semibold text-redshift" data-testid="seal-countdown">
            {mmss}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={busy || sealed || pin.length < 6 || !spaceName.trim()} data-testid="enter-space">
        <Lock size={18} aria-hidden /> {busy ? "Opening…" : "Enter"}
      </Button>
    </form>
  );
}

export function UnlockGate({ spaceName, spaceId }: { spaceName: string; spaceId: string }) {
  const router = useRouter();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <div className="panel relative p-6 sm:p-8">
        <Coordinates seed={spaceId} className="absolute right-4 top-3" />
        <p className="fs-micro text-moondust">Locked Space</p>
        <h1 className="font-display mt-1 break-words text-3xl font-extrabold">{spaceName}</h1>
        <p className="mb-6 mt-2 text-moondust">Enter its PIN to open it on this device.</p>
        <UnlockPanel name={spaceName} onUnlocked={() => router.refresh()} />
      </div>
    </main>
  );
}
