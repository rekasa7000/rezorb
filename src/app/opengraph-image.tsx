import { ImageResponse } from "next/og";

export const alt = "Rezorb: throw it into space, catch it on the other side";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72,
          background: "radial-gradient(120% 80% at 10% 0%, #ff3db8 0%, transparent 55%), radial-gradient(90% 70% at 100% 20%, #8b5cff 0%, transparent 60%), #07040f",
          color: "#f5f1ff",
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: -2 }}>REZORB</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 118, fontWeight: 900, lineHeight: 0.92, textTransform: "uppercase", letterSpacing: -4 }}>Throw it into space.</div>
          <div style={{ fontSize: 40, marginTop: 24, color: "#b9b0d9" }}>Catch it on the other side.</div>
        </div>
      </div>
    ),
    size,
  );
}
