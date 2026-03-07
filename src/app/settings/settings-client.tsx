"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, LogOut, Eye, EyeOff, Users, Camera, Loader2 } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { toast } from "sonner";
import type { PrivacySetting } from "@/lib/types/social";

type Fan = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
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
  const [avatarUrl, setAvatarUrl] = useState(fan?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [privacy, setPrivacy] = useState<PrivacySetting>("public");
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);

  // Fetch privacy setting on mount
  useEffect(() => {
    fetch("/api/social/privacy")
      .then((r) => r.json())
      .then((data) => {
        if (data.visibility) setPrivacy(data.visibility);
      })
      .catch(() => {})
      .finally(() => setPrivacyLoading(false));
  }, []);

  async function handlePrivacyChange(newVisibility: PrivacySetting) {
    setPrivacy(newVisibility);
    setPrivacySaving(true);
    try {
      const res = await fetch("/api/social/privacy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: newVisibility }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Privacy setting updated");
    } catch {
      toast.error("Failed to update privacy");
    } finally {
      setPrivacySaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch("/api/settings/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Upload failed"); return; }
      setAvatarUrl(data.avatar_url);
      toast.success("Profile picture updated");
      router.refresh();
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  }

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
            href="/passport"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-light-gray/20 text-gray transition-colors hover:border-pink/30 hover:text-pink"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-8 space-y-6">
        {/* Profile Picture */}
        <section className="rounded-xl border border-light-gray/10 bg-bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray">Profile Picture</h2>
          <div className="flex items-center gap-5">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover ring-2 ring-light-gray/20" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink/20 to-purple/20 ring-2 ring-light-gray/20">
                  <Camera size={24} className="text-gray" />
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-bg/70">
                  <Loader2 size={20} className="animate-spin text-pink" />
                </div>
              )}
            </div>
            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-light-gray/20 px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-pink/30 hover:text-pink">
                <Camera size={14} />
                {avatarUrl ? "Change" : "Upload"}
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
              </label>
              <p className="mt-1.5 text-xs text-light-gray">JPG, PNG. Max 5MB.</p>
            </div>
          </div>
        </section>

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
            className="mb-4 w-full rounded-lg border border-light-gray/20 bg-bg px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-light-gray/50 outline-none transition-colors focus:border-pink"
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

        {/* Privacy */}
        <section className="rounded-xl border border-light-gray/10 bg-bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray">Passport Privacy</h2>
          {privacyLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-light-gray/10" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {([
                {
                  value: "public" as const,
                  label: "Public",
                  description: "Anyone can see your passport",
                  icon: Eye,
                },
                {
                  value: "mutual" as const,
                  label: "Mutual Followers",
                  description: "Only people you both follow",
                  icon: Users,
                },
                {
                  value: "private" as const,
                  label: "Private",
                  description: "Only you can see your passport",
                  icon: EyeOff,
                },
              ]).map((option) => (
                <button
                  key={option.value}
                  onClick={() => handlePrivacyChange(option.value)}
                  disabled={privacySaving}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                    privacy === option.value
                      ? "border-pink/40 bg-pink/5"
                      : "border-light-gray/10 hover:border-light-gray/30"
                  } disabled:opacity-50`}
                >
                  <option.icon
                    size={18}
                    className={
                      privacy === option.value ? "text-pink" : "text-gray"
                    }
                  />
                  <div className="flex-1">
                    <div
                      className={`text-sm font-medium ${
                        privacy === option.value
                          ? "text-[var(--text)]"
                          : "text-gray"
                      }`}
                    >
                      {option.label}
                    </div>
                    <div className="text-xs text-light-gray">
                      {option.description}
                    </div>
                  </div>
                  {privacy === option.value && (
                    <div className="h-2 w-2 rounded-full bg-pink" />
                  )}
                </button>
              ))}
            </div>
          )}
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
