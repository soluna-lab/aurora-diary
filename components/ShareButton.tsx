"use client";
import { useState } from "react";
import { logEvent } from "@/lib/logEvent";

interface ShareButtonProps {
  text?: string;
  url?: string;
}

export function ShareButton({ text = "今日の色を月に還した", url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");
  const shareText = `${text} #AuroraDiary`;

  const handleX = () => {
    logEvent("share", { platform: "x" });
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const handleLine = () => {
    logEvent("share", { platform: "line" });
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      logEvent("share", { platform: "copy" });
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex gap-2">
      {[
        { label: "X", handler: handleX },
        { label: "LINE", handler: handleLine },
        { label: copied ? "コピー済み" : "URLコピー", handler: handleCopy },
      ].map(b => (
        <button
          key={b.label}
          onClick={b.handler}
          className="px-3 py-1.5 rounded-lg text-xs transition-all hover:scale-105 active:scale-95"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
