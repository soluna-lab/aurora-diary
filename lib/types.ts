export type Emotion = "joy" | "sadness" | "anger" | "fear" | "calm" | "neutral";

export interface EmotionWeight {
  emotion: Emotion;
  weight: number; // 0.0–1.0
}

export interface DailyFragment {
  id: string;
  date: string;       // YYYY-MM-DD
  text: string;
  created_at: string;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  date: string;
  emotions: EmotionWeight[];  // 感情ブレンド構成
  emotion: Emotion;            // 支配的感情（後方互換・表示用）
  intensity: number;           // 支配的感情のweight
  color: string;
  keywords: string[];
  summary: string;
  texts: string[];             // 確定時の断片テキスト群
  created_at: string;
}

export interface AnalyzeResult {
  emotions: EmotionWeight[];
  emotion: Emotion;
  intensity: number;
  color: string;
  keywords: string[];
  summary: string;
}
