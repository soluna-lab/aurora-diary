"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DiaryEntry } from "@/lib/types";
import { EMOTION_META, blendColors } from "@/lib/emotions";

interface Props {
  entries: DiaryEntry[];
  ym: string;
}

interface Strip {
  date: string;
  baseH: number;
  hasEntry: boolean;
  entry: DiaryEntry | null;
  r: number; g: number; b: number;
  isToday: boolean;
}

function getDaysInMonth(ym: string): string[] {
  const [y, m] = ym.split("-").map(Number);
  const total = new Date(y, m, 0).getDate();
  return Array.from({ length: total }, (_, i) =>
    `${ym}-${String(i + 1).padStart(2, "0")}`
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const CANVAS_H = 220;

export function ColorTimeline({ entries, ym }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const selectedRef = useRef<string | null>(null);
  const stripsRef = useRef<Strip[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  // refs always in sync — RAF reads these without restarting
  selectedRef.current = selected;

  const todayStr = new Date().toISOString().slice(0, 10);
  const entryMap = new Map(entries.map(e => [e.date, e]));
  const avgColor = blendColors(entries.map(e => ({ color: e.color, intensity: e.intensity })));
  const days = getDaysInMonth(ym);

  stripsRef.current = days.map(date => {
    const entry = entryMap.get(date) ?? null;
    const color = entry?.color ?? avgColor;
    const [r, g, b] = hexToRgb(color);
    return {
      date,
      baseH: entry ? Math.round(82 + entry.intensity * 102) : 68,
      hasEntry: !!entry,
      entry,
      r, g, b,
      isToday: date === todayStr,
    };
  });

  const selectedEntry = selected ? (entryMap.get(selected) ?? null) : null;

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const n = stripsRef.current.length;
    const idx = Math.max(0, Math.min(n - 1, Math.floor(x / (rect.width / n))));
    const strip = stripsRef.current[idx];
    setSelected(prev => (prev === strip.date ? null : strip.date));
  }, []);

  // Canvas animation — runs once, reads from refs each frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let startTime: number | null = null;
    let lastW = 0;

    const draw = (ts: number) => {
      if (!startTime) startTime = ts;
      const t = (ts - startTime) / 1000;

      const W = canvas.offsetWidth;
      if (W === 0) { rafRef.current = requestAnimationFrame(draw); return; }

      const dpr = window.devicePixelRatio || 1;
      if (lastW !== W) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(CANVAS_H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        lastW = W;
      }

      ctx.clearRect(0, 0, W, CANVAS_H);

      const ss = stripsRef.current;
      const n = ss.length;
      const sw = W / n;
      const sel = selectedRef.current;

      for (let i = 0; i < n; i++) {
        const s = ss[i];
        const x = i * sw;

        // 多周波数の進行波 → 布が風でゆれる裾の動き
        const wave =
          18 * Math.sin(i * 0.38 + t * 0.85) +
          10 * Math.sin(i * 0.71 + t * 0.52) +
           5 * Math.sin(i * 0.19 + t * 1.30);

        const h = Math.max(24, s.baseH + wave);

        // 上から下へフェードするグラデーション（布の光沢感）
        const aTop = s.hasEntry ? 0.90 : 0.22;
        const aMid = s.hasEntry ? 0.65 : 0.14;
        const aBot = s.hasEntry ? 0.28 : 0.06;
        const grad = ctx.createLinearGradient(x, 0, x, h);
        grad.addColorStop(0,   `rgba(${s.r},${s.g},${s.b},${aTop})`);
        grad.addColorStop(0.5, `rgba(${s.r},${s.g},${s.b},${aMid})`);
        grad.addColorStop(1,   `rgba(${s.r},${s.g},${s.b},${aBot})`);

        ctx.fillStyle = grad;
        ctx.fillRect(x, 0, sw, h);

        // ストリップ間の薄い影で布の縫い目・折り感
        ctx.fillStyle = "rgba(0,0,3,0.12)";
        ctx.fillRect(x + sw - 0.8, 0, 0.8, h);

        // 選択ハイライト
        if (s.date === sel) {
          ctx.strokeStyle = "rgba(255,255,255,0.38)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, 0.5, sw - 1, h - 1);
        }

        // 今日マーカー（上端の白ライン）
        if (s.isToday) {
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.fillRect(x, 0, sw, 2);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ width: "100%", height: CANVAS_H, display: "block", cursor: "pointer" }}
      />

      {/* 日付ラベル */}
      <div style={{ display: "flex", width: "100%", paddingTop: 5 }}>
        {days.map((date) => {
          const d = parseInt(date.slice(8));
          const show = d === 1 || d % 10 === 0 || d === days.length;
          return (
            <div key={date} style={{
              flex: 1,
              textAlign: "center",
              fontSize: 8,
              color: date === selected ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)",
            }}>
              {show ? d : ""}
            </div>
          );
        })}
      </div>

      {/* タップ時エントリーカード */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22 }}
            style={{
              margin: "16px 20px 0",
              padding: "14px 18px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12,
            }}
          >
            {selectedEntry ? (
              <>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8, letterSpacing: "0.06em" }}>
                  {selected.slice(5).replace("-", "/")} — {EMOTION_META[selectedEntry.emotion].label}
                </p>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 1.65, letterSpacing: "0.03em" }}>
                  {selectedEntry.summary}
                </p>
                {selectedEntry.keywords.length > 0 && (
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 8 }}>
                    {selectedEntry.keywords.map(k => `#${k}`).join("  ")}
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", letterSpacing: "0.04em" }}>
                この日はまだ記録がありません
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
