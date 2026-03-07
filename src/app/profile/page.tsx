import { createSupabaseServer } from "@/lib/supabase";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Profile has been replaced by Passport
  redirect("/passport");
}
