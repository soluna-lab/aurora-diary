"use client";
import { useCallback } from "react";
import { logEvent } from "@/lib/logEvent";

interface WallpaperExportProps {
  moonColor: string;
  month: string;    // "2026年5月"
  entryCount: number;
}

export function WallpaperExport({ moonColor, month, entryCount }: WallpaperExportProps) {
  const handleSave = useCallback(async () => {
    const size = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // 背景
    ctx.fillStyle = "#000308";
    ctx.fillRect(0, 0, size, size);

    // 月グロー
    const r = parseInt(moonColor.slice(1, 3), 16);
    const g = parseInt(moonColor.slice(3, 5), 16);
    const b = parseInt(moonColor.slice(5, 7), 16);

    const glow = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.45);
    glow.addColorStop(0, `rgba(${r},${g},${b},0.5)`);
    glow.addColorStop(0.6, `rgba(${r},${g},${b},0.15)`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // 月ボール
    const moonGrad = ctx.createRadialGradient(
      size * 0.43, size * 0.42, 0,
      size / 2, size / 2, size * 0.32
    );
    moonGrad.addColorStop(0, `rgba(255,255,255,0.18)`);
    moonGrad.addColorStop(0.4, `rgba(${r},${g},${b},0.85)`);
    moonGrad.addColorStop(1, `rgba(${r},${g},${b},0.3)`);

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = moonGrad;
    ctx.fill();

    // テキスト（診断的文言なし・叙情的のみ）
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `${size * 0.028}px -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(month, size / 2, size * 0.82);

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.font = `${size * 0.018}px -apple-system, sans-serif`;
    ctx.fillText(`${entryCount}日の色`, size / 2, size * 0.87);

    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.font = `${size * 0.014}px -apple-system, sans-serif`;
    ctx.fillText("AuroraDiary", size / 2, size * 0.93);

    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aurora-${month}.png`;
      a.click();
      URL.revokeObjectURL(url);
      logEvent("wallpaper_save", { month, entry_count: entryCount });
    }, "image/png");
  }, [moonColor, month, entryCount]);

  return (
    <button
      onClick={handleSave}
      style={{
        padding: "8px 20px",
        borderRadius: 20,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.55)",
        fontSize: 12,
        cursor: "pointer",
        letterSpacing: "0.06em",
      }}
    >
      壁紙として保存
    </button>
  );
}
