import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const admin = createSupabaseAdmin();

  // Find fan by email
  const { data: fan } = await admin
    .from("fans")
    .select("id, email, name")
    .eq("email", user.email!)
    .single();

  if (!fan) {
    return (
      <ProfileClient
        fan={null}
        userEmail={user.email || ""}
        collections={[]}
        scanHistory={[]}
      />
    );
  }

  // Get collections with tier info
  const { data: collections } = await admin
    .from("fan_tiers")
    .select(
      `scan_count, current_tier, last_scan_date,
       performers!inner (id, name, slug, photo_url, genres, city)`
    )
    .eq("fan_id", fan.id)
    .order("last_scan_date", { ascending: false });

  // Get scan history
  const { data: scanHistory } = await admin
    .from("collections")
    .select(
      `id, event_date, capture_method, created_at,
       performers!inner (name, slug),
       venues (name)`
    )
    .eq("fan_id", fan.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <ProfileClient
      fan={fan}
      userEmail={user.email || ""}
      collections={(collections || []) as unknown as Parameters<typeof ProfileClient>[0]["collections"]}
      scanHistory={(scanHistory || []) as unknown as Parameters<typeof ProfileClient>[0]["scanHistory"]}
    />
  );
}
