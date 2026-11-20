"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Laptop, Monitor, Smartphone, Tablet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api, ApiRequestError } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import type { DeviceDTO } from "@/lib/dto";
import { relativeTime } from "@/lib/format";
import { usePrefs, type Theme } from "@/stores/prefs";
import { cn } from "@/lib/cn";

const TABS = ["Account", "Devices", "Appearance", "Limits"] as const;
type Tab = (typeof TABS)[number];
const ICON = { laptop: Laptop, desktop: Monitor, phone: Smartphone, tablet: Tablet } as const;

export function SettingsView({ email, name }: { email: string; name: string }) {
  const [tab, setTab] = useState<Tab>("Devices");
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 pb-24 sm:px-8">
      <h1 className="fs-display font-display mb-6">Settings</h1>
      <div role="tablist" aria-label="Settings sections" className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-line bg-hull p-1">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("h-10 flex-1 whitespace-nowrap rounded-md px-4 text-sm font-bold", tab === t ? "bg-nebula text-void" : "text-moondust hover:text-starlight")}>
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="panel p-6">
        {tab === "Account" && <AccountTab email={email} name={name} />}
        {tab === "Devices" && <DevicesTab />}
        {tab === "Appearance" && <AppearanceTab />}
        {tab === "Limits" && <LimitsTab />}
      </div>
    </main>
  );
}

function AccountTab({ email, name }: { email: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function addPasskey() {
    setBusy(true);
    const res = await authClient.passkey.addPasskey({ name: `${navigator.platform || "This device"} passkey` });
    setBusy(false);
    if (res?.error) toast.error(res.error.message ?? "Couldn't add a passkey.");
    else toast.success("Passkey added. You can sign in with it next time.");
  }
  async function everywhere() {
    await authClient.revokeSessions();
    router.push("/sign-in");
    router.refresh();
  }
  return (
    <div className="space-y-6">
      <dl className="space-y-3">
        <div><dt className="fs-micro text-moondust">Name</dt><dd className="text-lg">{name}</dd></div>
        <div><dt className="fs-micro text-moondust">Email</dt><dd className="text-lg">{email}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={addPasskey} disabled={busy}>Add a passkey</Button>
        <Button variant="secondary" onClick={() => router.push("/link")}>Approve a new device</Button>
        <Button variant="danger" onClick={everywhere}>Sign out everywhere</Button>
      </div>
    </div>
  );
}

function DevicesTab() {
  const [devices, setDevices] = useState<DeviceDTO[] | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const load = () => api<{ devices: DeviceDTO[] }>("/api/devices").then((r) => setDevices(r.devices)).catch(() => setDevices([]));
  useEffect(() => void load(), []);

  async function revoke(d: DeviceDTO) {
    if (!confirm(`Sign out "${d.label}" and lock every Space on it?`)) return;
    try {
      await api(`/api/devices/${d.id}`, { method: "DELETE" });
      // Hard navigation on purpose: drop all client state.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (d.current) return void (window.location.href = "/sign-in");
      toast.success("Device revoked.");
      void load();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Couldn't revoke that device.");
    }
  }
  async function saveName(id: string) {
    try {
      await api(`/api/devices/${id}`, { method: "PATCH", body: { label } });
      setRenaming(null);
      void load();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Couldn't rename.");
    }
  }

  if (!devices) return <p className="text-moondust" role="status">Loading…</p>;
  return (
    <div className="space-y-4">
      <p className="text-moondust">Every browser you&apos;ve signed in from. Revoking one signs it out and locks its Spaces right away.</p>
      <ul className="space-y-3">
        {devices.map((d) => {
          const Icon = ICON[d.kind as keyof typeof ICON] ?? Laptop;
          return (
            <li key={d.id} className="hull flex flex-wrap items-center gap-3 p-4" data-testid="device-row">
              <Icon size={24} strokeWidth={1.5} className="text-ion" aria-hidden />
              <div className="min-w-0 flex-1">
                {renaming === d.id ? (
                  <div className="flex gap-2">
                    <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-10" aria-label="Device name" autoFocus />
                    <Button size="md" onClick={() => saveName(d.id)}>Save</Button>
                  </div>
                ) : (
                  <p className="truncate font-bold">
                    {d.label} {d.current && <span className="tag ml-1.5" style={{ background: "var(--aurora)" }}>This device</span>}
                  </p>
                )}
                <p className="text-sm text-moondust">Last seen {relativeTime(d.lastSeenAt)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => (setRenaming(d.id), setLabel(d.label))}>Rename</Button>
              <Button variant="danger" size="sm" onClick={() => revoke(d)}>Revoke</Button>
            </li>
          );
        })}
      </ul>
      <Link href="/link" className="inline-block font-bold underline decoration-nebula decoration-2 underline-offset-4">Pair a new device</Link>
    </div>
  );
}

function AppearanceTab() {
  const { theme, calm, view, set } = usePrefs();
  const themes: Theme[] = ["dark", "light", "system"];
  return (
    <div className="space-y-8">
      <p className="text-sm text-dim">These apply to this device only.</p>
      <fieldset>
        <legend className="fs-micro mb-2 text-moondust">Theme</legend>
        <div className="flex gap-2">
          {themes.map((t) => (
            <button key={t} onClick={() => set({ theme: t })} aria-pressed={theme === t} className={cn("h-11 flex-1 rounded-md border-2 text-sm font-bold capitalize", theme === t ? "border-nebula bg-nebula/15" : "border-line")}>
              {t === "light" ? "Daylight" : t}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex cursor-pointer items-start gap-4">
        <input type="checkbox" checked={calm} onChange={(e) => set({ calm: e.target.checked })} className="mt-1 size-5 accent-[var(--nebula)]" />
        <span>
          <span className="block font-bold">Calm mode</span>
          <span className="text-sm text-moondust">Strips the stars, glow and motion. The same app, quieter. Good for a work laptop.</span>
        </span>
      </label>
      <fieldset>
        <legend className="fs-micro mb-2 text-moondust">Space layout</legend>
        <div className="flex gap-2">
          {(["grid", "float"] as const).map((v) => (
            <button key={v} onClick={() => set({ view: v })} aria-pressed={view === v} className={cn("h-11 flex-1 rounded-md border-2 text-sm font-bold capitalize", view === v ? "border-nebula bg-nebula/15" : "border-line")}>
              {v}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function LimitsTab() {
  const rows: Array<[string, string]> = [
    ["Spaces", "Up to 10"],
    ["Text Drop", "Up to 1 MB"],
    ["File or image Drop", "Up to 50 MB"],
    ["Total in orbit", "1 GB"],
    ["Drops per Space", "500 (oldest unpinned burn first)"],
    ["Lifetimes", "1 hour · 24 hours · 7 days"],
    ["Devices", "Up to 10"],
  ];
  return (
    <dl className="divide-y divide-line">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-3"><dt className="text-moondust">{k}</dt><dd className="font-bold">{v}</dd></div>
      ))}
    </dl>
  );
}
