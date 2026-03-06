"use client";

import { useState } from "react";
import { Copy, Share2, Check } from "lucide-react";
import { toast } from "sonner";

export function CardClient() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShareX = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent("Check out my collection on @decabordelive");
    window.open(
      `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink to-purple px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied!" : "Share Collection"}
      </button>

      <button
        onClick={handleShareX}
        className="flex items-center gap-2 rounded-lg border border-light-gray/20 bg-light-gray/5 px-6 py-3 text-sm font-medium text-[#EDEDED] transition-opacity hover:opacity-90"
      >
        <Share2 className="h-4 w-4" />
        Share on X
      </button>
    </div>
  );
}
