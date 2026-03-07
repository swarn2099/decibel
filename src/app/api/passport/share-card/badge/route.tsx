import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const badgeName = searchParams.get("badgeName") || "Badge";
  const badgeDesc = searchParams.get("badgeDesc") || "";
  const badgeIcon = searchParams.get("badgeIcon") || "🏆";
  const rarity = searchParams.get("rarity") || "common";
  const category = searchParams.get("category") || "";
  const earnedAt = searchParams.get("earnedAt") || "";
  const fanName = searchParams.get("fanName") || "Fan";
  const slug = searchParams.get("slug") || "";

  const RARITY_COLORS: Record<string, string> = {
    common: "#FFFFFF",
    rare: "#4D9AFF",
    epic: "#9B6DFF",
    legendary: "#FFD700",
  };

  const rarityColor = RARITY_COLORS[rarity] || "#FFFFFF";
  const isLegendary = rarity === "legendary";

  const formattedDate = earnedAt
    ? new Date(earnedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

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
            BADGE UNLOCKED
          </div>
        </div>

        {/* Large emoji icon */}
        <div
          style={{
            display: "flex",
            fontSize: "160px",
            marginBottom: "40px",
            ...(isLegendary
              ? {
                  filter: "drop-shadow(0 0 30px rgba(255, 215, 0, 0.5))",
                }
              : {}),
          }}
        >
          {badgeIcon}
        </div>

        {/* Badge name */}
        <div
          style={{
            display: "flex",
            fontSize: "52px",
            fontWeight: 700,
            color: "#FFFFFF",
            textAlign: "center",
            marginBottom: "16px",
          }}
        >
          {badgeName}
        </div>

        {/* Badge description */}
        {badgeDesc && (
          <div
            style={{
              display: "flex",
              fontSize: "24px",
              color: "rgba(255, 255, 255, 0.5)",
              textAlign: "center",
              marginBottom: "32px",
              maxWidth: "800px",
            }}
          >
            {badgeDesc}
          </div>
        )}

        {/* Rarity pill */}
        <div
          style={{
            display: "flex",
            padding: "12px 32px",
            borderRadius: "32px",
            backgroundColor: `${rarityColor}15`,
            border: `2px solid ${rarityColor}`,
            fontSize: "20px",
            fontWeight: 700,
            letterSpacing: "4px",
            color: rarityColor,
            textTransform: "uppercase",
            marginBottom: "16px",
            ...(isLegendary
              ? {
                  boxShadow: "0 0 20px rgba(255, 215, 0, 0.3)",
                }
              : {}),
          }}
        >
          {rarity.toUpperCase()}
        </div>

        {/* Category */}
        {category && (
          <div
            style={{
              display: "flex",
              fontSize: "16px",
              color: "rgba(255, 255, 255, 0.3)",
              letterSpacing: "4px",
              textTransform: "uppercase",
              marginBottom: "40px",
            }}
          >
            {category}
          </div>
        )}

        {/* Fan attribution */}
        <div
          style={{
            display: "flex",
            fontSize: "22px",
            color: "rgba(255, 255, 255, 0.4)",
            marginBottom: "12px",
          }}
        >
          Earned by {fanName}
        </div>

        {/* Date earned */}
        {formattedDate && (
          <div
            style={{
              display: "flex",
              fontSize: "18px",
              color: "rgba(255, 255, 255, 0.25)",
              marginBottom: "auto",
            }}
          >
            {formattedDate}
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
