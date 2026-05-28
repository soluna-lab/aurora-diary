"use client";
import { motion } from "framer-motion";
import type { DiaryEntry } from "@/lib/types";
import { EMOTION_META } from "@/lib/emotions";

interface ColorTimelineProps {
  entries: DiaryEntry[];
  onSelectEntry?: (entry: DiaryEntry) => void;
}

export function ColorTimeline({ entries, onSelectEntry }: ColorTimelineProps) {
  if (entries.length === 0) {
    return (
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "20px 0" }}>
        まだ記録がありません
      </p>
    );
  }

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div style={{ overflowX: "auto", paddingBottom: 8 }}>
      <div style={{ display: "flex", gap: 6, minWidth: "max-content", padding: "4px 2px" }}>
        {sorted.map((entry, i) => {
          const day = entry.date.slice(8);
          const meta = EMOTION_META[entry.emotion];
          const h = Math.round(32 + entry.intensity * 52);

          return (
            <motion.button
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => onSelectEntry?.(entry)}
              title={`${entry.date} — ${meta.label}`}
              style={{
                width: 28,
                height: h,
                borderRadius: 6,
                background: entry.color,
                boxShadow: `0 0 8px ${entry.color}66`,
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
                alignSelf: "flex-end",
                position: "relative",
              }}
            >
              <span style={{
                position: "absolute",
                bottom: -18,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 9,
                color: "rgba(255,255,255,0.3)",
                whiteSpace: "nowrap",
              }}>
                {day}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
