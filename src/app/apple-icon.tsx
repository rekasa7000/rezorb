import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The Rezorb mark on void: ring behind the orb, and the lower half of the ring in front of it. */
export default function AppleIcon() {
  const ring = (top: number) => (
    <div style={{ position: "absolute", left: 14, top, width: 132, height: 44, borderRadius: 999, border: "8px solid #8b5cff", transform: "rotate(-18deg)" }} />
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#07040f" }}>
        <div style={{ position: "relative", display: "flex", width: 160, height: 160 }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 160, height: 160, display: "flex", opacity: 0.55 }}>{ring(58)}</div>
          <div style={{ position: "absolute", left: 41, top: 41, width: 78, height: 78, borderRadius: 999, background: "radial-gradient(circle at 35% 30%, #ff9be0, #ff3db8 50%, #5a1fb8)" }} />
          <div style={{ position: "absolute", left: 0, top: 80, width: 160, height: 80, overflow: "hidden", display: "flex" }}>
            <div style={{ position: "absolute", left: 0, top: -80, width: 160, height: 160, display: "flex" }}>{ring(58)}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
