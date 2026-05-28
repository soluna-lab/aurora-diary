"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoonBall } from "@/components/MoonBall";
import { EmotionOrb } from "@/components/EmotionOrb";
import { DiaryInput } from "@/components/DiaryInput";
import { AdGate } from "@/components/AdGate";
import { ColorTimeline } from "@/components/ColorTimeline";
import { ShareButton } from "@/components/ShareButton";
import { logEvent, initSessionTracking } from "@/lib/logEvent";
import { getEntriesForMonth, upsertEntry } from "@/lib/storage";
import { blendColors } from "@/lib/emotions";
import type { DiaryEntry, AnalyzeResult } from "@/lib/types";
import dynamic from "next/dynamic";

const WallpaperExport = dynamic(
  () => import("@/components/WallpaperExport").then(m => ({ default: m.WallpaperExport })),
  { ssr: false }
);

type View = "home" | "month";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
}

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [selectedDate, setSelectedDate] = useState(today());
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [moonColor, setMoonColor] = useState("#8899aa");
  const [pulseSignal, setPulseSignal] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [pendingResult, setPendingResult] = useState<AnalyzeResult | null>(null);
  const [orbProps, setOrbProps] = useState<{ color: string; moonCenter: { x: number; y: number }; startPos: { x: number; y: number } } | null>(null);
  const [showSummaryAd, setShowSummaryAd] = useState(false);
  const [monthSummary, setMonthSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const moonRef = useRef<HTMLDivElement>(null);

  const loadEntries = useCallback(() => {
    const data = getEntriesForMonth(currentMonth());
    setEntries(data);
    setMoonColor(blendColors(data.map(e => ({ color: e.color, intensity: e.intensity }))));
  }, []);

  useEffect(() => {
    const cleanup = initSessionTracking();
    loadEntries();
    return cleanup;
  }, [loadEntries]);

  const handlePush = useCallback(async (text: string) => {
    setAnalyzing(true);
    logEvent("diary_push_intent", { text_length: text.length });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const result: AnalyzeResult = await res.json();
      setPendingResult({ ...result, summary: text });
      setShowAd(true);
    } catch {
      setAnalyzing(false);
    }
  }, []);

  const handleAdComplete = useCallback(() => {
    setShowAd(false);
    if (!pendingResult) { setAnalyzing(false); return; }

    const moonRect = moonRef.current?.getBoundingClientRect();
    const moonCenter = moonRect
      ? { x: moonRect.left + moonRect.width / 2, y: moonRect.top + moonRect.height / 2 }
      : { x: window.innerWidth / 2, y: 220 };
    const startPos = { x: window.innerWidth / 2, y: window.innerHeight * 0.72 };

    setOrbProps({ color: pendingResult.color, moonCenter, startPos });

    upsertEntry(selectedDate, pendingResult, pendingResult.summary);
    logEvent("diary_push", {
      emotion: pendingResult.emotion,
      color: pendingResult.color,
      intensity: pendingResult.intensity,
      text_length: pendingResult.summary.length,
    });
    loadEntries();
    setPendingResult(null);
    setAnalyzing(false);
  }, [pendingResult, selectedDate, loadEntries]);

  const handleOrbAbsorbed = useCallback(() => {
    setOrbProps(null);
    setPulseSignal(p => p + 1);
  }, []);

  const handleMonthView = useCallback(() => {
    setView("month");
    logEvent("month_view_open");
  }, []);

  const handleSummaryAdComplete = useCallback(async () => {
    setShowSummaryAd(false);
    setSummaryLoading(true);
    logEvent("summary_generate");
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: entries.map(e => ({ emotion: e.emotion, intensity: e.intensity, summary: e.summary })),
          month: monthLabel(currentMonth()),
        }),
      });
      const { text } = await res.json() as { text: string };
      setMonthSummary(text);
    } finally {
      setSummaryLoading(false);
    }
  }, [entries]);

  const ym = currentMonth();

  return (
    <main style={{ minHeight: "100svh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center" }}>

      <AnimatePresence mode="wait">
        {view === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px" }}
          >
            <div style={{ textAlign: "center", paddingTop: 56, paddingBottom: 8 }}>
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                style={{ fontSize: 20, fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.75)" }}
              >
                AuroraDiary
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.35 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                style={{ fontSize: 11, letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", marginTop: 4 }}
              >
                今日の色を、月に還す
              </motion.p>
            </div>

            <div ref={moonRef} style={{ marginTop: 24, marginBottom: 28 }}>
              <MoonBall color={moonColor} size={240} pulseSignal={pulseSignal} />
            </div>

            <button
              onClick={handleMonthView}
              style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer", marginBottom: 24, letterSpacing: "0.08em" }}
            >
              {monthLabel(ym)} の流れを見る →
            </button>

            <div style={{ width: "100%" }}>
              <DiaryInput
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onPush={handlePush}
                loading={analyzing}
              />
            </div>

            <div style={{ marginTop: 32, marginBottom: 40 }}>
              <ShareButton text="今日の色を月に還した" />
            </div>
          </motion.div>
        )}

        {view === "month" && (
          <motion.div
            key="month"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            style={{ width: "100%", maxWidth: 480, padding: "48px 20px 60px", display: "flex", flexDirection: "column", gap: 24 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => setView("home")}
                style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer" }}
              >
                ← 戻る
              </button>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>
                {monthLabel(ym)}
              </h2>
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <MoonBall color={moonColor} size={160} />
            </div>

            <div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 16, letterSpacing: "0.08em" }}>
                今月の揺らぎ
              </p>
              <ColorTimeline entries={entries} />
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 20px" }}>
              {monthSummary ? (
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, letterSpacing: "0.04em" }}>
                  {monthSummary}
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                    {entries.length > 0 ? "今月の流れを眺めてみる" : "記録が溜まるとここに流れが現れます"}
                  </p>
                  {entries.length > 0 && !summaryLoading && (
                    <button
                      onClick={() => setShowSummaryAd(true)}
                      style={{
                        fontSize: 12, padding: "6px 16px", borderRadius: 16,
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.5)", cursor: "pointer",
                      }}
                    >
                      今月の色を読む
                    </button>
                  )}
                  {summaryLoading && (
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>読んでいます…</p>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <WallpaperExport moonColor={moonColor} month={monthLabel(ym)} entryCount={entries.length} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAd && (
          <AdGate
            key="push-ad"
            position="push"
            onComplete={handleAdComplete}
            onCancel={() => { setShowAd(false); setAnalyzing(false); setPendingResult(null); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSummaryAd && (
          <AdGate
            key="summary-ad"
            position="summary"
            onComplete={handleSummaryAdComplete}
            onCancel={() => setShowSummaryAd(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {orbProps && (
          <EmotionOrb
            key="orb"
            color={orbProps.color}
            moonCenter={orbProps.moonCenter}
            startPos={orbProps.startPos}
            onAbsorbed={handleOrbAbsorbed}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
