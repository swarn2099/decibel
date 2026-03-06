import Link from "next/link";

interface Performer {
  name: string;
  slug: string;
  photo_url: string | null;
  genres: string[] | null;
  follower_count: number | null;
}

export function PerformerGrid({ performers }: { performers: Performer[] }) {
  return (
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
  );
}
