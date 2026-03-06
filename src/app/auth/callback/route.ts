import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);

    // Smart redirect: performer → /dashboard, fan → /profile
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const admin = createSupabaseAdmin();
        const { data: performer } = await admin
          .from("performers")
          .select("id")
          .eq("claimed_by", user.id)
          .single();

        if (performer) {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      }
    } catch {
      // Default to /profile on any error
    }
  }

  return NextResponse.redirect(new URL("/profile", req.url));
}
