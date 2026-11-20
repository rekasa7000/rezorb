import type { CSSProperties } from "react";

/** Decorative only; hidden in Calm mode via `.ornament`. */
export function Sticker({
  children,
  color = "var(--flare)",
  rotate = 0,
  className = "",
}: {
  children: React.ReactNode;
  color?: string;
  rotate?: number;
  className?: string;
}) {
  const style: CSSProperties = { background: color, transform: `rotate(${rotate}deg)` };
  return (
    <span className={`sticker ornament ${className}`} style={style} aria-hidden="true">
      {children}
    </span>
  );
}

export function OrbitLines({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 200" className={`ornament pointer-events-none ${className}`} fill="none">
      <ellipse cx="200" cy="100" rx="190" ry="60" stroke="var(--plasma)" strokeOpacity="0.35" transform="rotate(-12 200 100)" />
      <ellipse cx="200" cy="100" rx="150" ry="42" stroke="var(--ion)" strokeOpacity="0.25" transform="rotate(8 200 100)" />
    </svg>
  );
}

export function Halftone({ size = 360, color = "var(--nebula)", className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`ornament pointer-events-none rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `radial-gradient(${color} 28%, transparent 30%)`,
        backgroundSize: "14px 14px",
        WebkitMaskImage: "radial-gradient(circle at 35% 30%, #000 0%, #000 40%, transparent 72%)",
        maskImage: "radial-gradient(circle at 35% 30%, #000 0%, #000 40%, transparent 72%)",
      }}
    />
  );
}

/** Fake telemetry derived from an id: pure flavor (DESIGN §5.2). */
export function Coordinates({ seed, className = "" }: { seed: string; className?: string }) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const ra = `${h % 24}h ${(h >>> 5) % 60}m`;
  const dec = `${h % 2 ? "+" : "−"}${(h >>> 9) % 90}° ${(h >>> 3) % 60}′`;
  return (
    <span aria-hidden="true" className={`ornament font-mono-cargo text-[10px] tracking-wider text-dim ${className}`}>
      RA {ra} · DEC {dec}
    </span>
  );
}

export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div
      className="marquee overflow-hidden border-y-2 border-void bg-flare py-3 text-void"
      style={{ transform: "rotate(-2deg) scale(1.04)" }}
      aria-hidden="true"
    >
      <div className="font-display flex w-max gap-8 whitespace-nowrap text-lg font-black uppercase" style={{ animation: "marquee 28s linear infinite" }}>
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-8">
            {t} <span>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
