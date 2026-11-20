"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PinKeypad } from "./PinKeypad";
import { api, ApiRequestError } from "@/lib/api-client";
import { ACCENTS, LIFETIMES, type Accent, type Lifetime } from "@/lib/limits";
import { pinProblem, PIN_MESSAGES } from "@/lib/pin-rules";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  space: { id: string; name: string; accent: Accent; defaultLifetime: Lifetime };
  onChanged: (s: { name: string; accent: Accent; defaultLifetime: Lifetime }) => void;
  onDeleted: () => void;
}

export function SpaceSettings({ open, onClose, space, onChanged, onDeleted }: Props) {
  const [name, setName] = useState(space.name);
  const [accent, setAccent] = useState<Accent>(space.accent);
  const [lifetime, setLifetime] = useState<Lifetime>(space.defaultLifetime);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [curPin, setCurPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const problem = newPin.length >= 6 ? pinProblem(newPin) : null;

  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    setNameError(null);
    try {
      await api(`/api/spaces/${space.id}`, { method: "PATCH", body: { name, accent, defaultLifetime: lifetime } });
      onChanged({ name: name.trim(), accent, defaultLifetime: lifetime });
      toast.success("Saved.");
    } catch (e) {
      setNameError(e instanceof ApiRequestError ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function changePin() {
    setPinBusy(true);
    setPinError(null);
    try {
      await api(`/api/spaces/${space.id}/pin`, { body: { currentPin: curPin, newPin } });
      setCurPin("");
      setNewPin("");
      toast.success("PIN changed. Your other devices were locked out.");
    } catch (e) {
      setPinError(e instanceof ApiRequestError ? (e.code === "BAD_CREDENTIALS" ? "Your current PIN is wrong." : e.message) : "Couldn't change the PIN.");
    } finally {
      setPinBusy(false);
    }
  }

  async function del() {
    setDeleting(true);
    try {
      await api(`/api/spaces/${space.id}`, { method: "DELETE", body: { confirmName: confirm } });
      onDeleted();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Couldn't delete.");
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Space settings" className="max-w-lg">
      <div className="space-y-8">
        <section className="space-y-4" aria-labelledby="ss-general">
          <h3 id="ss-general" className="fs-micro text-moondust">General</h3>
          <Field label="Name" error={nameError}>{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />}</Field>
          <fieldset>
            <legend className="fs-micro mb-2 text-moondust">Accent</legend>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((a) => (
                <button key={a} type="button" onClick={() => setAccent(a)} aria-label={a} aria-pressed={accent === a} data-accent={a} className={cn("size-8 rounded-full border-2", accent === a ? "border-starlight ring-2 ring-offset-2 ring-offset-abyss" : "border-void")} style={{ background: "var(--space-accent)", boxShadow: accent === a ? "0 0 0 2px var(--space-accent)" : undefined }} />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="fs-micro mb-2 text-moondust">New Drops live for</legend>
            <div className="flex gap-2">
              {LIFETIMES.map((l) => (
                <button key={l} type="button" onClick={() => setLifetime(l)} aria-pressed={lifetime === l} className={cn("font-mono-cargo h-10 flex-1 rounded-md border-2 text-sm font-semibold", lifetime === l ? "border-nebula bg-nebula/15" : "border-line")}>
                  {l}
                </button>
              ))}
            </div>
          </fieldset>
          <Button onClick={save} disabled={saving || !name.trim()}>Save changes</Button>
        </section>

        <section className="space-y-4" aria-labelledby="ss-pin">
          <h3 id="ss-pin" className="fs-micro text-moondust">Change PIN</h3>
          <p className="text-sm text-dim">Changing it locks this Space on all your other devices.</p>
          <PinKeypad label="Current PIN" value={curPin} onChange={setCurPin} />
          <PinKeypad label="New PIN" value={newPin} onChange={setNewPin} invalid={!!problem} describedBy="np-msg" />
          <p id="np-msg" role="alert" className="min-h-5 text-sm text-redshift">{problem ? PIN_MESSAGES[problem] : pinError}</p>
          <Button variant="secondary" onClick={changePin} disabled={pinBusy || curPin.length < 6 || newPin.length < 6 || !!problem}>Change PIN</Button>
        </section>

        <section className="space-y-3 rounded-lg border-2 border-redshift/60 p-4" aria-labelledby="ss-del">
          <h3 id="ss-del" className="fs-micro text-redshift">Delete this Space</h3>
          <p className="text-sm text-moondust">Everything in it burns up now. Type <strong className="text-starlight">{space.name}</strong> to confirm.</p>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type the Space name to confirm" />
          <Button variant="danger" onClick={del} disabled={deleting || confirm.trim().toLowerCase() !== space.name.toLowerCase()}>Delete Space</Button>
        </section>
      </div>
    </Dialog>
  );
}
