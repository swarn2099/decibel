"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, LogOut } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { toast } from "sonner";

type Fan = {
  id: string;
  email: string;
  name: string | null;
};

export function SettingsClient({
  fan,
  userEmail,
}: {
  fan: Fan | null;
  userEmail: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(fan?.name || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }

      toast.success("Display name updated");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await createSupabaseBrowser().auth.signOut();
    toast.success("Signed out");
    router.push("/");
  }

  return (
    <div className="min-h-dvh bg-bg pt-14">
      {/* Header */}
      <header className="border-b border-light-gray/10 px-6 py-4">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Link
            href="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-light-gray/20 text-gray transition-colors hover:border-pink/30 hover:text-pink"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-8 space-y-6">
        {/* Display Name */}
        <section className="rounded-xl border border-light-gray/10 bg-bg-card p-5">
          <label
            htmlFor="displayName"
            className="mb-2 block text-sm font-semibold text-gray"
          >
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="mb-4 w-full rounded-lg border border-light-gray/20 bg-bg px-4 py-2.5 text-sm text-white placeholder:text-light-gray/50 outline-none transition-colors focus:border-pink"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink to-purple px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save"}
          </button>
        </section>

        {/* Account */}
        <section className="rounded-xl border border-light-gray/10 bg-bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray">Account</h2>
          <p className="mb-4 text-sm text-light-gray">{userEmail}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:border-red-500/50 hover:bg-red-500/10"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </section>
      </main>
    </div>
  );
}
