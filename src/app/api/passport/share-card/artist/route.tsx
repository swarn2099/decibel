import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "Artist";
  const photo = searchParams.get("photo") || "";
  const tier = searchParams.get("tier") || "network";
  const scans = searchParams.get("scans") || "1";
  const venue = searchParams.get("venue") || "";
  const fanName = searchParams.get("fanName") || "Fan";
  const slug = searchParams.get("slug") || "";

  const TIER_COLORS: Record<string, string> = {
    network: "#FF4D6A",
    early_access: "#9B6DFF",
    secret: "#4D9AFF",
    inner_circle: "#00D4AA",
  };

  const TIER_LABELS: Record<string, string> = {
    network: "NETWORK",
    early_access: "EARLY ACCESS",
    secret: "SECRET",
    inner_circle: "INNER CIRCLE",
  };

  const tierColor = TIER_COLORS[tier] || "#FF4D6A";
  const tierLabel = TIER_LABELS[tier] || "NETWORK";

  const initials = name
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
            ARTIST COLLECTED
          </div>
        </div>

        {/* Artist photo or initials */}
        {photo ? (
          <img
            src={photo}
            alt={name}
            width={240}
            height={240}
            style={{
              borderRadius: "50%",
              objectFit: "cover",
              border: `4px solid ${tierColor}`,
              marginBottom: "40px",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              width: "240px",
              height: "240px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FF4D6A, #9B6DFF)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "80px",
              fontWeight: 700,
              color: "white",
              border: `4px solid ${tierColor}`,
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
            marginBottom: "24px",
          }}
        >
          {name}
        </div>

        {/* Tier badge */}
        <div
          style={{
            display: "flex",
            padding: "12px 32px",
            borderRadius: "32px",
            backgroundColor: `${tierColor}20`,
            border: `2px solid ${tierColor}`,
            fontSize: "20px",
            fontWeight: 700,
            letterSpacing: "4px",
            color: tierColor,
            marginBottom: "32px",
          }}
        >
          {tierLabel}
        </div>

        {/* Scan count */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "48px",
              fontWeight: 700,
              color: tierColor,
            }}
          >
            {scans}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "20px",
              color: "rgba(255, 255, 255, 0.5)",
              textTransform: "uppercase",
              letterSpacing: "3px",
            }}
          >
            {Number(scans) === 1 ? "SCAN" : "SCANS"}
          </div>
        </div>

        {/* Venue */}
        {venue && (
          <div
            style={{
              display: "flex",
              fontSize: "22px",
              color: "rgba(255, 255, 255, 0.4)",
              marginBottom: "40px",
            }}
          >
            @ {venue}
          </div>
        )}

        {/* Fan attribution */}
        <div
          style={{
            display: "flex",
            fontSize: "20px",
            color: "rgba(255, 255, 255, 0.35)",
            marginBottom: "auto",
          }}
        >
          Collected by {fanName}
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
