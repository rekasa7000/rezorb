import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="fs-micro text-moondust">404</p>
        <h1 className="fs-display font-display mt-2">Lost in space.</h1>
        <p className="mx-auto mt-4 max-w-sm text-moondust">That page isn&apos;t here. If it was a Space, it may have been deleted, or it isn&apos;t yours.</p>
        <Link href="/spaces" className={buttonVariants({ size: "lg" }) + " mt-8"}>Back to your Spaces</Link>
      </div>
    </main>
  );
}
