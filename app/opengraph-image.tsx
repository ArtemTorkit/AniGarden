import { ImageResponse } from "next/og";

export const alt = "AniGarden — Grow a garden full of rare anime characters";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "72px", background: "linear-gradient(135deg, #102318, #020617)", color: "white" }}><div style={{ display: "flex", fontSize: 28, letterSpacing: 8, color: "#bef264", textTransform: "uppercase" }}>AniGarden</div><div style={{ display: "flex", marginTop: 30, fontSize: 68, fontWeight: 800, lineHeight: 1.08, maxWidth: 900 }}>Grow a garden full of rare anime characters.</div><div style={{ display: "flex", marginTop: 28, fontSize: 28, color: "#cbd5e1" }}>Collect · Bloom · Trade</div></div>, { ...size });
}
