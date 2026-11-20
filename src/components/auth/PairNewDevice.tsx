"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { Button } from "@/components/ui/Button";

interface Pairing {
  userCode: string;
  secret: string;
  expiresAt: string;
}

/** New-device side of pairing (DESIGN §8.5, ARCHITECTURE §4.7). */
export function PairNewDevice() {
  const router = useRouter();
  const [p, setP] = useState<Pairing | null>(null);
  const [state, setState] = useState<"starting" | "waiting" | "denied" | "expired" | "error">("starting");
  const [origin, setOrigin] = useState("");
  const cancelled = useRef(false);

  const start = useCallback(async () => {
    setState("starting");
    setP(null);
    try {
      const res = await fetch("/api/auth/pairing/start", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      if (!res.ok) throw new Error();
      setP((await res.json()) as Pairing);
      setState("waiting");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    cancelled.current = false;
    void start();
    return () => {
      cancelled.current = true;
    };
  }, [start]);

  useEffect(() => {
    if (!p || state !== "waiting") return;
    const id = setInterval(async () => {
      if (cancelled.current) return;
      if (new Date(p.expiresAt).getTime() < Date.now()) return setState("expired");
      try {
        const res = await fetch("/api/auth/pairing/poll", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userCode: p.userCode, secret: p.secret }),
        });
        if (!res.ok) return;
        const { status } = (await res.json()) as { status: string };
        if (status === "approved") {
          clearInterval(id);
          router.push("/spaces");
          router.refresh();
        } else if (status === "denied") setState("denied");
        else if (status === "expired") setState("expired");
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => clearInterval(id);
  }, [p, state, router]);

  const linkUrl = p ? `${origin}/link?code=${p.userCode}` : "";

  return (
    <AuthShell
      title="Sign in with a code"
      subtitle="No password on this device. Approve it from one you're already signed in on."
      footer={
        <Link href="/sign-in" className="font-bold text-starlight underline decoration-nebula decoration-2 underline-offset-4">
          Use a password instead
        </Link>
      }
    >
      {state === "waiting" && p && (
        <div className="space-y-5">
          <div className="hull p-5 text-center">
            <p className="fs-micro text-moondust">Your code</p>
            <p
              aria-label={`Code ${p.userCode.split("").join(" ")}`}
              className="font-mono-cargo mt-1 select-all text-[2.6rem] font-semibold leading-tight tracking-widest text-starlight sm:text-5xl"
              data-testid="pair-code"
            >
              {p.userCode}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-md bg-paper p-2">
              <QRCodeSVG value={linkUrl} size={104} bgColor="#fffcf5" fgColor="#14101f" />
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-moondust">
              <li>On a device that&apos;s signed in, open <strong className="text-starlight">{origin.replace(/^https?:\/\//, "")}/link</strong>.</li>
              <li>Enter this code, or scan the QR.</li>
              <li>Tap approve. This page signs in by itself.</li>
            </ol>
          </div>
          <p className="flex items-center gap-2 text-sm text-dim" role="status">
            <span className="size-2 animate-pulse rounded-full bg-ion" /> Waiting for approval…
          </p>
        </div>
      )}
      {state === "starting" && <p role="status" className="text-moondust">Making a code…</p>}
      {(state === "expired" || state === "denied" || state === "error") && (
        <div className="space-y-4" role="alert">
          <p className="text-moondust">
            {state === "denied" ? "That request was declined." : state === "expired" ? "That code expired." : "Couldn't make a code. Try again in a moment."}
          </p>
          <Button onClick={start}>
            <RefreshCw size={16} /> New code
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
