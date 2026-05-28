export type Emotion = "joy" | "sadness" | "anger" | "fear" | "calm" | "neutral";

export interface DiaryEntry {
  id: string;
  user_id: string;
  date: string;       // YYYY-MM-DD
  text: string;
  emotion: Emotion;
  intensity: number;  // 0.0–1.0
  color: string;      // hex
  keywords: string[];
  summary: string;
  created_at: string;
}

export interface AnalyzeResult {
  emotion: Emotion;
  intensity: number;
  color: string;
  keywords: string[];
  summary: string;
}
