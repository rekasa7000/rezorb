import Link from "next/link";
import { Check, X } from "lucide-react";
import { LandingPreview } from "@/components/marketing/LandingPreview";
import { HeroBackdrop } from "@/components/cosmos/HeroBackdrop";
import { Wordmark, Orb } from "@/components/cosmos/Orb";
import { buttonVariants } from "@/components/ui/Button";
import { getPageWho } from "@/server/page-session";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: "01", t: "Open", d: "Make a Space with a name and a PIN, and open it in any browser on any device. Nothing to install." },
  { n: "02", t: "Paste", d: "Press Ctrl or Command V anywhere in the Space. Text, an AI answer, a screenshot or a file goes up." },
  { n: "03", t: "Catch", d: "It lands on your other device within seconds. One click, or the C key, and it is on your clipboard." },
];

const USES = [
  { t: "An AI answer, on the laptop that can't reach the AI", d: "Mind your organization's rules about what you may move." },
  { t: "A phone photo, on your desktop", d: "No cable, no email, no matching ecosystem." },
  { t: "A command, on the meeting-room PC", d: "The one line you need, right now." },
  { t: "A screenshot, anywhere", d: "Paste it in and it arrives as an image." },
];

const TALK: Array<[string, string]> = [
  ["Yours only", "Spaces belong to your account. There is no sharing with other people and no public links."],
  ["Short-lived", "Drops burn after 1 hour, 24 hours or 7 days. You pick, and files are deleted for real."],
  ["Not a workaround", "If this is a work computer, your organization's data policies still apply."],
  ["Not end-to-end encrypted yet", "That is on the roadmap. Don't send secrets you would not send through any hosted service."],
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
    <div className="relative overflow-x-clip">
      <HeroBackdrop />
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
        <section className="relative mx-auto max-w-[1280px] px-4 pb-24 pt-10 sm:px-8 sm:pb-32 sm:pt-20">
          <div className="relative">
            <h1 className="fs-mega font-display">
              Throw it <span className="font-accent text-grad !normal-case">into space.</span>
            </h1>
            <p className="font-display mt-5 text-[clamp(1.1rem,2.6vw,1.75rem)] font-extrabold uppercase tracking-tight text-moondust">Catch it on the other side.</p>
            <p className="mt-6 max-w-xl text-lg text-moondust">
              A private floating Space between your own devices. Paste on your work laptop, copy on your personal one. Text, AI answers, screenshots and files, with nothing to install.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href={who ? "/spaces" : "/sign-up"} className={buttonVariants({ size: "xl" })}>
                {who ? "Open your Spaces" : "Make a Space"}
              </Link>
              <Link href="#how" className={buttonVariants({ variant: "secondary", size: "xl" })}>How it works</Link>
            </div>
            <p className="font-mono-cargo mt-8 text-sm text-dim">Free to start. Drops burn after 1 hour, 24 hours or 7 days, your choice.</p>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-8 sm:py-20">
            <SectionHead kicker="The product" title="This is a Space." />
            <p className="mt-4 max-w-xl text-moondust">
              Every Drop shows where it came from and when it burns. One tap copies it. These are examples, and they really are copyable.
            </p>
            <div className="mt-10"><LandingPreview /></div>
          </div>
        </section>

        <section id="how" className="border-t border-line">
          <div className="mx-auto grid max-w-[1100px] gap-10 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <SectionHead kicker="How it works" title="Open. Paste. Catch." />
            <ol className="divide-y divide-line border-y border-line">
              {STEPS.map((s) => (
                <li key={s.n} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 py-5">
                  <span className="font-mono-cargo pt-1 text-sm text-dim">{s.n}</span>
                  <div>
                    <h3 className="font-display text-xl font-extrabold">{s.t}</h3>
                    <p className="mt-1 text-moondust">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-8 sm:py-20">
            <SectionHead kicker="Who it's for" title="People with two laptops." />
            <dl className="mt-12 grid gap-x-16 gap-y-10 sm:grid-cols-2">
              {USES.map((u) => (
                <div key={u.t}>
                  <dt className="font-accent text-3xl leading-tight sm:text-4xl">{u.t}</dt>
                  <dd className="mt-3 text-moondust">{u.d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-8 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
              <SectionHead kicker="Compared" title="Why not email yourself?" />
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line text-sm text-moondust">
                  <th scope="col" className="py-3 pr-4 font-medium">What you need</th>
                  <th scope="col" className="w-16 py-3 text-center font-medium sm:w-28">Rezorb</th>
                  <th scope="col" className="w-16 py-3 text-center font-medium sm:w-28">Email</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([k, a, b]) => (
                  <tr key={k} className="border-b border-line">
                    <th scope="row" className="py-4 pr-4 font-normal">{k}</th>
                    {[a, b].map((v, i) => (
                      <td key={i} className="py-4 text-center">
                        {v ? <Check className="mx-auto text-aurora" size={20} aria-label="Yes" /> : <X className="mx-auto text-dim" size={20} aria-label="No" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-8 sm:py-20">
            <SectionHead small kicker="Straight talk" title="What it is and isn't." />
            <dl className="mt-8 max-w-3xl divide-y divide-line border-y border-line">
              {TALK.map(([k, v]) => (
                <div key={k} className="grid gap-1 py-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8">
                  <dt className="font-bold">{k}</dt>
                  <dd className="text-moondust">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto flex max-w-[1100px] flex-wrap items-end justify-between gap-8 px-4 py-24 sm:px-8">
            <h2 className="font-display max-w-xl text-4xl font-extrabold leading-tight sm:text-5xl">
              Ready <span className="font-accent text-grad font-normal">for orbit?</span>
            </h2>
            <Link href={who ? "/spaces" : "/sign-up"} className={buttonVariants({ size: "xl" })}>{who ? "Open your Spaces" : "Make a Space"}</Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-4 py-8 text-sm text-dim">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 sm:px-4">
          <Wordmark className="text-base text-starlight" />
          <span>Throw it into space. Catch it on the other side.</span>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ kicker, title, small }: { kicker: string; title: string; small?: boolean }) {
  return (
    <div>
      <p className="fs-micro text-moondust">{kicker}</p>
      <h2 className={`font-display mt-3 font-extrabold ${small ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl"}`}>{title}</h2>
    </div>
  );
}
