import { Starfield } from "./Starfield";

/** Layers 0–3 of DESIGN §5: void → starfield → nebula → grain. All decorative. */
export function CosmosLayers() {
  return (
    <div aria-hidden="true" className="cosmos grain pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <Starfield />
      <div
        className="absolute -inset-[10%]"
        style={{
          background: "var(--grad-nebula)",
          opacity: "var(--nebula-opacity)",
          animation: "nebula-drift 60s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-0 hidden [:root[data-theme='light']_&]:block"
        style={{
          backgroundImage: "radial-gradient(var(--line) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
    </div>
  );
}
