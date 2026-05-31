"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DiaryEntry } from "@/lib/types";
import { EMOTION_META, blendColors } from "@/lib/emotions";

interface Props {
  entries: DiaryEntry[];
  ym: string; // "2026-05"
}

function getDaysInMonth(ym: string): string[] {
  const [y, m] = ym.split("-").map(Number);
  const total = new Date(y, m, 0).getDate();
  return Array.from({ length: total }, (_, i) =>
    `${ym}-${String(i + 1).padStart(2, "0")}`
  );
}

const SWAY = ["curtainSway0", "curtainSway1", "curtainSway2", "curtainSway3"];

export function ColorTimeline({ entries, ym }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const days = getDaysInMonth(ym);
  const todayStr = new Date().toISOString().slice(0, 10);
  const entryMap = new Map(entries.map(e => [e.date, e]));

  // 月の平均色（未記録日に使用）
  const avgColor = blendColors(entries.map(e => ({ color: e.color, intensity: e.intensity })));

  const selectedEntry = selected ? (entryMap.get(selected) ?? null) : null;

  return (
    <div>
      {/* カーテン本体 */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        height: 180,
        width: "100%",
        overflow: "visible",
      }}>
        {days.map((date, i) => {
          const entry = entryMap.get(date);
          const color = entry?.color ?? avgColor;
          const intensity = entry?.intensity ?? 0;
          const hasEntry = !!entry;
          const isToday = date === todayStr;
          const isSelected = date === selected;

          const h = hasEntry ? Math.round(80 + intensity * 96) : 68;

          const hex = color.replace("#", "");
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);

          const alphaTop = hasEntry ? 0.88 : 0.20;
          const alphaBot = hasEntry ? 0.38 : 0.07;
          const bg = `linear-gradient(to bottom, rgba(${r},${g},${b},${alphaTop}) 0%, rgba(${r},${g},${b},${alphaBot}) 100%)`;
          const glow = hasEntry ? `0 0 10px rgba(${r},${g},${b},0.32)` : "none";

          const dur = 2.0 + (i % 9) * 0.14;
          const delay = -((i * 0.31) % dur);

          return (
            <div
              key={date}
              onClick={() => setSelected(isSelected ? null : date)}
              title={`${date.slice(5).replace("-", "/")}${hasEntry ? ` — ${EMOTION_META[entry.emotion].label}` : ""}`}
              style={{
                flex: 1,
                height: h,
                background: bg,
                boxShadow: glow,
                transformOrigin: "top center",
                animation: `${SWAY[i % 4]} ${dur}s ease-in-out ${delay}s infinite`,
                cursor: "pointer",
                position: "relative",
                outline: isSelected ? "1px solid rgba(255,255,255,0.28)" : "none",
                outlineOffset: "-1px",
                transition: "height 0.4s ease",
              }}
            >
              {/* 今日マーカー */}
              {isToday && (
                <div style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0,
                  height: 2,
                  background: "rgba(255,255,255,0.8)",
                  borderRadius: "1px 1px 0 0",
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* 日付ラベル */}
      <div style={{ display: "flex", width: "100%", paddingTop: 5, paddingBottom: 2 }}>
        {days.map((date, i) => {
          const d = parseInt(date.slice(8));
          const show = d === 1 || d % 10 === 0 || d === days.length;
          return (
            <div key={date} style={{
              flex: 1,
              textAlign: "center",
              fontSize: 8,
              color: date === selected
                ? "rgba(255,255,255,0.55)"
                : "rgba(255,255,255,0.18)",
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
