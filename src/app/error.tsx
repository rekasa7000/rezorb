"use client";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center" role="alert">
      <div>
        <h1 className="fs-display font-display">Something broke.</h1>
        <p className="mx-auto mt-4 max-w-sm text-moondust">That one&apos;s on us. Nothing you beamed was lost. Try again.</p>
        <Button className="mt-8" size="lg" onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
