import { createSupabaseServer } from "@/lib/supabase-server";
import { PerformerGrid } from "@/components/performer-grid";

export const revalidate = 300;

export default async function Home() {
  const supabase = await createSupabaseServer();

  const { data: performers } = await supabase
    .from("performers")
    .select("name, slug, photo_url, genres, follower_count")
    .order("follower_count", { ascending: false })
    .limit(500);

  return (
    <div className="min-h-screen bg-bg px-6 py-16">
      {/* Hero */}
      <div className="mx-auto mb-16 flex max-w-5xl flex-col items-center gap-6 text-center">
        <h1 className="text-6xl font-bold tracking-tight sm:text-8xl">
          <span className="bg-gradient-to-r from-pink via-purple to-blue bg-clip-text text-transparent">
            DECIBEL
          </span>
        </h1>
        <p className="max-w-md text-lg font-light text-gray">
          The more you show up, the more you get in.
        </p>
        <div className="flex h-1 w-24 rounded-full bg-gradient-to-r from-pink to-purple" />
      </div>

      {/* Performer Grid with Search */}
      {performers && performers.length > 0 && (
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-gray">
            Chicago Performers
          </h2>
          <PerformerGrid performers={performers} />
        </div>
      )}
    </div>
  );
}
