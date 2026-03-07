import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const milestone = searchParams.get("milestone") || "Milestone Reached";
  const value = searchParams.get("value") || "0";
  const label = searchParams.get("label") || "";
  const fanName = searchParams.get("fanName") || "Fan";
  const slug = searchParams.get("slug") || "";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#0B0B0F",
          padding: "80px 60px",
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Gradient accent line at top */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(to right, #FF4D6A, #9B6DFF, #4D9AFF, #00D4AA)",
          }}
        />

        {/* Header: DECIBEL */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "absolute",
            top: "80px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "32px",
              fontWeight: 700,
              letterSpacing: "10px",
              background: "linear-gradient(to right, #FF4D6A, #9B6DFF)",
              backgroundClip: "text",
              color: "transparent",
              marginBottom: "16px",
            }}
          >
            DECIBEL
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "18px",
              color: "rgba(255, 255, 255, 0.4)",
              letterSpacing: "6px",
              textTransform: "uppercase",
            }}
          >
            MILESTONE REACHED
          </div>
        </div>

        {/* Large value number with gradient */}
        <div
          style={{
            display: "flex",
            fontSize: "200px",
            fontWeight: 700,
            background: "linear-gradient(135deg, #FF4D6A, #9B6DFF)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: "16px",
            lineHeight: 1,
          }}
        >
          {value}
        </div>

        {/* Label */}
        {label && (
          <div
            style={{
              display: "flex",
              fontSize: "36px",
              color: "rgba(255, 255, 255, 0.6)",
              textTransform: "uppercase",
              letterSpacing: "8px",
              marginBottom: "16px",
            }}
          >
            {label}
          </div>
        )}

        {/* Milestone description */}
        <div
          style={{
            display: "flex",
            fontSize: "24px",
            color: "rgba(255, 255, 255, 0.35)",
            textAlign: "center",
            marginBottom: "60px",
          }}
        >
          {milestone}
        </div>

        {/* Fan attribution */}
        <div
          style={{
            display: "flex",
            fontSize: "22px",
            color: "rgba(255, 255, 255, 0.4)",
          }}
        >
          Achieved by {fanName}
        </div>

        {/* Bottom branding */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "absolute",
            bottom: "80px",
          }}
        >
          {slug && (
            <div
              style={{
                display: "flex",
                fontSize: "20px",
                color: "rgba(255, 255, 255, 0.35)",
                marginBottom: "12px",
              }}
            >
              decibel.live/passport/{slug}
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontSize: "14px",
              color: "rgba(255, 255, 255, 0.2)",
              letterSpacing: "4px",
              textTransform: "uppercase",
            }}
          >
            THE MORE YOU SHOW UP, THE MORE YOU GET IN
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(to right, #00D4AA, #4D9AFF, #9B6DFF, #FF4D6A)",
          }}
        />
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}
