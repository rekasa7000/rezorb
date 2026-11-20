"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { UnlockPanel } from "@/components/space/UnlockGate";
import { CreateSpaceDialog } from "./CreateSpaceDialog";
import { Halftone, OrbitLines, Coordinates } from "@/components/cosmos/Ornament";
import { relativeTime } from "@/lib/format";
import type { SpaceDTO } from "@/lib/dto";
import { cn } from "@/lib/cn";

export function Launchpad({ initialSpaces }: { initialSpaces: SpaceDTO[] }) {
  const router = useRouter();
  const [spaces] = useState(initialSpaces);
  const [prefill, setPrefill] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <main id="main" className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-8">
      <section className="relative pt-6 sm:pt-12">
        <Halftone size={420} color="var(--plasma)" className="absolute -right-32 -top-20 hidden opacity-60 md:block" />
        <h1 className="fs-mega font-display text-echo relative !text-[clamp(3rem,10vw,8rem)]" data-echo="Where to?">
          Where to?
        </h1>
        <div className="relative mt-8 grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <div className="panel relative p-6">
            <OrbitLines className="absolute -right-10 -top-10 w-64 opacity-60" />
            <h2 className="font-display relative mb-4 text-lg font-extrabold">Enter a Space</h2>
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

          <div>
            <h2 className="fs-micro mb-3 text-moondust">Your Spaces</h2>
            {spaces.length === 0 ? (
              <button onClick={() => setCreateOpen(true)} className="group grid h-full min-h-56 w-full place-items-center rounded-[var(--radius-panel)] border-2 border-dashed border-line p-8 text-center hover:border-nebula" data-testid="create-first">
                <span>
                  <span className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-nebula text-void transition-transform group-hover:scale-110 motion-safe:animate-bounce">
                    <Plus size={28} />
                  </span>
                  <span className="font-display block text-xl font-extrabold">Launch your first Space</span>
                  <span className="mt-1 block text-moondust">Give it a name and a PIN. That&apos;s it.</span>
                </span>
              </button>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {spaces.map((s) => (
                  <li key={s.id}>
                    <button
                      data-accent={s.accent}
                      onClick={() => {
                        setPrefill(s.name);
                        setFormKey((k) => k + 1);
                        if (s.unlockedHere) router.push(`/s/${s.slug}`);
                      }}
                      className="hull group relative flex w-full items-center gap-4 overflow-hidden p-4 text-left transition-transform hover:-translate-y-0.5"
                      data-testid="space-card"
                    >
                      <span
                        aria-hidden
                        className="size-16 shrink-0 rounded-full border-2 border-void"
                        style={{ backgroundImage: "radial-gradient(var(--space-accent) 30%, transparent 32%), radial-gradient(circle at 35% 30%, var(--space-accent), transparent 70%)", backgroundSize: "9px 9px, 100% 100%" }}
                      />
                      <span className="min-w-0">
                        <span className="font-display block truncate text-lg font-extrabold">{s.name}</span>
                        <span className="block text-sm text-moondust">
                          {s.dropCount} in orbit · {relativeTime(s.lastActivityAt)}
                        </span>
                        <span className={cn("fs-micro mt-1 block", s.unlockedHere ? "text-aurora" : "text-dim")}>{s.unlockedHere ? "Open here" : "PIN needed"}</span>
                      </span>
                      <Coordinates seed={s.id} className="absolute right-3 top-2" />
                    </button>
                  </li>
                ))}
                <li>
                  <button onClick={() => setCreateOpen(true)} className="grid h-full min-h-24 w-full place-items-center rounded-[var(--radius-card)] border-2 border-dashed border-line p-4 hover:border-nebula" data-testid="create-space">
                    <span className="flex items-center gap-2 font-bold">
                      <Plus size={20} /> Create a Space
                    </span>
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </section>
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
