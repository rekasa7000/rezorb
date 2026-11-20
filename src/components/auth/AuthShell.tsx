import Link from "next/link";
import { Wordmark } from "@/components/cosmos/Orb";

/**
 * Auth layout: a brand panel on the left (type and the mark, nothing else) and the form set
 * straight on the page on the right. The form isn't boxed; the page is the container.
 */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden border-r border-line bg-abyss lg:block">
        <div className="flex h-full flex-col p-12">
          <Link href="/" className="text-starlight" aria-label="Rezorb home">
            <Wordmark className="text-xl" />
          </Link>
          {/* The mark fills whatever height is left over, so it can never sit behind the headline. */}
          <div className="relative my-8 min-h-0 flex-1" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/rezorb-mark.svg" alt="" className="ornament absolute inset-0 h-full w-full object-contain object-left" />
          </div>
          <div>
            <p className="font-display text-5xl font-extrabold leading-[1.02] xl:text-6xl">
              Throw it <span className="font-accent text-grad font-normal">into space.</span>
            </p>
            <p className="mt-5 max-w-sm text-lg text-moondust">Catch it on the other side.</p>
          </div>
        </div>
      </aside>

      <section className="flex items-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 block text-starlight lg:hidden" aria-label="Rezorb home">
            <Wordmark className="text-xl" />
          </Link>
          <h1 className="font-display text-3xl font-extrabold">{title}</h1>
          <p className="mt-2 text-moondust">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 border-t border-line pt-5 text-sm text-moondust">{footer}</div>
        </div>
      </section>
    </main>
  );
}
