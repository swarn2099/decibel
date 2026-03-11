import { ImageResponse } from "next/og";

export const runtime = "edge";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artistName = searchParams.get("artistName") || "Artist";
  const artistPhoto = searchParams.get("artistPhoto") || "";
  const fanSlug = searchParams.get("fanSlug") || "someone";

  const initials = getInitials(artistName);
  const founderUsername = fanSlug.toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#0B0B0F",
          position: "relative",
          alignItems: "center",
        }}
      >
        {/* Top accent gradient bar */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(to right, #FF4D6A, #9B6DFF)",
          }}
        />

        {/* Artist photo area — top 60% */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "1152px",
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {artistPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artistPhoto}
              alt={artistName}
              width={1080}
              height={1152}
              style={{
                objectFit: "cover",
                width: "100%",
                height: "100%",
              }}
            />
          ) : (
            /* Initials fallback — gradient circle */
            <div
              style={{
                display: "flex",
                width: "300px",
                height: "300px",
                borderRadius: "150px",
                background: "linear-gradient(135deg, #FF4D6A, #9B6DFF)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: "120px",
                  fontWeight: 700,
                  color: "#FFFFFF",
                }}
              >
                {initials}
              </div>
            </div>
          )}

          {/* Dark gradient overlay at bottom of photo for text readability */}
          <div
            style={{
              display: "flex",
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "400px",
              background:
                "linear-gradient(to bottom, transparent, rgba(11, 11, 15, 0.95))",
            }}
          />
        </div>

        {/* Text content area — bottom 40% */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: "80px",
            paddingLeft: "60px",
            paddingRight: "60px",
          }}
        >
          {/* Artist name */}
          <div
            style={{
              display: "flex",
              fontSize: "56px",
              fontWeight: 700,
              color: "#FFFFFF",
              textAlign: "center",
              marginBottom: "32px",
              lineHeight: 1.1,
            }}
          >
            {artistName}
          </div>

          {/* "FOUNDED BY" label */}
          <div
            style={{
              display: "flex",
              fontSize: "28px",
              color: "#FFD700",
              textTransform: "uppercase",
              letterSpacing: "4px",
              marginBottom: "12px",
              opacity: 0.9,
            }}
          >
            FOUNDED BY
          </div>

          {/* Founder username */}
          <div
            style={{
              display: "flex",
              fontSize: "44px",
              fontWeight: 700,
              color: "#FFD700",
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "48px",
            }}
          >
            {founderUsername}
          </div>

          {/* DECIBEL branding */}
          <div
            style={{
              display: "flex",
              fontSize: "24px",
              color: "rgba(255, 255, 255, 0.4)",
              letterSpacing: "8px",
              textTransform: "uppercase",
            }}
          >
            DECIBEL
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}
