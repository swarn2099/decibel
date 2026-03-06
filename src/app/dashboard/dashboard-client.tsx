"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, LogOut, Radio, Send, Users, Zap, Shield, Crown } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Performer = {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  genres: string[];
  city: string;
};

type Venue = { id: string; name: string; slug: string };

type FanRow = {
  scan_count: number;
  current_tier: string;
  last_scan_date: string;
  fans: { id: string; email: string; name: string | null };
};

type ScanRow = {
  id: string;
  event_date: string;
  capture_method: string;
  created_at: string;
  fans: { email: string; name: string | null };
  venues: { name: string } | null;
};

const TIER_COLORS: Record<string, { text: string; bg: string }> = {
  network: { text: "text-pink", bg: "bg-pink/10" },
  early_access: { text: "text-purple", bg: "bg-purple/10" },
  secret: { text: "text-blue", bg: "bg-blue/10" },
  inner_circle: { text: "text-teal", bg: "bg-teal/10" },
};

const TIER_LABELS: Record<string, string> = {
  network: "Network",
  early_access: "Early Access",
  secret: "Secret",
  inner_circle: "Inner Circle",
};

type Tab = "overview" | "fans" | "messages";

export function DashboardClient({
  performer,
  totalFans,
  tiers,
  recentScans,
  scanHistory,
  fanList,
  venues,
}: {
  performer: Performer;
  totalFans: number;
  tiers: { network: number; early_access: number; secret: number; inner_circle: number };
  recentScans: ScanRow[];
  scanHistory: { created_at: string }[];
  fanList: FanRow[];
  venues: Venue[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [goLiveVenue, setGoLiveVenue] = useState("");
  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  async function handleLogout() {
    await createSupabaseBrowser().auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div className="min-h-dvh bg-bg">
      {/* Header */}
      <header className="border-b border-light-gray/10 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{performer.name}</h1>
            <p className="text-xs text-gray">{performer.city} · {performer.genres?.join(", ")}</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/api/qr/${performer.slug}`}
              download={`${performer.slug}-qr.png`}
              className="flex items-center gap-2 rounded-lg border border-light-gray/20 px-3 py-2 text-xs transition-colors hover:border-pink/30"
            >
              <Download size={14} />
              QR Code
            </a>
            <GoLiveButton
              performerId={performer.id}
              venues={venues}
              goLiveVenue={goLiveVenue}
              setGoLiveVenue={setGoLiveVenue}
              liveStatus={liveStatus}
              setLiveStatus={setLiveStatus}
            />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-light-gray/20 px-3 py-2 text-xs text-gray transition-colors hover:border-pink/30 hover:text-pink"
            >
              <LogOut size={14} />
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-light-gray/10 px-6">
        <div className="mx-auto flex max-w-5xl gap-6">
          {(["overview", "fans", "messages"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 py-3 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-pink text-pink"
                  : "border-transparent text-gray hover:text-light-gray"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {tab === "overview" && (
          <OverviewTab
            totalFans={totalFans}
            tiers={tiers}
            recentScans={recentScans}
            scanHistory={scanHistory}
          />
        )}
        {tab === "fans" && <FansTab fanList={fanList} />}
        {tab === "messages" && <MessagesTab performerId={performer.id} />}
      </main>
    </div>
  );
}

function GoLiveButton({
  performerId,
  venues,
  goLiveVenue,
  setGoLiveVenue,
  liveStatus,
  setLiveStatus,
}: {
  performerId: string;
  venues: Venue[];
  goLiveVenue: string;
  setGoLiveVenue: (v: string) => void;
  liveStatus: string | null;
  setLiveStatus: (s: string | null) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  async function handleGoLive() {
    if (!goLiveVenue) return;
    const res = await fetch("/api/go-live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ performer_id: performerId, venue_id: goLiveVenue }),
    });
    if (res.ok) {
      setLiveStatus("live");
      setShowPicker(false);
    }
  }

  if (liveStatus === "live") {
    return (
      <span className="flex items-center gap-2 rounded-lg bg-teal/10 px-3 py-2 text-xs text-teal">
        <Radio size={14} className="animate-pulse" />
        LIVE
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink to-purple px-3 py-2 text-xs font-semibold"
      >
        <Radio size={14} />
        Go Live
      </button>
      {showPicker && (
        <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded-xl border border-light-gray/20 bg-bg-card p-4 shadow-lg">
          <p className="mb-2 text-xs text-gray">Select venue</p>
          <select
            value={goLiveVenue}
            onChange={(e) => setGoLiveVenue(e.target.value)}
            className="mb-3 w-full rounded-lg border border-light-gray/20 bg-bg px-3 py-2 text-sm outline-none"
          >
            <option value="">Choose...</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleGoLive}
            disabled={!goLiveVenue}
            className="w-full rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-bg disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}

function OverviewTab({
  totalFans,
  tiers,
  recentScans,
  scanHistory,
}: {
  totalFans: number;
  tiers: { network: number; early_access: number; secret: number; inner_circle: number };
  recentScans: ScanRow[];
  scanHistory: { created_at: string }[];
}) {
  // Build weekly scan data for chart
  const weeklyData = buildWeeklyData(scanHistory);

  return (
    <div className="flex flex-col gap-8">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={<Users size={18} />} label="Total Fans" value={totalFans} color="text-pink" />
        <StatCard icon={<Zap size={18} />} label="Network" value={tiers.network} color="text-pink" />
        <StatCard icon={<Shield size={18} />} label="Early Access" value={tiers.early_access} color="text-purple" />
        <StatCard icon={<Crown size={18} />} label="Inner Circle" value={tiers.inner_circle} color="text-teal" />
      </div>

      {/* Scan chart */}
      <div className="rounded-xl border border-light-gray/10 bg-bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray">Scans — Last 90 Days</h3>
        <div className="flex h-32 items-end gap-1">
          {weeklyData.map((week, i) => {
            const max = Math.max(...weeklyData.map((w) => w.count), 1);
            const height = (week.count / max) * 100;
            return (
              <div key={i} className="group relative flex flex-1 flex-col items-center">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-pink to-purple transition-all group-hover:opacity-80"
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
                <span className="absolute -top-5 hidden text-xs text-gray group-hover:block">
                  {week.count}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-light-gray">
          <span>12 weeks ago</span>
          <span>This week</span>
        </div>
      </div>

      {/* Recent scans */}
      <div className="rounded-xl border border-light-gray/10 bg-bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray">Recent Scans</h3>
        {recentScans.length === 0 ? (
          <p className="text-sm text-light-gray">No scans yet. Share your QR code to get started.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentScans.slice(0, 10).map((scan) => (
              <div
                key={scan.id}
                className="flex items-center justify-between rounded-lg border border-light-gray/10 px-4 py-2"
              >
                <div>
                  <p className="text-sm">{scan.fans?.name || scan.fans?.email}</p>
                  <p className="text-xs text-light-gray">
                    {scan.venues?.name || "Unknown venue"} · {scan.capture_method}
                  </p>
                </div>
                <p className="text-xs text-gray">
                  {new Date(scan.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FansTab({ fanList }: { fanList: FanRow[] }) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");

  const filtered = fanList.filter((f) => {
    const matchesSearch =
      !search ||
      f.fans.email.toLowerCase().includes(search.toLowerCase()) ||
      f.fans.name?.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === "all" || f.current_tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search fans..."
          className="flex-1 rounded-lg border border-light-gray/20 bg-bg-card px-4 py-2 text-sm outline-none placeholder:text-light-gray focus:border-pink/30"
        />
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="rounded-lg border border-light-gray/20 bg-bg-card px-4 py-2 text-sm outline-none"
        >
          <option value="all">All Tiers</option>
          <option value="network">Network</option>
          <option value="early_access">Early Access</option>
          <option value="secret">Secret</option>
          <option value="inner_circle">Inner Circle</option>
        </select>
      </div>

      <div className="rounded-xl border border-light-gray/10 bg-bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-light-gray/10 text-left text-xs text-gray">
              <th className="px-4 py-3">Fan</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3 text-right">Scans</th>
              <th className="hidden px-4 py-3 text-right sm:table-cell">Last Scan</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-light-gray">
                  No fans found.
                </td>
              </tr>
            ) : (
              filtered.map((f, i) => {
                const tc = TIER_COLORS[f.current_tier] || TIER_COLORS.network;
                return (
                  <tr key={i} className="border-b border-light-gray/5">
                    <td className="px-4 py-3">
                      <p className="text-sm">{f.fans.name || f.fans.email}</p>
                      {f.fans.name && (
                        <p className="text-xs text-light-gray">{f.fans.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tc.text} ${tc.bg}`}>
                        {TIER_LABELS[f.current_tier] || f.current_tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{f.scan_count}</td>
                    <td className="hidden px-4 py-3 text-right text-xs text-gray sm:table-cell">
                      {new Date(f.last_scan_date).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MessagesTab({ performerId }: { performerId: string }) {
  const [targetTier, setTargetTier] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        performer_id: performerId,
        subject,
        body,
        target_tier: targetTier === "all" ? null : targetTier,
      }),
    });

    if (res.ok) {
      setSent(true);
      setSubject("");
      setBody("");
    }
    setSending(false);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="rounded-full bg-teal/10 p-4">
          <Send size={24} className="text-teal" />
        </div>
        <p className="font-semibold">Message sent!</p>
        <button
          onClick={() => setSent(false)}
          className="text-sm text-pink hover:underline"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSend} className="mx-auto max-w-lg flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs text-gray">Send to</label>
        <select
          value={targetTier}
          onChange={(e) => setTargetTier(e.target.value)}
          className="w-full rounded-lg border border-light-gray/20 bg-bg-card px-4 py-2 text-sm outline-none"
        >
          <option value="all">All fans</option>
          <option value="network">Network only</option>
          <option value="early_access">Early Access+</option>
          <option value="secret">Secret Shows+</option>
          <option value="inner_circle">Inner Circle only</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="What's this about?"
          className="w-full rounded-lg border border-light-gray/20 bg-bg-card px-4 py-2 text-sm outline-none placeholder:text-light-gray focus:border-pink/30"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray">Message</label>
        <textarea
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Hey, I've got a secret set coming up..."
          className="w-full resize-none rounded-lg border border-light-gray/20 bg-bg-card px-4 py-3 text-sm outline-none placeholder:text-light-gray focus:border-pink/30"
        />
      </div>
      <button
        type="submit"
        disabled={sending || !body.trim()}
        className="w-full rounded-xl bg-gradient-to-r from-pink to-purple px-6 py-3 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-light-gray/10 bg-bg-card p-4">
      <div className={`mb-2 ${color}`}>{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray">{label}</p>
    </div>
  );
}

function buildWeeklyData(scans: { created_at: string }[]) {
  const weeks: number[] = new Array(13).fill(0);
  const now = Date.now();

  scans.forEach((s) => {
    const daysAgo = Math.floor((now - new Date(s.created_at).getTime()) / 86400000);
    const weekIndex = 12 - Math.min(Math.floor(daysAgo / 7), 12);
    weeks[weekIndex]++;
  });

  return weeks.map((count, i) => ({ week: i, count }));
}
