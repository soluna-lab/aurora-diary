"use client";
import { useCallback } from "react";
import { logEvent } from "@/lib/logEvent";

interface WallpaperExportProps {
  moonColor: string;
  month: string;    // "2026年5月"
  entryCount: number;
  summary?: string | null;
}

export function WallpaperExport({ moonColor, month, entryCount, summary }: WallpaperExportProps) {
  const handleSave = useCallback(async () => {
    const size = 1080;
    const hasSummary = !!summary?.trim();
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#000308";
    ctx.fillRect(0, 0, size, size);

    const r = parseInt(moonColor.slice(1, 3), 16);
    const g = parseInt(moonColor.slice(3, 5), 16);
    const b = parseInt(moonColor.slice(5, 7), 16);

    // サマリーありなら月を少し上に配置してテキスト領域を確保
    const moonCY = hasSummary ? size * 0.40 : size * 0.50;
    const moonR  = hasSummary ? size * 0.27 : size * 0.30;

    // 月グロー
    const glow = ctx.createRadialGradient(size / 2, moonCY, 0, size / 2, moonCY, size * 0.44);
    glow.addColorStop(0, `rgba(${r},${g},${b},0.5)`);
    glow.addColorStop(0.6, `rgba(${r},${g},${b},0.15)`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // 月ボール（ハイライトオフセットで3D感）
    const moonGrad = ctx.createRadialGradient(
      size / 2 - moonR * 0.15, moonCY - moonR * 0.1, 0,
      size / 2, moonCY, moonR * 1.08
    );
    moonGrad.addColorStop(0, `rgba(255,255,255,0.18)`);
    moonGrad.addColorStop(0.4, `rgba(${r},${g},${b},0.85)`);
    moonGrad.addColorStop(1, `rgba(${r},${g},${b},0.3)`);

    ctx.beginPath();
    ctx.arc(size / 2, moonCY, moonR, 0, Math.PI * 2);
    ctx.fillStyle = moonGrad;
    ctx.fill();

    ctx.textAlign = "center";

    // サマリーテキスト（最大2行・日本語折り返し）
    if (hasSummary) {
      const fontSize = size * 0.031;
      ctx.font = `${fontSize}px -apple-system, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      const maxW = size * 0.74;
      const chars = summary!.trim().split("");
      let line = "", lines: string[] = [];
      for (const ch of chars) {
        if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; }
        else line += ch;
      }
      if (line) lines.push(line);
      const startY = size * 0.745;
      const lh = fontSize * 1.8;
      lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, size / 2, startY + i * lh));
    }

    // 月ラベル・日数・ウォーターマーク
    const baseY = hasSummary ? 0.86 : 0.82;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `${size * 0.028}px -apple-system, sans-serif`;
    ctx.fillText(month, size / 2, size * baseY);

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.font = `${size * 0.018}px -apple-system, sans-serif`;
    ctx.fillText(`${entryCount}日の色`, size / 2, size * (baseY + 0.05));

    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.font = `${size * 0.014}px -apple-system, sans-serif`;
    ctx.fillText("AuroraDiary", size / 2, size * (baseY + 0.11));

    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aurora-${month}.png`;
      a.click();
      URL.revokeObjectURL(url);
      logEvent("wallpaper_save", { month, entry_count: entryCount, has_summary: hasSummary ? 1 : 0 });
    }, "image/png");
  }, [moonColor, month, entryCount, summary]);

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
