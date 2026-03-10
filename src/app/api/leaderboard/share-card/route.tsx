import { ImageResponse } from "next/og";

export const runtime = "edge";

const TIER_COLORS: Record<string, string> = {
  inner_circle: "#FFD700",
  secret: "#9B6DFF",
  early_access: "#FF4D6A",
  network: "#00D4AA",
};

const TIER_LABELS: Record<string, string> = {
  inner_circle: "Inner Circle",
  secret: "Secret",
  early_access: "Early Access",
  network: "Network",
};

const PERIOD_LABELS: Record<string, string> = {
  weekly: "Weekly Leaderboard",
  monthly: "Monthly Leaderboard",
  allTime: "All-Time Leaderboard",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rank = searchParams.get("rank") || "1";
  const name = searchParams.get("name") || "Fan";
  const count = searchParams.get("count") || "0";
  const tier = searchParams.get("tier") || "network";
  const period = searchParams.get("period") || "weekly";
  const topArtists = searchParams.get("topArtists") || "";

  const topArtistList = topArtists ? topArtists.split(",").filter(Boolean).slice(0, 5) : [];
  const tierColor = TIER_COLORS[tier] ?? "#00D4AA";
  const tierLabel = TIER_LABELS[tier] ?? tier;
  const periodLabel = PERIOD_LABELS[period] ?? "Leaderboard";

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

        {/* Background gradient accent */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(ellipse at top left, rgba(155,109,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(255,77,106,0.10) 0%, transparent 50%)",
          }}
        />

        {/* Header: DECIBEL + period label */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: "60px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "28px",
              fontWeight: "700",
              letterSpacing: "6px",
              background: "linear-gradient(to right, #FF4D6A, #9B6DFF)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            DECIBEL
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "16px",
              color: "rgba(255,255,255,0.5)",
              marginTop: "4px",
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            {periodLabel}
          </div>
        </div>

        {/* Large rank number hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "180px",
              fontWeight: "900",
              color: "#FFFFFF",
              lineHeight: "1",
              letterSpacing: "-4px",
            }}
          >
            #{rank}
          </div>
        </div>

        {/* Fan name */}
        <div
          style={{
            display: "flex",
            fontSize: "42px",
            fontWeight: "700",
            color: "#FFFFFF",
            marginBottom: "16px",
          }}
        >
          {name}
        </div>

        {/* Collection count + tier badge */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "16px",
            marginBottom: "48px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "28px",
              fontWeight: "600",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            {count} artists collected
          </div>
          <div
            style={{
              display: "flex",
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "6px",
              paddingBottom: "6px",
              borderRadius: "20px",
              backgroundColor: `${tierColor}22`,
              border: `2px solid ${tierColor}`,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "18px",
                fontWeight: "700",
                color: tierColor,
              }}
            >
              {tierLabel}
            </div>
          </div>
        </div>

        {/* Top artist photos (if provided) */}
        {topArtistList.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "12px",
              marginBottom: "48px",
            }}
          >
            {topArtistList.map((photoUrl, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={photoUrl}
                alt=""
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid rgba(255,255,255,0.2)",
                }}
              />
            ))}
          </div>
        )}

        {/* Spacer */}
        <div style={{ display: "flex", flex: 1 }} />

        {/* Bottom branding */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "20px",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            decible.live/leaderboard
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "16px",
              color: "rgba(255,255,255,0.25)",
              letterSpacing: "2px",
            }}
          >
            LIVE MUSIC PASSPORT
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
    }
  );
}
