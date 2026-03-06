import { createSupabaseServer } from "@/lib/supabase-server";
import Link from "next/link";

export const revalidate = 300; // revalidate every 5 min

export default async function Home() {
  const supabase = await createSupabaseServer();

  const { data: performers } = await supabase
    .from("performers")
    .select("name, slug, photo_url, genres, city, follower_count")
    .order("follower_count", { ascending: false })
    .limit(60);

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

      {/* Performer Grid */}
      {performers && performers.length > 0 && (
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-gray">
            Chicago Performers
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {performers.map((p) => (
              <Link
                key={p.slug}
                href={`/artist/${p.slug}`}
                className="group flex flex-col items-center rounded-xl border border-light-gray/10 bg-bg-card p-5 transition-all hover:border-pink/30 hover:scale-[1.02]"
              >
                {p.photo_url ? (
                  <img
                    src={p.photo_url}
                    alt={p.name}
                    className="mb-3 h-20 w-20 rounded-full object-cover ring-2 ring-light-gray/20 group-hover:ring-pink/40 transition-all"
                  />
                ) : (
                  <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink/20 to-purple/20 text-2xl font-bold text-gray group-hover:from-pink/30 group-hover:to-purple/30 transition-all">
                    {p.name[0]}
                  </div>
                )}
                <p className="text-sm font-semibold text-center leading-tight">
                  {p.name}
                </p>
                {p.genres && p.genres.length > 0 && (
                  <p className="mt-1 text-center text-[11px] text-light-gray leading-tight">
                    {p.genres.slice(0, 2).join(" · ")}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
