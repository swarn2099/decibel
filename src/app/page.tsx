import { createSupabaseServer } from "@/lib/supabase-server";
import { PerformerGrid } from "@/components/performer-grid";
import Link from "next/link";
import { Calendar, MapPin, Clock, ExternalLink } from "lucide-react";

export const revalidate = 300;

function getNextWeekendRange(): { friday: string; sunday: string; label: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
  // Find next Friday (or today if it's Fri/Sat)
  let daysToFri = (5 - day + 7) % 7;
  if (daysToFri === 0 && day !== 5) daysToFri = 7;
  // If it's Sat, go back to yesterday's Fri
  if (day === 6) daysToFri = -1;
  // If it's Sun, use the coming Fri
  if (day === 0) daysToFri = 5;

  const friday = new Date(now);
  friday.setDate(now.getDate() + daysToFri);
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const monthDay = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    friday: fmt(friday),
    sunday: fmt(sunday),
    label: `${monthDay(friday)} – ${monthDay(sunday)}`,
  };
}

function formatTime(timeStr: string): string {
  const date = new Date(timeStr);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

interface WeekendEvent {
  id: string;
  event_date: string;
  start_time: string | null;
  external_url: string | null;
  performer: { name: string; slug: string; photo_url: string | null } | null;
  venue: { name: string } | null;
}

export default async function Home() {
  const supabase = await createSupabaseServer();

  const { friday, sunday, label: weekendLabel } = getNextWeekendRange();

  const [{ data: performers }, { data: rawEvents }] = await Promise.all([
    supabase
      .from("performers")
      .select("name, slug, photo_url, genres, follower_count, is_chicago_resident")
      .order("is_chicago_resident", { ascending: false })
      .order("follower_count", { ascending: false })
      .limit(500),
    supabase
      .from("events")
      .select("id, event_date, start_time, external_url, performer:performers(name, slug, photo_url), venue:venues(name)")
      .gte("event_date", friday)
      .lte("event_date", sunday)
      .order("event_date", { ascending: true })
      .limit(20),
  ]);

  const weekendEvents: WeekendEvent[] = (rawEvents || []).map((e: Record<string, unknown>) => ({
    ...e,
    performer: Array.isArray(e.performer) ? e.performer[0] ?? null : e.performer,
    venue: Array.isArray(e.venue) ? e.venue[0] ?? null : e.venue,
  })) as WeekendEvent[];

  // Group by date
  const grouped = weekendEvents.reduce<Record<string, WeekendEvent[]>>((acc, ev) => {
    (acc[ev.event_date] ??= []).push(ev);
    return acc;
  }, {});

  const dayLabel = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

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

      {/* Weekend Shows */}
      {weekendEvents.length > 0 && (
        <div className="mx-auto mb-16 max-w-4xl">
          <div className="mb-6 flex flex-col items-center gap-1 text-center">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray">
              <Calendar size={14} className="text-pink" />
              This Weekend
            </h2>
            <p className="text-xs text-light-gray">{weekendLabel}</p>
          </div>

          <div className="flex flex-col gap-6">
            {Object.entries(grouped).map(([date, events]) => (
              <div key={date}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-pink">
                  {dayLabel(date)}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {events.map((event) => {
                    const Wrapper = event.external_url ? "a" : "div";
                    const wrapperProps = event.external_url
                      ? { href: event.external_url, target: "_blank" as const, rel: "noopener noreferrer" }
                      : {};
                    return (
                      <Wrapper
                        key={event.id}
                        {...wrapperProps}
                        className="group flex items-center gap-4 rounded-xl border border-light-gray/15 bg-bg-card px-5 py-4 transition-all hover:border-pink/20"
                      >
                        {/* Artist photo */}
                        {event.performer?.photo_url ? (
                          <img
                            src={event.performer.photo_url}
                            alt={event.performer.name}
                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple to-blue text-sm font-bold">
                            {event.performer?.name?.[0] || "?"}
                          </div>
                        )}

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          {event.performer && (
                            <Link
                              href={`/artist/${event.performer.slug}`}
                              className="truncate text-sm font-semibold hover:text-pink"
                            >
                              {event.performer.name}
                            </Link>
                          )}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            {event.venue && (
                              <p className="flex items-center gap-1 text-xs text-gray">
                                <MapPin size={10} />
                                {event.venue.name}
                              </p>
                            )}
                            {event.start_time && (
                              <p className="flex items-center gap-1 text-xs text-light-gray">
                                <Clock size={10} />
                                {formatTime(event.start_time)}
                              </p>
                            )}
                          </div>
                        </div>

                        {event.external_url && (
                          <ExternalLink size={14} className="shrink-0 text-light-gray transition-colors group-hover:text-pink" />
                        )}
                      </Wrapper>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
