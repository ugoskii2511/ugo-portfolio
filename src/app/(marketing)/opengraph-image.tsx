import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #05070f 0%, #0d1326 60%, #002366 130%)",
          color: "#e7ebf7",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "linear-gradient(135deg, #5c7cfa, #002366)",
            fontSize: 40,
            fontWeight: 700,
            marginBottom: 32,
          }}
        >
          UC
        </div>
        <div style={{ fontSize: 60, fontWeight: 700, textAlign: "center" }}>{SITE_NAME}</div>
        <div style={{ fontSize: 32, color: "#7b93f0", marginTop: 16 }}>{SITE_TAGLINE}</div>
      </div>
    ),
    { ...size }
  );
}
