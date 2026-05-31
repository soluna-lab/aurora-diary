"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DailyFragment } from "@/lib/types";

interface DiaryInputProps {
  fragments: DailyFragment[];
  onAdd: (text: string) => void;
  onRemove: (id: string) => void;
  onCrystallize: () => void;
  loading: boolean;
}

export function DiaryInput({ fragments, onAdd, onRemove, onCrystallize, loading }: DiaryInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const today = new Date();
  const dateLabel = `${today.getMonth() + 1}月${today.getDate()}日`;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>

      {/* 断片リスト */}
      <AnimatePresence initial={false}>
        {fragments.map(f => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 16, transition: { duration: 0.14 } }}
            transition={{ duration: 0.18 }}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
            }}
          >
            <p style={{
              flex: 1,
              fontSize: 13,
              color: "rgba(255,255,255,0.62)",
              lineHeight: 1.55,
              letterSpacing: "0.02em",
              wordBreak: "break-all",
            }}>
              {f.text}
            </p>
            <button
              onClick={() => onRemove(f.id)}
              style={{
                flexShrink: 0,
                fontSize: 14,
                color: "rgba(255,255,255,0.18)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 2px",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* テキスト入力エリア */}
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", letterSpacing: "0.08em" }}>
          {dateLabel}
        </p>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value.slice(0, 200))}
          onKeyDown={handleKeyDown}
          placeholder="今日の何かを、ひとことで"
          rows={2}
          style={{
            width: "100%",
            fontSize: 14,
            color: "rgba(255,255,255,0.8)",
            lineHeight: 1.6,
            letterSpacing: "0.03em",
            caretColor: "rgba(255,255,255,0.55)",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <motion.button
            onClick={handleAdd}
            disabled={!text.trim()}
            whileTap={text.trim() ? { scale: 0.95 } : {}}
            style={{
              fontSize: 12,
              padding: "5px 16px",
              borderRadius: 14,
              background: text.trim() ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: text.trim() ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)",
              cursor: text.trim() ? "pointer" : "default",
              letterSpacing: "0.04em",
            }}
          >
            ＋ 追加する
          </motion.button>
        </div>
      </div>

      {/* 確定ボタン（断片が 1 件以上のときのみ表示） */}
      <AnimatePresence>
        {fragments.length > 0 && (
          <motion.button
            key="crystallize"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            onClick={onCrystallize}
            disabled={loading}
            style={{
              marginTop: 2,
              padding: "13px 0",
              borderRadius: 14,
              background: loading ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: loading ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.55)",
              fontSize: 13,
              letterSpacing: "0.08em",
              cursor: loading ? "default" : "pointer",
              width: "100%",
            }}
          >
            {loading ? "読み解いています…" : `今日の色を月に還す（${fragments.length}件）`}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
