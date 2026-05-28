import type { DiaryEntry, AnalyzeResult } from "./types";

const KEY = "aurora_diary_entries";

function loadAll(): DiaryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as DiaryEntry[];
  } catch { return []; }
}

function saveAll(entries: DiaryEntry[]): void {
  // 直近12ヶ月分（約365件）だけ保持してlocalStorage肥大化を防ぐ
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const trimmed = entries.filter(e => e.date >= cutoff.toISOString().slice(0, 10));
  localStorage.setItem(KEY, JSON.stringify(trimmed));
}

export function getEntriesForMonth(ym: string): DiaryEntry[] {
  return loadAll().filter(e => e.date.startsWith(ym));
}

export function upsertEntry(date: string, result: AnalyzeResult, text: string): DiaryEntry {
  const all = loadAll();
  const existing = all.findIndex(e => e.date === date);
  const entry: DiaryEntry = {
    id: existing >= 0 ? all[existing].id : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: "local",
    date,
    text,
    emotion: result.emotion,
    intensity: result.intensity,
    color: result.color,
    keywords: result.keywords,
    summary: result.summary,
    created_at: new Date().toISOString(),
  };
  if (existing >= 0) all[existing] = entry;
  else all.push(entry);
  saveAll(all);
  return entry;
}
