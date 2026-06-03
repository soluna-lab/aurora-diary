import type { DiaryEntry, AnalyzeResult, DailyFragment } from "./types";

const ENTRY_KEY = "aurora_diary_entries";
const FRAGMENT_KEY = "aurora_diary_fragments";

// ── entries ──────────────────────────────────────────

function loadAllEntries(): DiaryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(ENTRY_KEY) ?? "[]") as DiaryEntry[];
    // 旧形式（emotions/texts なし）の後方互換
    return raw.map(e => ({
      ...e,
      emotions: e.emotions ?? [{ emotion: e.emotion, weight: e.intensity ?? 0.5 }],
      texts: e.texts ?? [],
    }));
  } catch { return []; }
}

function saveAllEntries(entries: DiaryEntry[]): void {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const trimmed = entries.filter(e => e.date >= cutoff.toISOString().slice(0, 10));
  localStorage.setItem(ENTRY_KEY, JSON.stringify(trimmed));
}

export function getEntriesForMonth(ym: string): DiaryEntry[] {
  return loadAllEntries().filter(e => e.date.startsWith(ym));
}

export function upsertEntry(date: string, result: AnalyzeResult, texts: string[]): DiaryEntry {
  const all = loadAllEntries();
  const idx = all.findIndex(e => e.date === date);
  const entry: DiaryEntry = {
    id: idx >= 0 ? all[idx].id : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: "local",
    date,
    emotions: result.emotions,
    emotion: result.emotion,
    intensity: result.intensity,
    color: result.color,
    keywords: result.keywords,
    summary: result.summary,
    texts,
    created_at: new Date().toISOString(),
  };
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  saveAllEntries(all);
  return entry;
}

// ── fragments ─────────────────────────────────────────

function loadAllFragments(): DailyFragment[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FRAGMENT_KEY) ?? "[]") as DailyFragment[];
  } catch { return []; }
}

function saveAllFragments(fragments: DailyFragment[]): void {
  localStorage.setItem(FRAGMENT_KEY, JSON.stringify(fragments));
}

export function getFragmentsForDate(date: string): DailyFragment[] {
  return loadAllFragments().filter(f => f.date === date);
}

export function getAllFragments(): DailyFragment[] {
  return loadAllFragments();
}

export function addFragment(date: string, text: string): DailyFragment {
  const all = loadAllFragments();
  const fragment: DailyFragment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date,
    text: text.trim(),
    created_at: new Date().toISOString(),
  };
  all.push(fragment);
  saveAllFragments(all);
  return fragment;
}

export function removeFragment(id: string): void {
  saveAllFragments(loadAllFragments().filter(f => f.id !== id));
}

export function clearFragmentsForDate(date: string): void {
  saveAllFragments(loadAllFragments().filter(f => f.date !== date));
}

export function getOldFragmentDates(today: string): string[] {
  const all = loadAllFragments();
  return [...new Set(all.filter(f => f.date < today).map(f => f.date))].sort();
}

export function deleteEntry(date: string): void {
  saveAllEntries(loadAllEntries().filter(e => e.date !== date));
}

export function getTodayEntry(): DiaryEntry | null {
  const today = new Date().toISOString().slice(0, 10);
  return loadAllEntries().find(e => e.date === today) ?? null;
}

export function getStreak(): number {
  const all = loadAllEntries();
  if (all.length === 0) return 0;
  const dateSet = new Set(all.map(e => e.date));
  const DAY = 86400000;
  const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  // UTC midnight of today
  const now = Date.now();
  const todayMs = now - (now % DAY);

  // Start from today; if no entry today, allow yesterday (streak still alive)
  let startMs = todayMs;
  if (!dateSet.has(toDate(startMs))) {
    startMs -= DAY;
    if (!dateSet.has(toDate(startMs))) return 0;
  }

  let streak = 0;
  for (let ms = startMs; dateSet.has(toDate(ms)); ms -= DAY) streak++;
  return streak;
}
