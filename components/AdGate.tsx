"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logEvent } from "@/lib/logEvent";

interface AdGateProps {
  position: "push" | "summary";
  onComplete: () => void;
  onCancel?: () => void;
  /** 背景に月のゆらぎが見えるため全画面ではなく overlay モード */
}

const AD_SEC = 8;

export function AdGate({ position, onComplete, onCancel }: AdGateProps) {
  const [countdown, setCountdown] = useState(AD_SEC);
  const [done, setDone] = useState(false);

  useEffect(() => {
    logEvent("ad_view", { position });
  }, [position]);

  useEffect(() => {
    if (done) return;
    if (countdown <= 0) {
      setDone(true);
      setTimeout(onComplete, 600);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, done, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,3,8,0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      {/* AdSense 枠（審査後に差し替え） */}
      <div
        style={{
          width: "min(340px, 90vw)",
          height: 160,
          background: "rgba(255,255,255,0.03)",
          border: "1px dashed rgba(255,255,255,0.08)",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.12)",
          fontSize: 11,
        }}
      >
        広告
      </div>

      <div style={{ textAlign: "center" }}>
        <AnimatePresence mode="wait">
          <motion.span
            key={countdown}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ fontSize: 36, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}
          >
            {done ? "✓" : countdown}
          </motion.span>
        </AnimatePresence>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4, letterSpacing: "0.08em" }}>
          {position === "push" ? "感情を月に還しています…" : "今月の流れを読んでいます…"}
        </p>
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", background: "none", border: "none", cursor: "pointer" }}
        >
          戻る
        </button>
      )}
    </motion.div>
  );
}
