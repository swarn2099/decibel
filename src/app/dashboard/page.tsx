import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Use admin client for all data queries (bypasses RLS)
  const admin = createSupabaseAdmin();

  // Find performer claimed by this user
  const { data: performer } = await admin
    .from("performers")
    .select("*")
    .eq("claimed_by", user.id)
    .single();

  // If no claimed performer, show claim page
  if (!performer) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6">
        <ClaimPrompt userEmail={user.email || ""} />
      </main>
    );
  }

  // Get fan stats
  const { count: totalFans } = await admin
    .from("fan_tiers")
    .select("*", { count: "exact", head: true })
    .eq("performer_id", performer.id);

  const { data: tierBreakdown } = await admin
    .from("fan_tiers")
    .select("current_tier")
    .eq("performer_id", performer.id);

  const tiers = {
    network: 0,
    early_access: 0,
    secret: 0,
    inner_circle: 0,
  };
  tierBreakdown?.forEach((t) => {
    const key = t.current_tier as keyof typeof tiers;
    if (key in tiers) tiers[key]++;
  });

  // Recent scans (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentScans } = await admin
    .from("collections")
    .select(`
      id,
      event_date,
      capture_method,
      created_at,
      fans!inner (email, name),
      venues (name)
    `)
    .eq("performer_id", performer.id)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  // Scans over time (last 90 days) for chart
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: scanHistory } = await admin
    .from("collections")
    .select("created_at")
    .eq("performer_id", performer.id)
    .gte("created_at", ninetyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  // Fan list with tiers
  const { data: fanList } = await admin
    .from("fan_tiers")
    .select(`
      scan_count,
      current_tier,
      last_scan_date,
      fans!inner (id, email, name)
    `)
    .eq("performer_id", performer.id)
    .order("scan_count", { ascending: false });

  // Venues for Go Live
  const { data: venues } = await admin
    .from("venues")
    .select("id, name, slug")
    .order("name");

  return (
    <DashboardClient
      performer={performer}
      totalFans={totalFans || 0}
      tiers={tiers}
      recentScans={(recentScans || []) as unknown as Parameters<typeof DashboardClient>[0]["recentScans"]}
      scanHistory={scanHistory || []}
      fanList={(fanList || []) as unknown as Parameters<typeof DashboardClient>[0]["fanList"]}
      venues={venues || []}
    />
  );
}

async function ClaimPrompt({
  userEmail,
}: {
  userEmail: string;
}) {
  // Use admin client to query unclaimed performers (bypasses RLS)
  const admin = createSupabaseAdmin();

  // Find unclaimed performers
  const { data: unclaimed } = await admin
    .from("performers")
    .select("id, name, slug, city, genres")
    .eq("claimed", false)
    .order("name")
    .limit(50);

  return (
    <div className="w-full max-w-md text-center">
      <h1 className="mb-2 text-2xl font-bold">Claim Your Profile</h1>
      <p className="mb-6 text-sm text-gray">
        Signed in as {userEmail}. Select your performer profile below.
      </p>
      {unclaimed && unclaimed.length > 0 ? (
        <div className="flex flex-col gap-2">
          {unclaimed.map((p) => (
            <form key={p.id} action={`/api/claim`} method="POST">
              <input type="hidden" name="performer_id" value={p.id} />
              <button
                type="submit"
                className="w-full rounded-xl border border-light-gray/20 bg-bg-card px-4 py-3 text-left transition-colors hover:border-pink/30"
              >
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-gray">
                  {p.city} {p.genres?.length > 0 ? `· ${p.genres.join(", ")}` : ""}
                </p>
              </button>
            </form>
          ))}
        </div>
      ) : (
        <p className="text-sm text-light-gray">
          No unclaimed profiles found. Contact us to get your profile set up.
        </p>
      )}
    </div>
  );
}
