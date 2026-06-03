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

  // パス1: 記録日は intensity → baseH、空白日は仮置き 0
  const rawStrips = days.map(date => {
    const entry = entryMap.get(date) ?? null;
    const [r, g, b] = hexToRgb(entry?.color ?? avgColor);
    return {
      date,
      baseH: entry ? Math.round(82 + entry.intensity * 102) : 0,
      hasEntry: !!entry,
      entry,
      r, g, b,
      isToday: date === todayStr,
    };
  });

  // パス2: 空白日の baseH を前後の記録日から線形補間（へこみをなくす）
  stripsRef.current = rawStrips.map((strip, i, arr) => {
    if (strip.hasEntry) return strip;
    let pi = -1, ni = -1;
    for (let j = i - 1; j >= 0; j--) { if (arr[j].hasEntry) { pi = j; break; } }
    for (let j = i + 1; j < arr.length; j++) { if (arr[j].hasEntry) { ni = j; break; } }
    const pH = pi >= 0 ? arr[pi].baseH : 0;
    const nH = ni >= 0 ? arr[ni].baseH : 0;
    let baseH: number;
    if (pi >= 0 && ni >= 0) {
      baseH = Math.round(pH + (nH - pH) * (i - pi) / (ni - pi));
    } else if (pi >= 0) {
      baseH = pH;
    } else if (ni >= 0) {
      baseH = nH;
    } else {
      baseH = 120;
    }
    return { ...strip, baseH };
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
      if (n === 0) { rafRef.current = requestAnimationFrame(draw); return; }
      const sw = W / n;
      const sel = selectedRef.current;

      // 低周波カーテン波で各日の高さを計算
      const heights = ss.map((s, i) => {
        const wave =
          30 * Math.sin(i * 0.14 + t * 0.42) +
          10 * Math.sin(i * 0.32 + t * 0.28) +
           4 * Math.sin(i * 0.07 + t * 0.18);
        return Math.max(20, s.baseH + wave);
      });

      // 水平グラデーション（記録のある日のみcolor stop・空白日は自動線形補間）
      const hGrad = ctx.createLinearGradient(0, 0, W, 0);
      const entryIdxs = ss.reduce<number[]>((a, s, i) => { if (s.hasEntry) a.push(i); return a; }, []);

      if (entryIdxs.length === 0) {
        const f = ss[0];
        hGrad.addColorStop(0, `rgba(${f.r},${f.g},${f.b},0.22)`);
        hGrad.addColorStop(1, `rgba(${f.r},${f.g},${f.b},0.22)`);
      } else {
        const fi = ss[entryIdxs[0]];
        const li = ss[entryIdxs[entryIdxs.length - 1]];
        hGrad.addColorStop(0, `rgba(${fi.r},${fi.g},${fi.b},0.9)`);
        for (const idx of entryIdxs) {
          const s = ss[idx];
          hGrad.addColorStop(idx / Math.max(n - 1, 1), `rgba(${s.r},${s.g},${s.b},0.9)`);
        }
        hGrad.addColorStop(1, `rgba(${li.r},${li.g},${li.b},0.9)`);
      }

      // Catmull-Romスプラインで1本の滑らかな面を描く
      // pts: strip左端(j=0..n-1) + 右端補助点(j=n)
      const ptLen = n + 1;
      const ptX = (j: number) => (j < n ? j * sw : W);
      const ptY = (j: number) => (j < n ? heights[j] : heights[n - 1]);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_H);
      ctx.lineTo(ptX(0), ptY(0));

      for (let j = 0; j < ptLen - 1; j++) {
        const j0 = Math.max(0, j - 1);
        const j3 = Math.min(ptLen - 1, j + 2);
        ctx.bezierCurveTo(
          ptX(j)     + (ptX(j + 1) - ptX(j0)) / 6, ptY(j)     + (ptY(j + 1) - ptY(j0)) / 6,
          ptX(j + 1) - (ptX(j3)    - ptX(j))  / 6, ptY(j + 1) - (ptY(j3)    - ptY(j))  / 6,
          ptX(j + 1), ptY(j + 1),
        );
      }

      ctx.lineTo(W, CANVAS_H);
      ctx.closePath();

      // パス1: 水平グラデーション（横に感情色が流れる）
      ctx.fillStyle = hGrad;
      ctx.fill();

      // パス2: destination-in で縦フェードマスク（下に向かって透明に）
      ctx.globalCompositeOperation = 'destination-in';
      const vGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      vGrad.addColorStop(0,    'rgba(0,0,0,0.92)');
      vGrad.addColorStop(0.45, 'rgba(0,0,0,0.62)');
      vGrad.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, W, CANVAS_H);

      ctx.restore();

      // 選択ハイライト・今日マーカー（面の後に重ねる）
      for (let i = 0; i < n; i++) {
        const s = ss[i];
        const x = i * sw;
        const h = heights[i];

        if (s.date === sel) {
          ctx.strokeStyle = 'rgba(255,255,255,0.38)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, 0.5, sw - 1, h - 1);
        }

        if (s.isToday) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
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
                {/* 日付 */}
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginBottom: 8, letterSpacing: "0.06em" }}>
                  {selected.slice(5).replace("-", "/")}
                </p>
                {/* 感情ブレンド比 */}
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginBottom: 10, letterSpacing: "0.03em" }}>
                  {(selectedEntry.emotions ?? [{ emotion: selectedEntry.emotion, weight: selectedEntry.intensity }])
                    .sort((a, b) => b.weight - a.weight)
                    .map(e => `${EMOTION_META[e.emotion].label} ${Math.round(e.weight * 100)}%`)
                    .join(" / ")}
                </p>
                {/* サマリー */}
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 1.65, letterSpacing: "0.03em" }}>
                  {selectedEntry.summary}
                </p>
                {/* 元テキスト群 */}
                {(selectedEntry.texts ?? []).length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
                    {(selectedEntry.texts ?? []).map((t, i) => (
                      <p key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: "0.02em", lineHeight: 1.5 }}>
                        {t}
                      </p>
                    ))}
                  </div>
                )}
                {/* キーワード */}
                {selectedEntry.keywords.length > 0 && (
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 8 }}>
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
