"use client";
import { useState } from "react";
import { motion } from "framer-motion";

interface DiaryInputProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (d: string) => void;
  onPush: (text: string) => void;
  loading?: boolean;
}

export function DiaryInput({ selectedDate, onDateChange, onPush, loading = false }: DiaryInputProps) {
  const [text, setText] = useState("");

  const handlePush = () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    onPush(trimmed);
    setText("");
  };

  const canPush = text.trim().length > 0 && !loading;

  return (
    <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 日付選択 */}
      <input
        type="date"
        value={selectedDate}
        onChange={e => onDateChange(e.target.value)}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: "8px 14px",
          color: "rgba(255,255,255,0.6)",
          fontSize: 13,
          width: "100%",
          colorScheme: "dark",
        }}
      />

      {/* テキスト入力 */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, 200))}
          placeholder="今日の気持ちを、一言…"
          rows={3}
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 15,
            lineHeight: 1.6,
            width: "100%",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
            {text.length}/200
          </span>
          <motion.button
            onClick={handlePush}
            disabled={!canPush}
            whileHover={canPush ? { scale: 1.04 } : {}}
            whileTap={canPush ? { scale: 0.96 } : {}}
            style={{
              padding: "8px 22px",
              borderRadius: 20,
              border: "none",
              background: canPush ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
              color: canPush ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)",
              fontSize: 13,
              fontWeight: 600,
              cursor: canPush ? "pointer" : "not-allowed",
              letterSpacing: "0.06em",
              transition: "background 0.2s, color 0.2s",
            }}
          >
            {loading ? "…" : "Push"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
