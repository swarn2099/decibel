import { createSupabaseServer } from "@/lib/supabase-server";
import { PerformerGrid } from "@/components/performer-grid";
import { SearchBar } from "@/components/search-bar";
import Link from "next/link";
import { Calendar, MapPin, Clock, ExternalLink } from "lucide-react";
import { PerformerImage } from "@/components/performer-image";

export const revalidate = 300;

function getUpcomingWeekendRange(): { start: string; end: string; label: string; sectionTitle: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const monthDay = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const today = fmt(now);

  if (day === 5) {
    // Friday — show Fri + Sat
    const sat = new Date(now);
    sat.setDate(now.getDate() + 1);
    return { start: today, end: fmt(sat), label: `${monthDay(now)} – ${monthDay(sat)}`, sectionTitle: "This Weekend" };
  }
  if (day === 6) {
    // Saturday — show today only (Friday is past)
    return { start: today, end: today, label: monthDay(now), sectionTitle: "Tonight" };
  }
  if (day === 0) {
    // Sunday — show next Fri + Sat
    const fri = new Date(now);
    fri.setDate(now.getDate() + 5);
    const sat = new Date(fri);
    sat.setDate(fri.getDate() + 1);
    return { start: fmt(fri), end: fmt(sat), label: `${monthDay(fri)} – ${monthDay(sat)}`, sectionTitle: "Next Weekend" };
  }
  // Mon–Thu — show upcoming Fri + Sat
  const daysToFri = 5 - day;
  const fri = new Date(now);
  fri.setDate(now.getDate() + daysToFri);
  const sat = new Date(fri);
  sat.setDate(fri.getDate() + 1);
  return { start: fmt(fri), end: fmt(sat), label: `${monthDay(fri)} – ${monthDay(sat)}`, sectionTitle: "This Weekend" };
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

  const { start, end, label: weekendLabel, sectionTitle } = getUpcomingWeekendRange();

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
      .gte("event_date", start)
      .lte("event_date", end)
      .order("event_date", { ascending: true })
      .limit(20),
  ]);

  const weekendEvents: WeekendEvent[] = (rawEvents || []).map((e: Record<string, unknown>) => ({
    ...e,
    performer: Array.isArray(e.performer) ? e.performer[0] ?? null : e.performer,
    venue: Array.isArray(e.venue) ? e.venue[0] ?? null : e.venue,
  })) as WeekendEvent[];

  // Group by date, then by venue within each date
  const grouped = weekendEvents.reduce<Record<string, WeekendEvent[]>>((acc, ev) => {
    (acc[ev.event_date] ??= []).push(ev);
    return acc;
  }, {});

  type VenueGroup = { venue: string; events: WeekendEvent[] };
  function groupByVenue(events: WeekendEvent[]): VenueGroup[] {
    const map = new Map<string, WeekendEvent[]>();
    for (const ev of events) {
      const key = ev.venue?.name || "TBA";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return Array.from(map.entries()).map(([venue, evts]) => ({ venue, events: evts }));
  }

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
          Your live music passport. Collect artists, earn access, own your scene.
        </p>
        <div className="flex h-1 w-24 rounded-full bg-gradient-to-r from-pink to-purple" />
        <SearchBar className="mx-auto mt-2" />
        <Link
          href="/add"
          className="mt-2 inline-flex items-center gap-2 rounded-full border border-pink/20 bg-pink/5 px-5 py-2 text-sm font-medium text-pink transition-colors hover:bg-pink/10"
        >
          <span className="text-base">+</span>
          Add an Artist &amp; earn a Founder badge
        </Link>
      </div>

      {/* Weekend Shows */}
      {weekendEvents.length > 0 && (
        <div className="mx-auto mb-16 max-w-4xl">
          <div className="mb-6 flex flex-col items-center gap-1 text-center">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray">
              <Calendar size={14} className="text-pink" />
              {sectionTitle}
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
                  {groupByVenue(events).map((group) => {
                    const ticketUrl = group.events.find((e) => e.external_url)?.external_url;
                    const Wrapper = ticketUrl ? "a" : "div";
                    const wrapperProps = ticketUrl
                      ? { href: ticketUrl, target: "_blank" as const, rel: "noopener noreferrer" }
                      : {};

                    if (group.events.length === 1) {
                      // Single artist at venue — original card layout
                      const event = group.events[0];
                      return (
                        <Wrapper
                          key={event.id}
                          {...wrapperProps}
                          className="group flex items-center gap-4 rounded-xl border border-light-gray/15 bg-bg-card px-5 py-4 transition-all hover:border-pink/20"
                        >
                          {event.performer?.photo_url ? (
                            <PerformerImage
                              src={event.performer.photo_url}
                              alt={event.performer.name}
                              className="h-12 w-12 shrink-0 rounded-full object-cover"
                              fallbackClassName="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple to-blue text-sm font-bold"
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple to-blue text-sm font-bold">
                              {event.performer?.name?.[0] || "?"}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            {event.performer && (
                              <Link
                                href={`/artist/${event.performer.slug}`}
                                className="truncate text-sm font-semibold hover:text-pink"
                              >
                                {event.performer.name}
                              </Link>
                            )}
                            <p className="flex items-center gap-1 text-xs text-gray">
                              <MapPin size={10} />
                              {group.venue}
                            </p>
                          </div>
                          {ticketUrl && (
                            <ExternalLink size={14} className="shrink-0 text-light-gray transition-colors group-hover:text-pink" />
                          )}
                        </Wrapper>
                      );
                    }

                    // Multiple artists at same venue — grouped card
                    return (
                      <Wrapper
                        key={group.venue}
                        {...wrapperProps}
                        className="group rounded-xl border border-light-gray/15 bg-bg-card px-5 py-4 transition-all hover:border-pink/20"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-gray">
                            <MapPin size={12} className="text-pink" />
                            {group.venue}
                          </p>
                          {ticketUrl && (
                            <ExternalLink size={12} className="text-light-gray transition-colors group-hover:text-pink" />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {group.events.map((event) => (
                            <div key={event.id} className="flex items-center gap-2">
                              {event.performer?.photo_url ? (
                                <PerformerImage
                                  src={event.performer.photo_url}
                                  alt={event.performer.name}
                                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                                  fallbackClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple to-blue text-xs font-bold"
                                />
                              ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple to-blue text-xs font-bold">
                                  {event.performer?.name?.[0] || "?"}
                                </div>
                              )}
                              {event.performer && (
                                <Link
                                  href={`/artist/${event.performer.slug}`}
                                  className="text-sm font-medium hover:text-pink transition-colors"
                                >
                                  {event.performer.name}
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
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
