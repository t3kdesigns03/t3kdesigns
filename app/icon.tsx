import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05030a",
          color: "#cbb6ff",
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "-0.06em",
          borderRadius: 14,
          boxShadow: "inset 0 0 0 2px rgba(203,182,255,0.22)",
        }}
      >
        T3K
      </div>
    ),
    size,
  );
}
