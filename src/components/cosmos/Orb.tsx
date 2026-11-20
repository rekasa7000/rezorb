import { useId } from "react";

/** The Rezorb glyph: an orb with a tilted ring that crosses in front on the lower half. */
export function Orb({ size = 32, ring = "var(--plasma)", className }: { size?: number; ring?: string; className?: string }) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Rezorb"
      className={className}
    >
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

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display inline-flex items-center text-xl font-black tracking-[-0.04em] ${className}`}>
      <span>REZ</span>
      <Orb size={22} className="-mx-0.5 translate-y-px" />
      <span>RB</span>
    </span>
  );
}
