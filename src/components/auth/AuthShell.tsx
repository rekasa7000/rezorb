import Link from "next/link";
import { Halftone, OrbitLines, Sticker } from "@/components/cosmos/Ornament";
import { Wordmark } from "@/components/cosmos/Orb";

/** Split layout (DESIGN §8.5): nebula panel on the left, form on --abyss on the right. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r-2 border-void lg:block">
        <div className="absolute inset-0 bg-void/30" />
        <Halftone size={520} color="var(--nebula)" className="absolute -left-24 top-10" />
        <Halftone size={300} color="var(--ion)" className="absolute -bottom-16 right-0" />
        <OrbitLines className="absolute left-0 top-1/3 w-full" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="text-starlight">
            <Wordmark className="text-3xl" />
          </Link>
          <div>
            <p className="fs-display font-display text-starlight">
              Throw it <span className="font-accent text-grad">into space.</span>
            </p>
            <p className="mt-4 max-w-sm text-lg text-moondust">Catch it on the other side.</p>
            <div className="mt-8 flex gap-3">
              <Sticker rotate={-6}>No install</Sticker>
              <Sticker rotate={4} color="var(--aurora)">PIN locked</Sticker>
            </div>
          </div>
        </div>
      </aside>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="panel w-full max-w-md p-6 sm:p-8">
          <Link href="/" className="mb-6 block text-starlight lg:hidden">
            <Wordmark />
          </Link>
          <h1 className="font-display text-3xl font-extrabold">{title}</h1>
          <p className="mt-2 text-moondust">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <div className="mt-6 border-t border-line pt-4 text-sm text-moondust">{footer}</div>
        </div>
      </section>
    </main>
  );
}
