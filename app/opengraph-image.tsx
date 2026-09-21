import { ImageResponse } from "next/og";

export const alt = "FrankenSQLite — The Monster Database Engine for Rust";
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
          background: "radial-gradient(circle, rgba(20, 184, 166, 0.15) 0%, transparent 70%)",
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

      {/* Corner Bolts */}
      {[
        { top: 12, left: 12 },
        { top: 12, right: 12 },
        { bottom: 12, left: 12 },
        { bottom: 12, right: 12 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...pos,
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "#1a2e2a",
            border: "1px solid #14b8a6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "10px",
              height: "1px",
              backgroundColor: "#14b8a6",
              transform: "rotate(45deg)",
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "10px",
              height: "1px",
              backgroundColor: "#14b8a6",
              transform: "rotate(-45deg)",
              display: "flex",
            }}
          />
        </div>
      ))}

      {/* Stitches */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "25%",
          right: "25%",
          height: "1px",
          borderTop: "2px dashed rgba(20, 184, 166, 0.3)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "25%",
          right: "25%",
          height: "1px",
          borderTop: "2px dashed rgba(20, 184, 166, 0.3)",
        }}
      />

      {/* Main Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: "100%",
          alignItems: "center",
          padding: "80px",
          zIndex: 10,
        }}
      >
        {/* Logo Section */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "60px",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "-20px",
              background: "rgba(20, 184, 166, 0.1)",
              borderRadius: "40px",
              filter: "blur(40px)",
            }}
          />
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

        {/* Text Section */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
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
                backgroundColor: "#ef4444",
                display: "flex",
              }}
            />
            <span
              style={{
                fontSize: "14px",
                fontWeight: 900,
                color: "#ef4444",
                letterSpacing: "4px",
                display: "flex",
              }}
            >
              SYSTEM_ALIVE
            </span>
          </div>

          <div
            style={{
              fontSize: "88px",
              fontWeight: 900,
              color: "white",
              lineHeight: 0.9,
              letterSpacing: "-4px",
              display: "flex",
            }}
          >
            FrankenSQLite
          </div>

          <div
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#2dd4bf",
              marginTop: "16px",
              letterSpacing: "-0.5px",
              display: "flex",
            }}
          >
            The Monster Database Engine for Rust.
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "24px",
              marginTop: "40px",
              paddingTop: "32px",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {[
              { label: "WORKSPACE", val: "26 CRATES" },
              { label: "CONCURRENCY", val: "MVCC" },
              { label: "UNSAFE", val: "ZERO" },
            ].map((stat, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 900,
                    color: "#64748b",
                    letterSpacing: "2px",
                    display: "flex",
                  }}
                >
                  {stat.label}
                </span>
                <span
                  style={{ fontSize: "20px", fontWeight: 900, color: "white", display: "flex" }}
                >
                  {stat.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HUD Accents */}
      <div
        style={{
          position: "absolute",
          top: "40px",
          right: "40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "4px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: 900,
            color: "rgba(20, 184, 166, 0.4)",
            letterSpacing: "2px",
            display: "flex",
          }}
        >
          ORIGIN_PROTOCOL_V0.1.0
        </span>
        <div
          style={{
            width: "120px",
            height: "2px",
            backgroundColor: "rgba(20, 184, 166, 0.2)",
            display: "flex",
          }}
        />
      </div>

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
            letterSpacing: "1px",
            display: "flex",
          }}
        >
          FRANKENSQLITE.COM
        </span>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
