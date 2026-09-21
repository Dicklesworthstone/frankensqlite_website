import { ImageResponse } from "next/og";

export const alt = "FrankenSQLite Spec Evolution Lab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: "#020a05",
        position: "relative",
        overflow: "hidden",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      {/* Grid Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(20, 184, 166, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20, 184, 166, 0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.5,
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at center, transparent 0%, rgba(2, 10, 5, 0.8) 100%)",
        }}
      />

      {/* Top-left Glow */}
      <div
        style={{
          position: "absolute",
          top: "-200px",
          left: "10%",
          width: "800px",
          height: "800px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(20, 184, 166, 0.12) 0%, transparent 70%)",
        }}
      />

      {/* Outer Frame */}
      <div
        style={{
          position: "absolute",
          inset: "20px",
          border: "1px solid rgba(20, 184, 166, 0.1)",
          display: "flex",
        }}
      />

      {/* Content */}
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          padding: "80px",
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            position: "relative",
            marginRight: "60px",
          }}
        >
          <div
            style={{
              width: "200px",
              height: "200px",
              borderRadius: "48px",
              background: "linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf)",
              border: "2px solid rgba(20, 184, 166, 0.4)",
              boxShadow: "0 0 60px rgba(20, 184, 166, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "100px",
              fontWeight: 900,
              color: "black",
            }}
          >
            F
          </div>
        </div>

        {/* Text */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#14b8a6",
                display: "flex",
              }}
            />
            <span
              style={{
                fontSize: "14px",
                fontWeight: 900,
                color: "#14b8a6",
                letterSpacing: "4px",
                display: "flex",
              }}
            >
              CHRONO_PROTO_STAMP
            </span>
          </div>
          <div
            style={{
              fontSize: "80px",
              fontWeight: 900,
              color: "white",
              lineHeight: 0.9,
              letterSpacing: "-4px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span style={{ display: "flex" }}>Spec</span>
            <span style={{ display: "flex" }}>Evolution.</span>
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#2dd4bf",
              marginTop: "24px",
              letterSpacing: "1px",
              display: "flex",
            }}
          >
            WATCH THE SPECIFICATION GROW IN REAL TIME.
          </div>
        </div>
      </div>

      {/* Footer HUD */}
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          right: "40px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          backgroundColor: "rgba(20, 184, 166, 0.05)",
          padding: "8px 20px",
          borderRadius: "9999px",
          border: "1px solid rgba(20, 184, 166, 0.1)",
        }}
      >
        <span
          style={{
            fontSize: "18px",
            fontWeight: 900,
            color: "#2dd4bf",
            display: "flex",
          }}
        >
          FRANKENSQLITE / SPEC
        </span>
      </div>
    </div>,
    { ...size },
  );
}
