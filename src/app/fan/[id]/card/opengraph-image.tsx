import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TIER_LABELS: Record<string, string> = {
  network: "Network",
  early_access: "Early Access",
  secret: "Secret",
  inner_circle: "Inner Circle",
};

const TIER_ACCENT: Record<string, string> = {
  network: "#FF4D6A",
  early_access: "#9B6DFF",
  secret: "#4D9AFF",
  inner_circle: "#00D4AA",
};

type Collection = {
  scan_count: number;
  current_tier: string;
  performers: {
    id: string;
    name: string;
    photo_url: string | null;
  };
};

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: fan } = await supabase
    .from("fans")
    .select("id, name, email")
    .eq("id", id)
    .single();

  const displayName = fan?.name || "Anonymous";

  const { data: rawCollections } = fan
    ? await supabase
        .from("fan_tiers")
        .select(
          `scan_count, current_tier,
           performers!inner (id, name, photo_url)`
        )
        .eq("fan_id", fan.id)
        .order("scan_count", { ascending: false })
        .limit(8)
    : { data: [] };

  const collections = (rawCollections || []) as unknown as Collection[];
  const totalCount = collections.length;

  // Build tier breakdown
  const tierCounts: Record<string, number> = {};
  for (const c of collections) {
    const label = TIER_LABELS[c.current_tier] || c.current_tier;
    tierCounts[label] = (tierCounts[label] || 0) + 1;
  }
  const tierSummary = Object.entries(tierCounts)
    .map(([label, count]) => `${count} ${label}`)
    .join(", ");

  // Top row / bottom row for artist grid
  const topRow = collections.slice(0, 4);
  const bottomRow = collections.slice(4, 8);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#0B0B0F",
          color: "#EDEDED",
          fontFamily: "sans-serif",
        }}
      >
        {/* Left section */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: "40%",
            padding: "48px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "#FF4D6A",
            }}
          >
            DECIBEL
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 600,
              marginTop: 16,
            }}
          >
            {displayName}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: "#A0A0B0",
              marginTop: 8,
            }}
          >
            {totalCount} artist{totalCount !== 1 ? "s" : ""} collected
          </div>
          {tierSummary && (
            <div
              style={{
                display: "flex",
                fontSize: 16,
                color: "#6E6E82",
                marginTop: 12,
              }}
            >
              {tierSummary}
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontSize: 14,
              color: "#6E6E82",
              marginTop: 32,
            }}
          >
            The more you show up, the more you get in.
          </div>
        </div>

        {/* Right section - artist grid */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            width: "60%",
            padding: "40px",
            gap: "20px",
          }}
        >
          {[topRow, bottomRow].map((row, rowIdx) =>
            row.length > 0 ? (
              <div
                key={rowIdx}
                style={{
                  display: "flex",
                  gap: "16px",
                  justifyContent: "center",
                }}
              >
                {row.map((c) => {
                  const initials = c.performers.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const accent =
                    TIER_ACCENT[c.current_tier] || "#FF4D6A";

                  return (
                    <div
                      key={c.performers.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {c.performers.photo_url ? (
                        <img
                          src={c.performers.photo_url}
                          width={80}
                          height={80}
                          style={{
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: `2px solid ${accent}`,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            width: 80,
                            height: 80,
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg, #9B6DFF, #4D9AFF)",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 20,
                            fontWeight: 700,
                            border: `2px solid ${accent}`,
                          }}
                        >
                          {initials}
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          fontSize: 12,
                          color: "#A0A0B0",
                          maxWidth: 100,
                          textAlign: "center",
                          overflow: "hidden",
                        }}
                      >
                        {c.performers.name.length > 14
                          ? c.performers.name.slice(0, 13) + "..."
                          : c.performers.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null
          )}
        </div>

        {/* Bottom gradient bar */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(to right, #FF4D6A, #9B6DFF)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
