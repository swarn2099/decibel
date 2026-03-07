import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artistName = searchParams.get("artistName") || "Artist";
  const artistPhoto = searchParams.get("artistPhoto") || "";
  const genres = searchParams.get("genres") || "";
  const fanName = searchParams.get("fanName") || "Fan";
  const slug = searchParams.get("slug") || "";

  const genreList = genres ? genres.split(",").slice(0, 4) : [];

  const initials = artistName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
            marginBottom: "40px",
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
        </div>

        {/* NEW DISCOVERY subtitle */}
        <div
          style={{
            display: "flex",
            padding: "12px 32px",
            borderRadius: "32px",
            background: "linear-gradient(135deg, rgba(255, 77, 106, 0.15), rgba(155, 109, 255, 0.15))",
            border: "1px solid rgba(255, 77, 106, 0.3)",
            fontSize: "20px",
            fontWeight: 700,
            letterSpacing: "6px",
            color: "#FF4D6A",
            textTransform: "uppercase",
            marginBottom: "60px",
          }}
        >
          NEW DISCOVERY
        </div>

        {/* Artist photo or initials */}
        {artistPhoto ? (
          <img
            src={artistPhoto}
            alt={artistName}
            width={280}
            height={280}
            style={{
              borderRadius: "50%",
              objectFit: "cover",
              border: "4px solid rgba(155, 109, 255, 0.4)",
              marginBottom: "40px",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              width: "280px",
              height: "280px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FF4D6A, #9B6DFF)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "90px",
              fontWeight: 700,
              color: "white",
              border: "4px solid rgba(155, 109, 255, 0.4)",
              marginBottom: "40px",
            }}
          >
            {initials}
          </div>
        )}

        {/* Artist name */}
        <div
          style={{
            display: "flex",
            fontSize: "56px",
            fontWeight: 700,
            color: "#FFFFFF",
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          {artistName}
        </div>

        {/* Genre pills */}
        {genreList.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              justifyContent: "center",
              marginBottom: "60px",
            }}
          >
            {genreList.map((g) => (
              <div
                key={g}
                style={{
                  display: "flex",
                  padding: "8px 20px",
                  borderRadius: "20px",
                  border: "1px solid rgba(155, 109, 255, 0.3)",
                  backgroundColor: "rgba(155, 109, 255, 0.08)",
                  fontSize: "18px",
                  color: "#FFFFFF",
                }}
              >
                {g.trim()}
              </div>
            ))}
          </div>
        )}

        {/* Fan attribution */}
        <div
          style={{
            display: "flex",
            fontSize: "22px",
            color: "rgba(255, 255, 255, 0.4)",
            marginBottom: "auto",
          }}
        >
          Discovered by {fanName}
        </div>

        {/* Bottom branding */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "auto",
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
