import { NextRequest, NextResponse } from "next/server";
import type { AnalyzeResult, Emotion } from "@/lib/types";
import { EMOTION_META } from "@/lib/emotions";

const EMOTION_COLORS: Record<Emotion, string> = {
  joy:     "#f5a623",
  sadness: "#6ab0f5",
  anger:   "#e05252",
  fear:    "#b06af5",
  calm:    "#52c8a0",
  neutral: "#8899aa",
};

const SYSTEM_PROMPT = `あなたは感情を色と揺らぎで観測するアシスタントです。
ユーザーが書いた一言から以下をJSONで返してください。診断・アドバイスは絶対にしないこと。

{
  "emotion": "joy|sadness|anger|fear|calm|neutral のいずれか",
  "intensity": 0.0〜1.0の数値（感情の強さ）,
  "keywords": ["キーワード1", "キーワード2"],
  "summary": "20字以内の叙情的な一文（「今日の色は〜」形式。診断・点数・アドバイス禁止）"
}

JSONのみを返してください。余計なテキスト不要。`;

export async function POST(req: NextRequest) {
  const { text } = await req.json() as { text: string };
  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(fallback(text), { status: 200 });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aurora-diary.vercel.app",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text.slice(0, 300) },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!res.ok) return NextResponse.json(fallback(text), { status: 200 });

    const data = await res.json() as { choices: { message: { content: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
      emotion: Emotion;
      intensity: number;
      keywords: string[];
      summary: string;
    };

    const emotion: Emotion = Object.keys(EMOTION_META).includes(parsed.emotion)
      ? parsed.emotion
      : "neutral";

    const result: AnalyzeResult = {
      emotion,
      intensity: Math.min(1, Math.max(0, Number(parsed.intensity) || 0.5)),
      color: EMOTION_COLORS[emotion],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 3) : [],
      summary: (parsed.summary ?? "").slice(0, 30),
    };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(fallback(text), { status: 200 });
  }
}

function fallback(text: string): AnalyzeResult {
  const emotion: Emotion = "neutral";
  return {
    emotion,
    intensity: 0.5,
    color: EMOTION_COLORS[emotion],
    keywords: [],
    summary: "今日の色が静かに漂う",
  };
}
