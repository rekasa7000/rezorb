import { useId } from "react";

/** The Rezorb glyph: an orb with a tilted ring that crosses in front on the lower half. */
export function Orb({ size = 32, ring = "var(--plasma)", className }: { size?: number; ring?: string; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="Rezorb" className={className}>
      <defs>
        <radialGradient id={`${id}-g`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ff9be0" />
          <stop offset="0.5" stopColor="var(--nebula)" />
          <stop offset="1" stopColor="#5a1fb8" />
        </radialGradient>
        <clipPath id={`${id}-top`}>
          <rect x="0" y="0" width="64" height="34" />
        </clipPath>
        <clipPath id={`${id}-bot`}>
          <rect x="0" y="34" width="64" height="30" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-top)`}>
        <ellipse cx="32" cy="34" rx="29" ry="9" transform="rotate(-18 32 34)" stroke={ring} strokeWidth="4" opacity="0.55" />
      </g>
      <circle cx="32" cy="32" r="17" fill={`url(#${id}-g)`} />
      <g clipPath={`url(#${id}-bot)`}>
        <ellipse cx="32" cy="34" rx="29" ry="9" transform="rotate(-18 32 34)" stroke={ring} strokeWidth="4" />
      </g>
    </svg>
  );
}

/**
 * The wordmark, from the outlined SVGs in /public/brand (built by scripts/brand/build-logo.mjs).
 * Sized in `em`, so the surrounding text-size class (text-xl, text-3xl…) scales it.
 * The light art shows on Dark, the ink art on Daylight (see `.logo-*` in tokens.css).
 */
export function Wordmark({ className = "", editorial = false }: { className?: string; editorial?: boolean }) {
  const base = editorial ? "rezorb-editorial" : "rezorb-wordmark";
  return (
    <span role="img" aria-label="Rezorb" className={`logo inline-flex items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo-dark" src={`/brand/${base}.svg`} alt="" aria-hidden="true" style={{ height: "1.4em", width: "auto" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo-light" src={`/brand/${base}-ink.svg`} alt="" aria-hidden="true" style={{ height: "1.4em", width: "auto" }} />
    </span>
  );
}
