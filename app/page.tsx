"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoonBall } from "@/components/MoonBall";
import { ParticleField } from "@/components/ParticleField";
import { EmotionOrb } from "@/components/EmotionOrb";
import { DiaryInput } from "@/components/DiaryInput";
import { AdGate } from "@/components/AdGate";
import { ColorTimeline } from "@/components/ColorTimeline";
import { ShareButton } from "@/components/ShareButton";
import { logEvent, initSessionTracking } from "@/lib/logEvent";
import {
  getEntriesForMonth, upsertEntry,
  getFragmentsForDate, getAllFragments, addFragment, removeFragment,
  clearFragmentsForDate, getOldFragmentDates, getTodayEntry, getStreak, deleteEntry,
} from "@/lib/storage";
import { blendColors } from "@/lib/emotions";
import type { DiaryEntry, DailyFragment, AnalyzeResult } from "@/lib/types";
import dynamic from "next/dynamic";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";

const WallpaperExport = dynamic(
  () => import("@/components/WallpaperExport").then(m => ({ default: m.WallpaperExport })),
  { ssr: false }
);

type View = "home" | "month";

function todayStr(): string {
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
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [fragments, setFragments] = useState<DailyFragment[]>([]);
  const [moonColor, setMoonColor] = useState("#8899aa");
  const [pulseSignal, setPulseSignal] = useState(0);
  const [burstSignal, setBurstSignal] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [orbProps, setOrbProps] = useState<{ color: string; moonCenter: { x: number; y: number }; startPos: { x: number; y: number } } | null>(null);
  const [showSummaryAd, setShowSummaryAd] = useState(false);
  const [monthSummary, setMonthSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [todayEntry, setTodayEntry] = useState<DiaryEntry | null>(null);
  const [streak, setStreak] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const moonRef = useRef<HTMLDivElement>(null);
  const streakLoggedRef = useRef(false);

  const ym = currentMonth();

  const loadEntries = useCallback(() => {
    const data = getEntriesForMonth(ym);
    setEntries(data);
    setMoonColor(blendColors(data.map(e => ({ color: e.color, intensity: e.intensity }))));
    setTodayEntry(getTodayEntry());
    setStreak(getStreak());
  }, [ym]);

  const loadFragments = useCallback(() => {
    setFragments(getFragmentsForDate(todayStr()));
  }, []);

  // 前日以前の未確定断片を自動確定（サイレント・1回/日付）
  const autocrystallizeOld = useCallback(async () => {
    const today = todayStr();
    const oldDates = getOldFragmentDates(today);
    if (oldDates.length === 0) return;

    for (const date of oldDates) {
      const dayFragments = getAllFragments().filter(f => f.date === date);
      if (dayFragments.length === 0) continue;
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: dayFragments.map(f => f.text) }),
        });
        if (res.ok) {
          const result: AnalyzeResult = await res.json();
          upsertEntry(date, result, dayFragments.map(f => f.text));
          clearFragmentsForDate(date);
          logEvent("auto_crystallize", { date, fragment_count: dayFragments.length });
        }
      } catch { /* silently fail — fragments remain for next attempt */ }
    }
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    const cleanup = initSessionTracking();
    loadEntries();
    loadFragments();
    autocrystallizeOld();
    if (localStorage.getItem("aurora_onboarded") !== "1") setShowOnboarding(true);
    return cleanup;
  }, [loadEntries, loadFragments, autocrystallizeOld]);

  useEffect(() => {
    if (streak > 1 && !streakLoggedRef.current) {
      logEvent("streak_view", { days: streak });
      streakLoggedRef.current = true;
    }
  }, [streak]);

  // 断片追加（API 不使用）
  const handleAddFragment = useCallback((text: string) => {
    addFragment(todayStr(), text);
    loadFragments();
    logEvent("fragment_add", { text_length: text.length });
  }, [loadFragments]);

  // 断片削除
  const handleRemoveFragment = useCallback((id: string) => {
    removeFragment(id);
    loadFragments();
  }, [loadFragments]);

  // 確定ボタン → 広告ゲートを開く
  const handleCrystallize = useCallback(() => {
    if (fragments.length === 0) return;
    logEvent("crystallize_intent", { fragment_count: fragments.length });
    setShowAd(true);
  }, [fragments]);

  // 広告完了 → API 呼び出し → オーブアニメーション
  const handleAdComplete = useCallback(async () => {
    setShowAd(false);
    const currentFragments = getFragmentsForDate(todayStr());
    if (currentFragments.length === 0) return;

    setAnalyzing(true);
    const date = todayStr();
    const texts = currentFragments.map(f => f.text);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
      });
      const result: AnalyzeResult = await res.json();

      const moonRect = moonRef.current?.getBoundingClientRect();
      const moonCenter = moonRect
        ? { x: moonRect.left + moonRect.width / 2, y: moonRect.top + moonRect.height / 2 }
        : { x: window.innerWidth / 2, y: 220 };
      const startPos = { x: window.innerWidth / 2, y: window.innerHeight * 0.72 };

      setOrbProps({ color: result.color, moonCenter, startPos });

      upsertEntry(date, result, texts);
      clearFragmentsForDate(date);
      loadFragments();
      loadEntries();

      logEvent("diary_crystallize", {
        emotion: result.emotion,
        color: result.color,
        intensity: result.intensity,
        fragment_count: texts.length,
        emotion_blend: result.emotions.map(e => `${e.emotion}:${Math.round(e.weight * 100)}`).join(","),
      });
    } catch {
      // fail silently — fragments remain
    } finally {
      setAnalyzing(false);
    }
  }, [loadFragments, loadEntries]);

  const handleOrbAbsorbed = useCallback(() => {
    setOrbProps(null);
    setPulseSignal(p => p + 1);
    setBurstSignal(b => b + 1);
    logEvent("particle_burst");
  }, []);

  const handleDeleteEntry = useCallback((date: string) => {
    deleteEntry(date);
    loadEntries();
    logEvent("entry_delete", { date });
  }, [loadEntries]);

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
          month: monthLabel(ym),
        }),
      });
      const { text } = await res.json() as { text: string };
      setMonthSummary(text);
    } finally {
      setSummaryLoading(false);
    }
  }, [entries, ym]);

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

            <div ref={moonRef} style={{ marginTop: 24, marginBottom: 28, position: "relative" }}>
              <ParticleField color={moonColor} size={240} burstSignal={burstSignal} />
              <MoonBall color={moonColor} size={240} pulseSignal={pulseSignal} />
            </div>

            {streak > 1 && (
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", marginBottom: 10 }}>
                {streak}日連続
              </p>
            )}

            <button
              onClick={handleMonthView}
              style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer", marginBottom: 24, letterSpacing: "0.08em" }}
            >
              {monthLabel(ym)} の流れを見る →
            </button>

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
              {todayEntry && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    padding: "12px 16px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderLeft: `3px solid ${todayEntry.color}`,
                    borderRadius: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: "0.06em" }}>今日の色</p>
                    <button
                      onClick={() => handleDeleteEntry(todayStr())}
                      style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.04em", flexShrink: 0 }}
                    >
                      削除
                    </button>
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.55, letterSpacing: "0.02em" }}>
                    {todayEntry.summary}
                  </p>
                  {todayEntry.keywords.length > 0 && (
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 6 }}>
                      {todayEntry.keywords.map(k => `#${k}`).join("  ")}
                    </p>
                  )}
                </motion.div>
              )}
              <DiaryInput
                fragments={fragments}
                onAdd={handleAddFragment}
                onRemove={handleRemoveFragment}
                onCrystallize={handleCrystallize}
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
            style={{ width: "100%", maxWidth: 480, paddingTop: 48, paddingBottom: 60, display: "flex", flexDirection: "column" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", marginBottom: 20 }}>
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

            {entries.length > 0 && (
              <div style={{ padding: "0 20px 20px" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14,
                }}>
                  <div>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", letterSpacing: "0.06em", marginBottom: 2 }}>
                      {monthLabel(ym)}の軌跡
                    </p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", letterSpacing: "0.02em" }}>
                      {entries.length}日分の色
                    </p>
                  </div>
                  <WallpaperExport moonColor={moonColor} month={monthLabel(ym)} entryCount={entries.length} />
                </div>
              </div>
            )}

            <ColorTimeline entries={entries} ym={ym} />

            <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "28px 20px 0" }}>
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
            onCancel={() => { setShowAd(false); }}
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

      <AnimatePresence>
        {showOnboarding && (
          <OnboardingOverlay
            key="onboarding"
            onDone={() => setShowOnboarding(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
