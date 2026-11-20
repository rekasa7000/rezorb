"use client";
import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  d: number;
  depth: number;
}

/**
 * Layer 1: twinkling stars with pointer parallax (DESIGN §13).
 * - ~1 star per 9,000px², capped at 30fps
 * - pauses when the tab is hidden
 * - falls back to a still frame if the frame rate stays under 40fps for 3s
 */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars: Star[] = [];
    let raf = 0;
    let last = 0;
    let running = !reduce;
    let px = 0;
    let py = 0;
    let slowSince = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(260, Math.max(60, Math.round((w * h) / 9000)));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.4,
        a: Math.random(),
        d: (Math.random() * 0.02 + 0.005) * (Math.random() < 0.5 ? -1 : 1),
        depth: Math.random() * 0.8 + 0.2,
      }));
      draw();
    };

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const x = (((s.x + px * s.depth * 14) % w) + w) % w;
        const y = (((s.y + py * s.depth * 14) % h) + h) % h;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.15 + s.a * 0.85})`;
        ctx.fill();
      }
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 33) return; // ~30fps cap
      const dt = t - last;
      last = t;
      if (dt > 25 + 33) {
        slowSince ||= t;
        if (t - slowSince > 3000) {
          stop(); // frame budget blown: freeze on a still frame
          return;
        }
      } else slowSince = 0;
      for (const s of stars) {
        s.a += s.d;
        if (s.a > 1 || s.a < 0) s.d *= -1;
      }
      draw();
    };

    const start = () => {
      if (!running || raf) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (running) start();
    };
    const onMove = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth - 0.5) * 2;
      py = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    resize();
    start();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
