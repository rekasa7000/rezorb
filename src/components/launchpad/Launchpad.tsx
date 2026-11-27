"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { UnlockPanel } from "@/components/space/UnlockGate";
import { CreateSpaceDialog } from "./CreateSpaceDialog";
import { Button } from "@/components/ui/Button";
import { relativeTime } from "@/lib/format";
import type { SpaceDTO } from "@/lib/dto";

/**
 * Launchpad: a utility screen, so it is composed like one. Entering a Space (the primary task) is on
 * the left; the Spaces you already have are a plain ruled list on the right, each led by its accent.
 */
export function Launchpad({ initialSpaces, initialName = "" }: { initialSpaces: SpaceDTO[]; initialName?: string }) {
  const router = useRouter();
  const [spaces] = useState(initialSpaces);
  const [prefill, setPrefill] = useState(initialName);
  const [createOpen, setCreateOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <main id="main" className="mx-auto max-w-5xl px-4 pb-24 sm:px-8">
      <h1 className="font-display pt-4 text-4xl font-extrabold sm:pt-8 sm:text-6xl">Where to?</h1>

      <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-16">
        <section aria-labelledby="enter-h">
          <h2 id="enter-h" className="fs-micro mb-4 text-moondust">
            Enter a Space
          </h2>
          <div className="panel p-5">
            <UnlockPanel
              key={formKey}
              nameEditable
              initialName={prefill}
              onUnlocked={(slug) => {
                router.push(`/s/${slug}`);
                router.refresh();
              }}
            />
          </div>
        </section>

        <section aria-labelledby="spaces-h">
          <h2 id="spaces-h" className="fs-micro mb-4 text-moondust">
            Your Spaces
          </h2>
          {spaces.length === 0 ? (
            <div className="border-y border-line py-10">
              <p className="font-display text-xl font-extrabold">No Spaces yet.</p>
              <p className="mt-2 max-w-sm text-moondust">A Space is a private place to drop things between your devices. Give it a name and a PIN.</p>
              <Button className="mt-6" onClick={() => setCreateOpen(true)} data-testid="create-first">
                <Plus size={16} aria-hidden /> Create your first Space
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {spaces.map((s) => (
                <li key={s.id} data-accent={s.accent}>
                  <button
                    onClick={() => {
                      setPrefill(s.name);
                      setFormKey((k) => k + 1);
                      if (s.unlockedHere) router.push(`/s/${s.slug}`);
                    }}
                    className="group flex w-full items-center gap-4 py-4 pr-2 text-left hover:bg-hull/50"
                    data-testid="space-card"
                  >
                    <span aria-hidden className="h-10 w-1 shrink-0 bg-accent" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-lg font-bold">{s.name}</span>
                      <span className="block text-sm text-moondust">
                        {s.dropCount === 0 ? "Empty" : `${s.dropCount} in orbit`}, last active {relativeTime(s.lastActivityAt)}
                      </span>
                    </span>
                    <span className={`shrink-0 text-sm ${s.unlockedHere ? "text-aurora" : "text-dim"}`}>{s.unlockedHere ? "Open here" : "PIN needed"}</span>
                    <ArrowRight size={18} aria-hidden className="shrink-0 text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-starlight" />
                  </button>
                </li>
              ))}
              <li>
                <button onClick={() => setCreateOpen(true)} className="flex w-full items-center gap-3 py-4 text-left font-bold text-moondust hover:text-starlight" data-testid="create-space">
                  <Plus size={18} aria-hidden /> New Space
                </button>
              </li>
            </ul>
          )}
        </section>
      </div>

      <CreateSpaceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(slug) => {
          setCreateOpen(false);
          router.push(`/s/${slug}`);
          router.refresh();
        }}
      />
    </main>
  );
}
