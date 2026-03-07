import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "Fan";
  const artists = searchParams.get("artists") || "0";
  const shows = searchParams.get("shows") || "0";
  const venues = searchParams.get("venues") || "0";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#0B0B0F",
          padding: "60px",
          position: "relative",
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
            height: "4px",
            background: "linear-gradient(to right, #FF4D6A, #9B6DFF, #4D9AFF)",
          }}
        />

        {/* DECIBEL logo */}
        <div
          style={{
            display: "flex",
            fontSize: "28px",
            fontWeight: 700,
            letterSpacing: "8px",
            background: "linear-gradient(to right, #FF4D6A, #9B6DFF)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: "40px",
          }}
        >
          DECIBEL
        </div>

        {/* Fan name */}
        <div
          style={{
            display: "flex",
            fontSize: "64px",
            fontWeight: 700,
            color: "#FFFFFF",
            marginBottom: "12px",
            textAlign: "center",
          }}
        >
          {name}&apos;s Passport
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: "flex",
            fontSize: "22px",
            color: "rgba(255, 255, 255, 0.5)",
            marginBottom: "50px",
          }}
        >
          Live Music Attendance Record
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: "40px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "48px",
                fontWeight: 700,
                color: "#FF4D6A",
              }}
            >
              {artists}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "18px",
                color: "rgba(255, 255, 255, 0.6)",
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              Artists
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: "1px",
              height: "60px",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "48px",
                fontWeight: 700,
                color: "#9B6DFF",
              }}
            >
              {shows}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "18px",
                color: "rgba(255, 255, 255, 0.6)",
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              Shows
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: "1px",
              height: "60px",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "48px",
                fontWeight: 700,
                color: "#4D9AFF",
              }}
            >
              {venues}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "18px",
                color: "rgba(255, 255, 255, 0.6)",
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              Venues
            </div>
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
            height: "4px",
            background: "linear-gradient(to right, #4D9AFF, #9B6DFF, #FF4D6A)",
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
