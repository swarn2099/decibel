import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { generateFanSlug } from "@/lib/fan-slug";
import type { NewContactNotification } from "@/lib/types/social";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailsParam = req.nextUrl.searchParams.get("emails");
  const sinceParam = req.nextUrl.searchParams.get("since");

  if (!emailsParam || !sinceParam) {
    return NextResponse.json({ newContacts: [] });
  }

  // Parse emails from comma-separated list
  const emails = emailsParam
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    return NextResponse.json({ newContacts: [] });
  }

  // Validate since is a valid date
  const sinceDate = new Date(sinceParam);
  if (isNaN(sinceDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid since parameter" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdmin();

  // Get current fan to exclude self
  const { data: currentFan } = await admin
    .from("fans")
    .select("id")
    .eq("email", user.email!)
    .single();

  // Query fans who match the emails AND joined after `since`
  const { data: newFans } = await admin
    .from("fans")
    .select("id, name, email, created_at")
    .in("email", emails)
    .gt("created_at", sinceParam);

  if (!newFans || newFans.length === 0) {
    return NextResponse.json({ newContacts: [] });
  }

  // Filter out self
  const otherFans = currentFan
    ? newFans.filter((f) => f.id !== currentFan.id)
    : newFans;

  const newContacts: NewContactNotification[] = otherFans.map((f) => ({
    fan: {
      id: f.id,
      name: f.name || f.email?.split("@")[0] || "Fan",
      slug: generateFanSlug({ name: f.name, id: f.id }),
    },
    joinedAt: f.created_at,
  }));

  return NextResponse.json({ newContacts });
}
