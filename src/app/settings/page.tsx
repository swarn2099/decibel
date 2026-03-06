import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const admin = createSupabaseAdmin();

  const { data: fan } = await admin
    .from("fans")
    .select("id, email, name")
    .eq("email", user.email!)
    .single();

  return <SettingsClient fan={fan} userEmail={user.email || ""} />;
}
