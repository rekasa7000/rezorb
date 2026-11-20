"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Lock, Moon, Settings, Sun, LayoutGrid, Orbit } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Coordinates, OrbitLines } from "@/components/cosmos/Ornament";
import { Constellation } from "./Constellation";
import { DropCard, type DropActions } from "./DropCard";
import { Dock } from "./Dock";
import { CommandPalette, type PaletteAction } from "./CommandPalette";
import { ShortcutsDialog } from "./Shortcuts";
import { SpaceSettings } from "./SpaceSettings";
import { Lightbox } from "./Lightbox";
import { dropsKey, useSpaceFeed } from "@/hooks/useSpaceFeed";
import { useUploads } from "@/hooks/useUploads";
import { usePasteAndDrop } from "@/hooks/usePasteAndDrop";
import { api, ApiRequestError } from "@/lib/api-client";
import { copyImageFromUrl, copyText, isEditable } from "@/lib/clipboard";
import { classifyText } from "@/lib/classify";
import { isTmp, removeDrops, tmpTextDrop, upsertDrop } from "@/lib/drop-cache";
import type { DropDTO } from "@/lib/dto";
import { ACCENTS, LIFETIME_MS, type Accent, type Lifetime } from "@/lib/limits";
import { usePrefs } from "@/stores/prefs";

interface SpaceInfo {
  id: string;
  name: string;
  slug: string;
  accent: Accent;
  defaultLifetime: Lifetime;
}

export function SpaceView({ space: initialSpace, initialDrops }: { space: SpaceInfo; initialDrops: DropDTO[] }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [space, setSpace] = useState(initialSpace);
  const [arrivedIds, setArrivedIds] = useState<Set<string>>(new Set());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lightbox, setLightbox] = useState<DropDTO | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const dockRef = useRef<HTMLTextAreaElement>(null);
  const live = useRef<HTMLParagraphElement>(null);
  const { view, calm, theme, set } = usePrefs();

  const goLocked = useCallback(() => {
    toast("This Space was locked.", { description: "Enter the PIN again to keep going." });
    router.refresh();
  }, [router]);

  const feed = useSpaceFeed(initialDrops, {
    spaceId: space.id,
    onRelocked: goLocked,
    onDeleted: () => {
      toast("That Space was deleted.");
      router.push("/spaces");
    },
    onSpaceUpdated: (s) => setSpace((cur) => ({ ...cur, ...s })),
    onSealed: () => toast.error("This Space was sealed after wrong PIN attempts."),
    onArrived: (d) => {
      setArrivedIds((cur) => new Set(cur).add(d.id));
      setTimeout(() => setArrivedIds((cur) => (cur.delete(d.id), new Set(cur))), 1200);
      if (live.current) live.current.textContent = `New ${d.kind} from ${d.sourceDevice?.label ?? "another device"}`;
      toast(`Docked from ${d.sourceDevice?.label ?? "another device"}.`);
    },
    onDeviceRevoked: () => {
      toast.error("This device was signed out.");
      // Hard navigation on purpose: a revoked device must drop all client state.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/sign-in";
    },
  });

  const visible = useMemo(() => feed.drops.filter((d) => !pendingDeletes.has(d.id)), [feed.drops, pendingDeletes]);

  const putDrop = useCallback((d: DropDTO) => qc.setQueryData<DropDTO[]>(dropsKey(space.id), (prev) => upsertDrop(prev ?? [], d)), [qc, space.id]);
  const uploads = useUploads(space.id, putDrop);

  // ── Beam text (optimistic) ───────────────────────────────────────
  const beamText = useCallback(
    async (text: string) => {
      const clientId = crypto.randomUUID().slice(0, 12);
      const c = classifyText(text);
      qc.setQueryData<DropDTO[]>(dropsKey(space.id), (prev) =>
        upsertDrop(prev ?? [], tmpTextDrop(space.id, clientId, text, c.kind, LIFETIME_MS[space.defaultLifetime])),
      );
      try {
        const { drop } = await api<{ drop: DropDTO }>(`/api/spaces/${space.id}/drops`, { body: { kind: c.kind, language: c.language, text, clientId } });
        qc.setQueryData<DropDTO[]>(dropsKey(space.id), (prev) => upsertDrop(prev ?? [], drop, clientId));
      } catch (e) {
        qc.setQueryData<DropDTO[]>(dropsKey(space.id), (prev) => removeDrops(prev ?? [], [`tmp_${clientId}`]));
        if (e instanceof ApiRequestError && e.code === "SPACE_LOCKED") return goLocked();
        toast.error(e instanceof ApiRequestError ? e.message : "Couldn't beam that. Check your connection.");
      }
    },
    [qc, space.id, space.defaultLifetime, goLocked],
  );

  const onFiles = useCallback((files: File[], o?: { pasted?: boolean }) => uploads.addFiles(files, o), [uploads]);
  const { dragging } = usePasteAndDrop({ enabled: !settingsOpen && !paletteOpen, dockEl: dockRef, onText: beamText, onFiles });

  // ── Drop actions ────────────────────────────────────────────────
  const actions: DropActions = useMemo(
    () => ({
      copy: async (d) => {
        let ok = false;
        if (d.kind === "image") {
          ok = await copyImageFromUrl(`/api/drops/${d.id}/download?inline=1`);
          if (!ok) {
            toast("Your browser can't copy images. Downloading instead.");
            actions.download(d);
            return false;
          }
        } else ok = await copyText(d.text ?? "");
        if (!ok) toast.error("Couldn't reach the clipboard. Select the text and copy it by hand.");
        else toast.success("Copied. Go paste it.");
        return ok;
      },
      download: (d) => {
        const a = document.createElement("a");
        a.href = `/api/drops/${d.id}/download`;
        a.download = d.fileName ?? "download";
        document.body.appendChild(a);
        a.click();
        a.remove();
      },
      open: (d) => setLightbox(d),
      pin: async (d) => {
        try {
          const { drop } = await api<{ drop: DropDTO }>(`/api/drops/${d.id}`, { method: "PATCH", body: { pinned: !d.pinned } });
          putDrop(drop);
          toast(drop.pinned ? "Pinned. It'll stay up to 7 days." : "Unpinned.");
        } catch (e) {
          toast.error(e instanceof ApiRequestError ? e.message : "Couldn't pin that.");
        }
      },
      extend: async (d, l) => {
        try {
          const { drop } = await api<{ drop: DropDTO }>(`/api/drops/${d.id}`, { method: "PATCH", body: { extend: l } });
          putDrop(drop);
          toast("Time added.");
        } catch (e) {
          toast.error(e instanceof ApiRequestError ? e.message : "Couldn't extend that.");
        }
      },
      // The 5-second undo is implemented by delaying the real DELETE (API.md).
      remove: (d) => {
        setPendingDeletes((cur) => new Set(cur).add(d.id));
        let undone = false;
        const timer = setTimeout(async () => {
          if (undone) return;
          try {
            await api(`/api/drops/${d.id}`, { method: "DELETE" });
            qc.setQueryData<DropDTO[]>(dropsKey(space.id), (prev) => removeDrops(prev ?? [], [d.id]));
          } catch {
            toast.error("Couldn't delete that.");
          } finally {
            setPendingDeletes((cur) => (cur.delete(d.id), new Set(cur)));
          }
        }, 5000);
        toast("Deleted.", {
          duration: 5000,
          action: {
            label: "Undo",
            onClick: () => {
              undone = true;
              clearTimeout(timer);
              setPendingDeletes((cur) => (cur.delete(d.id), new Set(cur)));
            },
          },
        });
      },
    }),
    [putDrop, qc, space.id],
  );

  const lock = useCallback(async () => {
    try {
      await api(`/api/spaces/${space.id}/lock`, { body: {} });
    } finally {
      router.push("/spaces");
      router.refresh();
    }
  }, [router, space.id]);

  // ── Keyboard (DESIGN §11) ───────────────────────────────────────
  useEffect(() => {
    const cards = () => Array.from(document.querySelectorAll<HTMLElement>("[data-drop-card]"));
    const focusedDrop = () => {
      const el = (document.activeElement as HTMLElement | null)?.closest?.("[data-drop-card]") as HTMLElement | null;
      return el ? visible.find((d) => d.id === el.dataset.dropId) : undefined;
    };
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") return (e.preventDefault(), setPaletteOpen(true));
      if (mod && e.key.toLowerCase() === "l") return (e.preventDefault(), void lock());
      if (isEditable(e.target) || settingsOpen || paletteOpen || helpOpen || lightbox || mod || e.altKey) return;
      const latest = visible.find((d) => !isTmp(d) && d.status === "ready");
      const f = focusedDrop();
      switch (e.key) {
        case "c":
          if (latest) void actions.copy(latest);
          break;
        case "C":
          set({ calm: !calm });
          break;
        case "j":
        case "ArrowDown": {
          const list = cards();
          const i = list.indexOf(document.activeElement as HTMLElement);
          list[Math.min(list.length - 1, i + 1)]?.focus();
          e.preventDefault();
          break;
        }
        case "k":
        case "ArrowUp": {
          const list = cards();
          const i = list.indexOf(document.activeElement as HTMLElement);
          list[Math.max(0, i - 1)]?.focus();
          e.preventDefault();
          break;
        }
        case "Enter":
          if (f && f.kind !== "file") void actions.copy(f);
          break;
        case "d":
          if (f) actions.download(f);
          break;
        case "p":
          if (f) actions.pin(f);
          break;
        case "Delete":
        case "Backspace":
          if (f) actions.remove(f);
          break;
        case "/":
          e.preventDefault();
          dockRef.current?.focus();
          break;
        case "?":
          setHelpOpen(true);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, actions, lock, calm, set, settingsOpen, paletteOpen, helpOpen, lightbox]);

  const palette: PaletteAction[] = [
    { id: "copy", label: "Copy latest Drop", hint: "C", run: () => visible[0] && actions.copy(visible[0]) },
    { id: "lock", label: "Lock this Space", hint: "Ctrl L", run: lock },
    { id: "calm", label: calm ? "Turn Calm mode off" : "Turn Calm mode on", hint: "⇧C", run: () => set({ calm: !calm }) },
    { id: "view", label: view === "grid" ? "Switch to Float view" : "Switch to Grid view", run: () => set({ view: view === "grid" ? "float" : "grid" }) },
    { id: "settings", label: "Space settings", run: () => setSettingsOpen(true) },
    { id: "spaces", label: "Go to your Spaces", run: () => router.push("/spaces") },
    { id: "help", label: "Keyboard shortcuts", hint: "?", run: () => setHelpOpen(true) },
  ];

  const accent = ACCENTS.includes(space.accent) ? space.accent : "nebula";
  const uploadProgress = (id: string) => uploads.items.find((u) => u.id === id)?.progress;

  return (
    <div data-accent={accent} className="min-h-dvh pb-48">
      <header className="sticky top-0 z-20 border-b-2 border-accent bg-void/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-8">
          <Link href="/spaces" aria-label="Back to your Spaces" className="rounded-lg p-1.5 text-moondust hover:text-starlight">
            <ArrowLeft size={20} strokeWidth={1.75} />
          </Link>
          <div className="min-w-0 flex-1 sm:flex-none">
            <h1 className="font-display flex items-center gap-2 truncate text-lg font-extrabold text-accent sm:text-2xl" data-testid="space-title">
              <span className="truncate">{space.name}</span>
              <span className="size-2.5 shrink-0 rounded-full bg-ion" style={{ opacity: feed.connection === "live" ? 1 : 0.35 }} aria-hidden />
            </h1>
            <Coordinates seed={space.id} className="hidden sm:block" />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-3">
            <Constellation devices={feed.presence} connection={feed.connection} meLabel={feed.connection === "polling" ? "Syncing" : undefined} />
            <span className="fs-micro hidden items-center gap-1 text-moondust md:flex" title="Default lifetime of new Drops">
              <Clock size={14} aria-hidden /> {space.defaultLifetime}
            </span>
            <Button variant="ghost" size="icon" aria-label={view === "grid" ? "Switch to Float view" : "Switch to Grid view"} onClick={() => set({ view: view === "grid" ? "float" : "grid" })} className="hidden md:inline-flex">
              {view === "grid" ? <Orbit size={20} strokeWidth={1.75} /> : <LayoutGrid size={20} strokeWidth={1.75} />}
            </Button>
            <Button variant="ghost" size="icon" aria-label={calm ? "Turn Calm mode off" : "Turn Calm mode on"} aria-pressed={calm} onClick={() => set({ calm: !calm })} className="hidden sm:inline-flex">
              {theme === "light" ? <Sun size={20} strokeWidth={1.75} /> : <Moon size={20} strokeWidth={1.75} />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Space settings" onClick={() => setSettingsOpen(true)} data-testid="space-settings">
              <Settings size={20} strokeWidth={1.75} />
            </Button>
            <Button variant="secondary" size="icon" aria-label="Lock this Space" onClick={lock} data-testid="lock-btn">
              <Lock size={18} strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1280px] px-4 pt-8 sm:px-8">
        <p ref={live} className="sr-only" aria-live="polite" />
        {visible.length === 0 ? (
          <div className="relative mx-auto mt-16 max-w-md text-center">
            <OrbitLines className="absolute -top-20 left-1/2 w-[140%] -translate-x-1/2" />
            <div className="relative">
              <div className="anim-spin-slow mx-auto mb-6 size-24 rounded-full border-4 border-dashed border-accent opacity-80" aria-hidden />
              <h2 className="font-display text-3xl font-extrabold">Nothing in orbit.</h2>
              <p className="mt-3 text-moondust">
                Paste anything (<kbd className="font-mono-cargo rounded border border-line px-1.5">Ctrl/⌘ V</kbd>) or drop a file. It&apos;ll appear on your other devices instantly.
              </p>
            </div>
          </div>
        ) : (
          <div
            role="feed"
            aria-label="Drops in this Space"
            aria-busy={feed.connection === "connecting"}
            className={view === "float" ? "flex flex-wrap items-start justify-center gap-x-8 gap-y-10 py-6" : "columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4 [&>div]:mb-6"}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((d, i) => (
                <div key={d.clientKey ?? d.id} className={view === "float" ? "w-full max-w-sm" : "break-inside-avoid"}>
                  <DropCard drop={d} actions={actions} float={view === "float"} index={i} arrived={arrivedIds.has(d.id)} uploadProgress={uploadProgress(d.id)} />
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <Dock onBeamText={beamText} onFiles={(f) => onFiles(f)} uploads={uploads.items} onRetry={uploads.retry} onCancel={uploads.cancel} textareaRef={dockRef} />

      {dragging && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-void/85 backdrop-blur-sm" data-testid="drop-overlay" aria-hidden>
          <div className="grid place-items-center gap-6 rounded-[3rem] border-4 border-dashed border-nebula p-16">
            <span className="anim-spin-slow size-24 rounded-full border-4 border-dashed border-ion" />
            <p className="fs-mega font-display text-center !text-[clamp(2rem,7vw,5rem)]">Let go to beam</p>
          </div>
        </div>
      )}

      <Lightbox drop={lightbox} onClose={() => setLightbox(null)} onDownload={actions.download} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={palette} />
      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      {settingsOpen && (
        <SpaceSettings
          open
          onClose={() => setSettingsOpen(false)}
          space={space}
          onChanged={(s) => setSpace((cur) => ({ ...cur, ...s }))}
          onDeleted={() => {
            toast("Space deleted.");
            router.push("/spaces");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
