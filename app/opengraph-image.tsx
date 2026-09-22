import { ImageResponse } from "next/og";
import { SITE } from "@/lib/theme";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE.name} — ${SITE.sentence}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: "#05030a",
          padding: 76,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(42% 58% at 74% 52%, rgba(255,226,190,0.42) 0%, rgba(124,92,255,0.26) 38%, rgba(5,3,10,0) 72%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(70% 70% at 12% 8%, rgba(192,132,252,0.18) 0%, rgba(5,3,10,0) 62%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <div
            style={{
              fontSize: 22,
              letterSpacing: 8,
              color: "rgba(232,228,255,0.5)",
              display: "flex",
            }}
          >
            T3KDESIGNS · IOWA
          </div>
          <div
            style={{
              fontSize: 82,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: "#e8e4ff",
              display: "flex",
            }}
          >
            A studio in the dark.
          </div>
          <div
            style={{
              fontSize: 46,
              fontWeight: 500,
              letterSpacing: "-0.03em",
              color: "#cbb6ff",
              display: "flex",
            }}
          >
            {SITE.sentence}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
