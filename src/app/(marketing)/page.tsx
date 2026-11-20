import Link from "next/link";
import { Check, X } from "lucide-react";
import { Halftone, Marquee, OrbitLines, Sticker } from "@/components/cosmos/Ornament";
import { Wordmark, Orb } from "@/components/cosmos/Orb";
import { buttonVariants } from "@/components/ui/Button";
import { getPageWho } from "@/server/page-session";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: "01", t: "Open", d: "Make a Space with a name and a PIN. Open it in any browser, on any device. No install." },
  { n: "02", t: "Paste", d: "Ctrl+V anywhere in the Space. Text, an AI answer, a screenshot, a file. It beams up." },
  { n: "03", t: "Catch", d: "It lands on your other device in a blink. One click (or one key) and it's on your clipboard." },
];

const USES = [
  { t: "AI answer → work laptop", d: "Get the response where the AI isn't allowed. Mind your org's rules.", c: "var(--nebula)", r: -2 },
  { t: "Phone photo → desktop", d: "No cable, no email, no ecosystem lock-in.", c: "var(--ion)", r: 1.5 },
  { t: "Snippet → meeting PC", d: "The one command you need, right now.", c: "var(--flare)", r: -1 },
  { t: "Screenshot → anywhere", d: "Paste it in. It's an image on the other side.", c: "var(--aurora)", r: 2 },
];

const COMPARE: Array<[string, boolean, boolean]> = [
  ["Works with nothing installed", true, true],
  ["Lands in under a second", true, false],
  ["Doesn't clutter your inbox or chats", true, false],
  ["Text, images and files in one place", true, true],
  ["Burns up on its own", true, false],
];

export default async function Landing() {
  const who = await getPageWho();
  return (
    <div className="overflow-x-clip">
      <header className="mx-auto flex max-w-[1280px] items-center gap-4 px-4 py-5 sm:px-8">
        <Link href="/" aria-label="Rezorb home" className="text-starlight"><Wordmark editorial className="text-2xl" /></Link>
        <nav className="ml-auto flex items-center gap-2" aria-label="Account">
          {who ? (
            <Link href="/spaces" className={buttonVariants({ size: "md" })}>Open Launchpad</Link>
          ) : (
            <>
              <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "md" })}>Sign in</Link>
              <Link href="/sign-up" className={buttonVariants({ size: "md" })}>Get started</Link>
            </>
          )}
        </nav>
      </header>

      <main id="main">
        <section className="relative mx-auto max-w-[1280px] px-4 pb-24 pt-10 sm:px-8 sm:pt-20">
          <Halftone size={520} color="var(--nebula)" className="absolute -right-40 -top-10 hidden opacity-70 md:block" />
          <Halftone size={300} color="var(--ion)" className="absolute -left-24 top-[28rem] hidden opacity-50 md:block" />
          <OrbitLines className="absolute left-1/2 top-24 w-[120%] -translate-x-1/2" />
          <div className="relative">
            <div className="mb-6 flex flex-wrap gap-3">
              <Sticker rotate={-5}>No install</Sticker>
              <Sticker rotate={3} color="var(--aurora)">PIN locked</Sticker>
              <Sticker rotate={-2} color="var(--ion)">Burns after 24h</Sticker>
            </div>
            <h1 className="fs-mega font-display text-echo" data-echo="Throw it">
              Throw it <span className="font-accent text-grad !normal-case">into space.</span>
            </h1>
            <p className="font-display mt-4 text-[clamp(1.1rem,3vw,2rem)] font-extrabold uppercase tracking-tight text-moondust">Catch it on the other side.</p>
            <p className="mt-6 max-w-xl text-lg text-moondust">
              A private floating Space between your own devices. Paste on your work laptop, copy on your personal one. Text, AI answers, screenshots, files. Nothing to install, no emailing yourself.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href={who ? "/spaces" : "/sign-up"} className={buttonVariants({ size: "xl" })}>
                {who ? "Open your Spaces" : "Make a Space"}
              </Link>
              <Link href="#how" className={buttonVariants({ variant: "secondary", size: "xl" })}>How it works</Link>
            </div>
          </div>
        </section>

        <div className="relative z-10 py-8"><Marquee items={["Paste here", "Copy there", "No email-to-self", "No install", "PIN locked", "Burns on its own"]} /></div>

        <section id="how" className="mx-auto max-w-[1280px] px-4 py-24 sm:px-8">
          <h2 className="fs-display font-display mb-12">Three moves.</h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.n} className="cargo cargo-paper relative p-6" style={{ transform: `rotate(${[-1.2, 0.8, -0.6][i]}deg)`, ["--space-accent" as string]: ["var(--nebula)", "var(--plasma)", "var(--ion)"][i] }}>
                <span aria-hidden="true" className="font-display text-6xl font-black text-ink/60">{s.n}</span>
                <h3 className="font-display -mt-2 text-3xl font-extrabold">{s.t}</h3>
                <p className="mt-3 text-ink/80">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-[1280px] px-4 py-16 sm:px-8">
          <h2 className="fs-display font-display mb-10">Made for <span className="font-accent text-grad">two-laptop</span> people.</h2>
          <ul className="grid gap-6 sm:grid-cols-2">
            {USES.map((u) => (
              <li key={u.t} className="hull relative p-6" style={{ transform: `rotate(${u.r}deg)` }}>
                <span className="sticker absolute -top-3 right-4" style={{ background: u.c }}>use case</span>
                <h3 className="font-display text-xl font-extrabold">{u.t}</h3>
                <p className="mt-2 text-moondust">{u.d}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-24 sm:px-8">
          <h2 className="fs-display font-display mb-8">Why not email yourself?</h2>
          <div className="panel overflow-hidden">
            <table className="w-full text-left text-sm sm:text-base">
              <thead>
                <tr className="border-b border-line text-moondust">
                  <th className="p-4 font-bold"><span className="sr-only">Feature</span></th>
                  <th className="p-4 text-center"><Orb size={26} className="mx-auto" /><span className="sr-only">Rezorb</span></th>
                  <th className="p-4 text-center fs-micro">Email / Teams</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([k, a, b]) => (
                  <tr key={k} className="border-b border-line last:border-0">
                    <th scope="row" className="p-4 font-medium">{k}</th>
                    {[a, b].map((v, i) => (
                      <td key={i} className="p-4 text-center">
                        {v ? <Check className="mx-auto text-aurora" aria-label="Yes" /> : <X className="mx-auto text-redshift" aria-label="No" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-8">
          <h2 className="fs-display font-display mb-6">Straight talk.</h2>
          <ul className="space-y-3 text-moondust">
            <li><strong className="text-starlight">Yours only.</strong> Spaces belong to your account. There&apos;s no sharing with other people, and no public links.</li>
            <li><strong className="text-starlight">Short-lived.</strong> Drops burn after 1 hour, 24 hours or 7 days. You pick. Files are deleted for real.</li>
            <li><strong className="text-starlight">Not for getting around rules.</strong> If this is a work computer, your organization&apos;s data policies still apply.</li>
            <li><strong className="text-starlight">Not end-to-end encrypted yet.</strong> That&apos;s on the roadmap. Don&apos;t send secrets you wouldn&apos;t send through any hosted service.</li>
          </ul>
        </section>

        <section className="relative mx-auto max-w-[1280px] px-4 pb-32 text-center sm:px-8">
          <h2 className="fs-mega font-display !text-[clamp(2.5rem,9vw,7rem)]">Ready<br /><span className="font-accent text-grad !normal-case">for orbit?</span></h2>
          <Link href={who ? "/spaces" : "/sign-up"} className={cn(buttonVariants({ size: "xl" }), "mt-10")}>{who ? "Open your Spaces" : "Make a Space"}</Link>
        </section>
      </main>

      <footer className="border-t border-line px-4 py-8 text-center text-sm text-dim">
        <Wordmark className="text-lg" /> <span className="ml-2">Throw it into space. Catch it on the other side.</span>
      </footer>
    </div>
  );
}
