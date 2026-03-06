import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { TIER_COLORS, TIER_LABELS } from "@/lib/tiers";

type Collection = {
  scan_count: number;
  current_tier: string;
  last_scan_date: string;
  performers: {
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
    genres: string[];
    city: string;
  };
};

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const admin = createSupabaseAdmin();

  const { data: fan } = await admin
    .from("fans")
    .select("id, email, name")
    .eq("id", id)
    .single();

  if (!fan) return { title: "Fan Not Found | DECIBEL" };

  const { count } = await admin
    .from("fan_tiers")
    .select("*", { count: "exact", head: true })
    .eq("fan_id", fan.id);

  const displayName = fan.name || "Anonymous";
  const title = `${displayName}'s Collection | DECIBEL`;
  const description = `${displayName} has collected ${count || 0} artists on DECIBEL. The more you show up, the more you get in.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function FanCardPage({ params }: Props) {
  const { id } = await params;
  const admin = createSupabaseAdmin();

  const { data: fan } = await admin
    .from("fans")
    .select("id, email, name")
    .eq("id", id)
    .single();

  if (!fan) notFound();

  const { data: rawCollections } = await admin
    .from("fan_tiers")
    .select(
      `scan_count, current_tier, last_scan_date,
       performers!inner (id, name, slug, photo_url, genres, city)`
    )
    .eq("fan_id", fan.id)
    .order("scan_count", { ascending: false });

  const collections = (rawCollections || []) as unknown as Collection[];
  const displayName = fan.name || "Anonymous";
  const maxDisplay = 12;
  const visible = collections.slice(0, maxDisplay);
  const remaining = collections.length - maxDisplay;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0B0B0F] px-4 py-12">
      <div className="w-full max-w-[700px] overflow-hidden rounded-2xl border border-light-gray/10 bg-bg-card shadow-2xl">
        {/* Header */}
        <div className="border-b border-light-gray/10 px-8 py-6 text-center">
          <h1 className="text-2xl font-bold tracking-widest text-pink">
            DECIBEL
          </h1>
          <p className="mt-2 text-lg font-semibold text-[#EDEDED]">
            {displayName}
          </p>
          <p className="mt-1 text-sm text-gray">
            {collections.length} artist{collections.length !== 1 ? "s" : ""}{" "}
            collected
          </p>
        </div>

        {/* Artist Grid */}
        <div className="px-8 py-6">
          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray">
              No artists collected yet. Scan a QR code at your next show!
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {visible.map((c) => {
                const tier =
                  TIER_COLORS[c.current_tier] || TIER_COLORS.network;
                const initials = c.performers.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={c.performers.id}
                    className="flex flex-col items-center gap-2"
                  >
                    {c.performers.photo_url ? (
                      <img
                        src={c.performers.photo_url}
                        alt={c.performers.name}
                        className="h-20 w-20 rounded-full object-cover ring-2 ring-light-gray/20"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple to-blue text-lg font-bold text-white ring-2 ring-light-gray/20">
                        {initials}
                      </div>
                    )}
                    <p className="max-w-[120px] truncate text-center text-xs font-medium text-[#EDEDED]">
                      {c.performers.name}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tier.text} ${tier.bg}`}
                    >
                      {TIER_LABELS[c.current_tier] || c.current_tier}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {remaining > 0 && (
            <p className="mt-4 text-center text-xs text-light-gray">
              +{remaining} more artist{remaining !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-light-gray/10 px-8 py-5 text-center">
          <div className="mx-auto mb-2 h-[3px] w-24 rounded-full bg-gradient-to-r from-pink to-purple" />
          <p className="text-xs font-semibold tracking-wider text-gray">
            decibel.live
          </p>
          <p className="mt-1 text-[10px] text-light-gray">
            The more you show up, the more you get in.
          </p>
        </div>
      </div>
    </div>
  );
}
