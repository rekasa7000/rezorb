"use client";
import { useEffect, useState } from "react";
import { timeLeft } from "@/lib/format";

/** Circular countdown (DESIGN §9.6): green → amber under 1h → burn gradient under 10m. */
export function BurnRing({ createdAt, expiresAt, size = 20, className = "" }: { createdAt: string; expiresAt: string; size?: number; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  const start = new Date(createdAt).getTime();
  const end = new Date(expiresAt).getTime();
  const left = Math.max(0, end - now);
  const frac = Math.min(1, left / Math.max(end - start, 1));
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const urgent = left < 10 * 60_000;
  const warn = left < 60 * 60_000;
  const color = urgent ? "var(--redshift)" : warn ? "var(--flare)" : "var(--aurora)";
  const label = `Expires in ${timeLeft(expiresAt, now)} (${new Date(expiresAt).toLocaleString()})`;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="font-mono-cargo text-[11px] font-semibold" style={{ color: urgent ? "var(--redshift)" : undefined }}>
        {timeLeft(expiresAt, now)}
      </span>
    </span>
  );
}
