"use client";
import { motion } from "framer-motion";
import { logEvent } from "@/lib/logEvent";

const ONBOARD_KEY = "aurora_onboarded";

export function markOnboarded(): void {
  if (typeof window !== "undefined") localStorage.setItem(ONBOARD_KEY, "1");
}

const EXAMPLES = [
  "電車が混んでた",
  "ランチがおいしかった",
  "なんとなくだるい",
  "久しぶりに笑った",
];

interface Props {
  onDone: () => void;
}

export function OnboardingOverlay({ onDone }: Props) {
  const handleDone = () => {
    markOnboarded();
    logEvent("onboarding_complete");
    onDone();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,3,8,0.93)",
        backdropFilter: "blur(14px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 32px",
        gap: 32,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        style={{ textAlign: "center" }}
      >
        <p style={{
          fontSize: 20,
          fontWeight: 600,
          color: "rgba(255,255,255,0.8)",
          letterSpacing: "0.18em",
          marginBottom: 12,
        }}>
          AuroraDiary
        </p>
        <p style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.36)",
          letterSpacing: "0.05em",
          lineHeight: 1.9,
        }}>
          今日の何かを書くと、<br />
          AIが感情を色に変えて<br />
          月に還してくれます
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ width: "100%", maxWidth: 300 }}
      >
        <p style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.1em",
          marginBottom: 10,
          textAlign: "center",
        }}>
          こんな一言でいい
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {EXAMPLES.map((ex, i) => (
            <motion.div
              key={ex}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.62 + i * 0.1, duration: 0.3 }}
              style={{
                padding: "9px 14px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                fontSize: 13,
                color: "rgba(255,255,255,0.48)",
                letterSpacing: "0.02em",
              }}
            >
              {ex}
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.15, duration: 0.4 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
      >
        <motion.button
          onClick={handleDone}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: "13px 44px",
            borderRadius: 22,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.13)",
            color: "rgba(255,255,255,0.65)",
            fontSize: 13,
            cursor: "pointer",
            letterSpacing: "0.08em",
          }}
        >
          書いてみる
        </motion.button>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.14)", letterSpacing: "0.05em" }}>
          感情じゃなくていい。出来事でいい。
        </p>
      </motion.div>
    </motion.div>
  );
}
