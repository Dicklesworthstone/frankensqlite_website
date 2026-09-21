import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf)",
        borderRadius: "40px",
      }}
    >
      <span
        style={{
          fontSize: "120px",
          fontWeight: 900,
          color: "black",
          display: "flex",
        }}
      >
        F
      </span>
    </div>,
    { ...size },
  );
}
