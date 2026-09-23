import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Ugochukwu Chukwu Christian — I build digital products people actually use.";

export default function OpengraphImage() {
  const line = "rgba(255,255,255,0.06)";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#050608",
          backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px), radial-gradient(circle at 85% 10%, rgba(61,107,255,0.35), transparent 45%)`,
          backgroundSize: "56px 56px, 56px 56px, 100% 100%",
          color: "#eceef3",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: "#979dab" }}>
          <div style={{ width: 12, height: 12, borderRadius: 12, background: "#34d399" }} />
          Ugochukwu.dev
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02, maxWidth: 980 }}>
            I build digital products people actually use.
          </div>
          <div style={{ marginTop: 32, fontSize: 30, color: "#7c9bff" }}>
            {SITE_NAME} · Software Engineer & Product Builder
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
