import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const claimPerformerId = searchParams.get("claim");

  if (code) {
    const supabase = await createSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const admin = createSupabaseAdmin();

        // Handle claim flow: verify performer is unclaimed, then claim it
        if (claimPerformerId) {
          const { data: performer } = await admin
            .from("performers")
            .select("id, claimed")
            .eq("id", claimPerformerId)
            .single();

          if (performer && !performer.claimed) {
            await admin
              .from("performers")
              .update({
                claimed: true,
                claimed_by: user.id,
                updated_at: new Date().toISOString(),
              })
              .eq("id", claimPerformerId);

            return NextResponse.redirect(new URL("/dashboard", req.url));
          }
        }

        // Smart redirect: claimed performer → /dashboard, fan → /passport
        const { data: existingPerformer } = await admin
          .from("performers")
          .select("id")
          .eq("claimed_by", user.id)
          .single();

        if (existingPerformer) {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      }
    } catch {
      // Default to /passport on any error
    }
  }

  return NextResponse.redirect(new URL("/passport", req.url));
}
