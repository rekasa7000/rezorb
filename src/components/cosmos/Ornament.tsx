/** Flat halftone planet: the fallback for the 3D hero (Calm mode, reduced motion, phones, no WebGL). */
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
