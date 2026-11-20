"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Halftone } from "./Ornament";
import { usePrefs } from "@/stores/prefs";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

function webglOk(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Landing hero art. The 3D scene runs only when ALL of these hold: not Calm mode, no
 * `prefers-reduced-motion`, a desktop-size viewport, WebGL works, and the device isn't
 * obviously weak. Otherwise (and if the frame rate collapses) the flat halftone planet stays.
 */
export function HeroBackdrop() {
  const { calm, hydrated } = usePrefs();
  const [capable, setCapable] = useState(false);
  const [slow, setSlow] = useState(false);
  const [visible, setVisible] = useState(true);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const cores = navigator.hardwareConcurrency ?? 4;
    const ok = !reduce && desktop && (mem === undefined || mem >= 4) && cores >= 4 && webglOk();
    // Wait for the page to settle so the scene never competes with first paint.
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const start = () => setCapable(ok);
    if (idle) idle(start);
    else setTimeout(start, 400);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting));
    io.observe(el);
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const on = hydrated && !calm && capable && !slow;
  return (
    <div ref={box} aria-hidden="true" className="ornament pointer-events-none absolute inset-x-0 top-0 hidden h-[100svh] min-h-[640px] md:block"
      style={{ maskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)" }} data-testid="hero-backdrop">
      {on ? (
        <div className="absolute inset-0" data-testid="hero-scene">
          <HeroScene active={visible} onSlow={() => setSlow(true)} />
        </div>
      ) : (
        <Halftone size={520} color="var(--nebula)" className="absolute -right-40 -top-10 opacity-70" />
      )}
    </div>
  );
}
