"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { NewContactNotification } from "@/lib/types/social";

export function ContactSuggestions() {
  const [contacts, setContacts] = useState<NewContactNotification[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const storedEmails = localStorage.getItem("decibel_checked_contacts");
    const storedSince = localStorage.getItem(
      "decibel_contacts_last_checked"
    );

    if (!storedEmails || !storedSince) return;

    let emails: string[];
    try {
      emails = JSON.parse(storedEmails);
    } catch {
      return;
    }

    if (!Array.isArray(emails) || emails.length === 0) return;

    const emailsCsv = emails.join(",");
    fetch(
      `/api/social/contact-notify?emails=${encodeURIComponent(emailsCsv)}&since=${encodeURIComponent(storedSince)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.newContacts && data.newContacts.length > 0) {
          setContacts(data.newContacts);
        }
      })
      .catch(() => {});
  }, []);

  async function handleFollow(fanId: string) {
    try {
      const res = await fetch("/api/social/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetFanId: fanId, action: "follow" }),
      });
      if (!res.ok) throw new Error("Failed to follow");
      setFollowedIds((prev) => new Set([...prev, fanId]));
      toast.success("Followed!");
    } catch {
      toast.error("Failed to follow");
    }
  }

  function handleDismiss() {
    setDismissed(true);
    // Update last checked to now so we don't show these again
    localStorage.setItem(
      "decibel_contacts_last_checked",
      new Date().toISOString()
    );
  }

  if (dismissed || contacts.length === 0) return null;

  const shown = contacts.slice(0, 3);
  const remaining = contacts.length - 3;

  return (
    <div className="mb-6 rounded-xl border border-pink/20 bg-gradient-to-r from-pink/5 via-purple/5 to-pink/5 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-pink" />
          <h3 className="text-sm font-bold text-[var(--text)]">
            {contacts.length} of your contact{contacts.length !== 1 ? "s" : ""}{" "}
            joined Decibel!
          </h3>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-full p-1 text-gray hover:text-[var(--text)] transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {shown.map((c) => (
          <div
            key={c.fan.id}
            className="flex items-center justify-between rounded-lg bg-bg-card/50 px-3 py-2"
          >
            <Link
              href={`/passport/${c.fan.slug}`}
              className="text-sm font-medium text-[var(--text)] hover:text-pink transition-colors"
            >
              {c.fan.name}
            </Link>
            {followedIds.has(c.fan.id) ? (
              <span className="text-xs text-gray">Following</span>
            ) : (
              <button
                onClick={() => handleFollow(c.fan.id)}
                className="flex items-center gap-1 rounded-full border border-pink/30 px-3 py-1 text-xs font-medium text-pink hover:bg-pink/10 transition-colors"
              >
                <UserPlus size={12} />
                Follow
              </button>
            )}
          </div>
        ))}
        {remaining > 0 && (
          <p className="text-xs text-gray">
            +{remaining} more contact{remaining !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
