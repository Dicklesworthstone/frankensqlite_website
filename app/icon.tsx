import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf)",
        borderRadius: "8px",
      }}
    >
      <span
        style={{
          fontSize: "22px",
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
