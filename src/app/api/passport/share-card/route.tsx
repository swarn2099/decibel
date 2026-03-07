import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "Fan";
  const artists = searchParams.get("artists") || "0";
  const shows = searchParams.get("shows") || "0";
  const venues = searchParams.get("venues") || "0";
  const cities = searchParams.get("cities") || "0";
  const streak = searchParams.get("streak") || "0";
  const genre = searchParams.get("genre") || "";
  const topArtists = searchParams.get("topArtists") || "";
  const slug = searchParams.get("slug") || "";

  const topArtistList = topArtists
    ? topArtists.split(",").slice(0, 5)
    : [];

  const statItems = [
    { label: "Artists", value: artists, color: "#FF4D6A" },
    { label: "Shows", value: shows, color: "#9B6DFF" },
    { label: "Venues", value: venues, color: "#4D9AFF" },
    { label: "Cities", value: cities, color: "#00D4AA" },
    { label: "Streak", value: Number(streak) > 0 ? `${streak}w` : "--", color: "#FFD700" },
    { label: "Top Genre", value: genre || "--", color: "rgba(255,255,255,0.5)" },
  ];

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

        {/* Header: DECIBEL + MY PASSPORT */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "60px",
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
            MY PASSPORT
          </div>
        </div>

        {/* Fan name */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "60px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "56px",
              fontWeight: 700,
              color: "#FFFFFF",
              textAlign: "center",
            }}
          >
            {name}
          </div>
        </div>

        {/* Stats grid (2 columns) */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
            marginBottom: "60px",
            justifyContent: "center",
          }}
        >
          {statItems.map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "280px",
                padding: "24px",
                borderRadius: "16px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: stat.label === "Top Genre" ? "28px" : "44px",
                  fontWeight: 700,
                  color: stat.color,
                  marginBottom: "8px",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: "14px",
                  color: "rgba(255, 255, 255, 0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "3px",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Top artists */}
        {topArtistList.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "60px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "14px",
                color: "rgba(255, 255, 255, 0.4)",
                letterSpacing: "4px",
                textTransform: "uppercase",
                marginBottom: "16px",
              }}
            >
              TOP ARTISTS
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                justifyContent: "center",
              }}
            >
              {topArtistList.map((artist) => (
                <div
                  key={artist}
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
                  {artist.trim()}
                </div>
              ))}
            </div>
          </div>
        )}

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
