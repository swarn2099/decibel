"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Link from "next/link";
import type { MapVenue } from "@/lib/types/map";
import { PerformerImage } from "@/components/performer-image";
import "leaflet/dist/leaflet.css";

const CHICAGO_CENTER: [number, number] = [41.8827, -87.6233];
const DEFAULT_ZOOM = 12;
const TILE_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(timeStr: string | null) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return ` ${h12}:${m} ${ampm}`;
}

export default function MapClient() {
  const [venues, setVenues] = useState<MapVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [tonightMode, setTonightMode] = useState(false);
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Fetch venues from API
  const fetchVenues = async (genre: string | null, tonight: boolean) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (genre) params.set("genre", genre);
    if (tonight) params.set("tonight", "true");
    const qs = params.toString();
    try {
      const res = await fetch(`/api/map${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      setVenues(data.venues || []);
    } catch {
      setVenues([]);
    }
    setLoading(false);
  };

  // Initial load — fetch all venues and extract genres
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/map");
      const data = await res.json();
      const v: MapVenue[] = data.venues || [];
      setVenues(v);

      // Count genre frequency and pick top 10
      const freq: Record<string, number> = {};
      v.forEach((venue) => venue.genres.forEach((g) => (freq[g] = (freq[g] || 0) + 1)));
      const sorted = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([g]) => g);
      setAllGenres(sorted);
      setLoading(false);
    })();
  }, []);

  // Re-fetch when filter changes
  useEffect(() => {
    // Skip initial render (handled above)
    if (allGenres.length === 0 && !tonightMode) return;
    fetchVenues(selectedGenre, tonightMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGenre, tonightMode]);

  const dotRadius = (count: number) => Math.min(6 + count * 1.5, 14);

  return (
    <div className="flex flex-col pt-[56px] sm:pt-[72px]">
      {/* Filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        {/* Tonight toggle */}
        <button
          onClick={() => setTonightMode((p) => !p)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            tonightMode
              ? "border-pink bg-pink text-white"
              : "border-light-gray/20 bg-bg-card text-gray hover:border-pink/30"
          }`}
        >
          <span className={`inline-block h-2 w-2 rounded-full ${tonightMode ? "bg-white pulse-dot" : "bg-pink"}`} />
          Tonight
        </button>

        {/* Divider */}
        <div className="h-5 w-px shrink-0 bg-light-gray/20" />

        {/* All pill */}
        <button
          onClick={() => setSelectedGenre(null)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedGenre === null
              ? "border-pink bg-pink text-white"
              : "border-light-gray/20 bg-bg-card text-gray hover:border-pink/30"
          }`}
        >
          All
        </button>

        {/* Genre pills */}
        {allGenres.map((genre) => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre === selectedGenre ? null : genre)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              selectedGenre === genre
                ? "border-pink bg-pink text-white"
                : "border-light-gray/20 bg-bg-card text-gray hover:border-pink/30"
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="relative h-[calc(100vh-104px)] sm:h-[calc(100vh-128px)]">
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-bg/60">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink border-t-transparent" />
          </div>
        )}

        <MapContainer
          center={CHICAGO_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={true}
        >
          <TileLayer url={isDark ? TILE_DARK : TILE_LIGHT} attribution={TILE_ATTR} />

          {venues.map((venue) => (
            <CircleMarker
              key={venue.id}
              center={[venue.latitude, venue.longitude]}
              radius={dotRadius(venue.event_count)}
              pathOptions={{
                color: "#FF4D6A",
                fillColor: "#FF4D6A",
                fillOpacity: 0.7,
                weight: 1,
              }}
              className={tonightMode ? "pulse-dot" : ""}
            >
              <Popup maxWidth={280} className="decibel-popup">
                <div className="min-w-[200px]">
                  <h3 className="mb-2 text-base font-bold text-[var(--text)]">{venue.name}</h3>

                  {/* Top performers avatars */}
                  {venue.upcoming_events.some((e) => e.performer_photo) && (
                    <div className="mb-2 flex gap-1">
                      {venue.upcoming_events
                        .filter((e) => e.performer_photo)
                        .slice(0, 3)
                        .map((e) => (
                          <PerformerImage
                            key={e.id}
                            src={e.performer_photo!}
                            alt={e.performer_name}
                            className="h-7 w-7 rounded-full border border-light-gray/30 object-cover"
                            fallbackClassName="flex h-7 w-7 items-center justify-center rounded-full border border-light-gray/30 bg-gradient-to-br from-pink/20 to-purple/20 text-[10px] font-bold text-gray"
                          />
                        ))}
                    </div>
                  )}

                  {/* Event list */}
                  <div className="flex flex-col gap-1.5">
                    {venue.upcoming_events.slice(0, 5).map((event) => (
                      <div key={event.id} className="flex items-baseline gap-2 text-sm">
                        <span className="shrink-0 text-xs text-[var(--gray)]">
                          {formatDate(event.event_date)}
                          {formatTime(event.start_time)}
                        </span>
                        <Link
                          href={`/artist/${event.performer_slug}`}
                          className="truncate text-pink hover:underline"
                        >
                          {event.performer_name}
                        </Link>
                      </div>
                    ))}
                  </div>

                  {venue.upcoming_events.length > 5 && (
                    <p className="mt-1 text-xs text-[var(--gray)]">+{venue.upcoming_events.length - 5} more events</p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
