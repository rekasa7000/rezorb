"use client";
import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PinKeypad } from "@/components/space/PinKeypad";
import { api, ApiRequestError } from "@/lib/api-client";
import { ACCENTS, LIFETIMES, type Accent, type Lifetime } from "@/lib/limits";
import { PIN_MESSAGES, pinProblem } from "@/lib/pin-rules";
import { cn } from "@/lib/cn";

export function CreateSpaceDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (slug: string) => void }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [accent, setAccent] = useState<Accent>("nebula");
  const [lifetime, setLifetime] = useState<Lifetime>("24h");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problem = pin.length >= 6 ? pinProblem(pin) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { space } = await api<{ space: { slug: string } }>("/api/spaces", { body: { name, pin, accent, defaultLifetime: lifetime } });
      onCreated(space.slug);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't create the Space.");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create a Space">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Name" hint="You'll type this plus the PIN to get in.">
          {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Work swap" autoComplete="off" data-testid="new-space-name" />}
        </Field>
        <div>
          <PinKeypad label="PIN (6–8 digits)" value={pin} onChange={setPin} invalid={!!problem} describedBy="pin-problem" />
          <p id="pin-problem" role="alert" className="mt-2 min-h-5 text-sm text-redshift">{problem ? PIN_MESSAGES[problem] : ""}</p>
        </div>
        <fieldset>
          <legend className="fs-micro mb-2 text-moondust">Accent</legend>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <button key={a} type="button" onClick={() => setAccent(a)} aria-label={a} aria-pressed={accent === a} data-accent={a} className="size-8 rounded-full border-2 border-void" style={{ background: "var(--space-accent)", boxShadow: accent === a ? "0 0 0 3px var(--starlight)" : undefined }} />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="fs-micro mb-2 text-moondust">New Drops live for</legend>
          <div className="flex gap-2">
            {LIFETIMES.map((l) => (
              <button key={l} type="button" onClick={() => setLifetime(l)} aria-pressed={lifetime === l} className={cn("font-mono-cargo h-10 flex-1 rounded-xl border-2 text-sm font-semibold", lifetime === l ? "border-nebula bg-nebula/15" : "border-line")}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-redshift">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy || !name.trim() || pin.length < 6 || !!problem} data-testid="create-space-submit">
          {busy ? "Launching…" : "Launch Space"}
        </Button>
      </form>
    </Dialog>
  );
}
