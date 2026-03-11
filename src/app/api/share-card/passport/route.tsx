import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "Fan";
  const artistsFound = searchParams.get("artistsFound") || "0";
  const showsAttended = searchParams.get("showsAttended") || "0";
  const venues = searchParams.get("venues") || "0";
  const topPhotosParam = searchParams.get("topPhotos") || "";

  const topPhotos = topPhotosParam
    ? topPhotosParam.split(",").filter(Boolean).slice(0, 4)
    : [];

  // Pad to 4 cells (empty cells rendered as placeholders)
  const photoCells: Array<string | null> = [
    topPhotos[0] ?? null,
    topPhotos[1] ?? null,
    topPhotos[2] ?? null,
    topPhotos[3] ?? null,
  ];

  const stats = [
    { value: artistsFound, label: "Artists" },
    { value: showsAttended, label: "Shows" },
    { value: venues, label: "Venues" },
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
          position: "relative",
          alignItems: "center",
          paddingTop: "80px",
          paddingBottom: "80px",
          paddingLeft: "60px",
          paddingRight: "60px",
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

        {/* DECIBEL branding at top */}
        <div
          style={{
            display: "flex",
            fontSize: "28px",
            fontWeight: 700,
            letterSpacing: "10px",
            color: "rgba(255, 255, 255, 0.4)",
            textTransform: "uppercase",
            marginBottom: "60px",
          }}
        >
          DECIBEL
        </div>

        {/* User name */}
        <div
          style={{
            display: "flex",
            fontSize: "72px",
            fontWeight: 700,
            color: "#FFFFFF",
            textAlign: "center",
            marginBottom: "16px",
            lineHeight: 1.1,
          }}
        >
          {name}
        </div>

        {/* PASSPORT subtitle */}
        <div
          style={{
            display: "flex",
            fontSize: "24px",
            color: "rgba(255, 255, 255, 0.5)",
            textTransform: "uppercase",
            letterSpacing: "6px",
            marginBottom: "80px",
          }}
        >
          PASSPORT
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            gap: "40px",
            marginBottom: "80px",
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "240px",
                padding: "32px 20px",
                borderRadius: "20px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: "64px",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  marginBottom: "12px",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: "20px",
                  color: "rgba(255, 255, 255, 0.6)",
                  textTransform: "uppercase",
                  letterSpacing: "3px",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* TOP ARTISTS label */}
        <div
          style={{
            display: "flex",
            fontSize: "16px",
            color: "rgba(255, 255, 255, 0.4)",
            letterSpacing: "5px",
            textTransform: "uppercase",
            marginBottom: "24px",
          }}
        >
          TOP ARTISTS
        </div>

        {/* 2x2 photo grid */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: "auto",
          }}
        >
          {/* Row 1 */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "10px",
            }}
          >
            {photoCells.slice(0, 2).map((photo, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  width: "460px",
                  height: "460px",
                  borderRadius: "16px",
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo}
                    alt=""
                    width={460}
                    height={460}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      height: "100%",
                      background:
                        "linear-gradient(135deg, rgba(255, 77, 106, 0.3), rgba(155, 109, 255, 0.3))",
                      borderRadius: "16px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Row 2 */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "10px",
            }}
          >
            {photoCells.slice(2, 4).map((photo, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  width: "460px",
                  height: "460px",
                  borderRadius: "16px",
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo}
                    alt=""
                    width={460}
                    height={460}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      height: "100%",
                      background:
                        "linear-gradient(135deg, rgba(255, 77, 106, 0.3), rgba(155, 109, 255, 0.3))",
                      borderRadius: "16px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom branding */}
        <div
          style={{
            display: "flex",
            marginTop: "60px",
            fontSize: "24px",
            color: "rgba(255, 255, 255, 0.4)",
            letterSpacing: "8px",
            textTransform: "uppercase",
          }}
        >
          DECIBEL
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}
