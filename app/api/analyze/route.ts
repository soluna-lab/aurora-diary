import { NextRequest, NextResponse } from "next/server";
import type { AnalyzeResult, Emotion, EmotionWeight } from "@/lib/types";
import { EMOTION_META, blendEmotionColors } from "@/lib/emotions";

const EMOTIONS = Object.keys(EMOTION_META) as Emotion[];

const SYSTEM_PROMPT = `あなたは感情を色と揺らぎで観測するアシスタントです。
ユーザーが書いた一日の記録から感情の構成割合をJSONで返してください。
診断・アドバイスは絶対にしないこと。

{
  "emotions": [
    {"emotion": "joy|sadness|anger|fear|calm|neutral のいずれか", "weight": 0.0〜1.0}
  ],
  "keywords": ["キーワード1", "キーワード2"],
  "summary": "20字以内の叙情的な一文（「今日の色は〜」形式。診断・点数・アドバイス禁止）"
}

ルール:
- emotions の weight の合計は 1.0 になること
- 感情の種類は 1〜3 種類
- 支配的な感情を必ず含めること
- JSONのみを返してください。余計なテキスト不要。`;

export async function POST(req: NextRequest) {
  const body = await req.json() as { text?: string; texts?: string[] };
  const texts = body.texts ?? (body.text ? [body.text] : []);

  if (texts.length === 0) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  // 複数断片を番号付きで結合（最大 600 字）
  const combined = texts.map((t, i) => `${i + 1}. ${t}`).join("\n").slice(0, 600);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(fallback(), { status: 200 });
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: combined },
        ],
        max_tokens: 220,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return NextResponse.json(fallback(), { status: 200 });

    const data = await res.json() as { choices: { message: { content: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as {
      emotions: { emotion: string; weight: number }[];
      keywords: string[];
      summary: string;
    };

    const rawEmotions = Array.isArray(parsed.emotions) ? parsed.emotions : [];
    const emotions: EmotionWeight[] = rawEmotions
      .filter(e => EMOTIONS.includes(e.emotion as Emotion))
      .map(e => ({ emotion: e.emotion as Emotion, weight: Math.max(0, Number(e.weight) || 0) }))
      .slice(0, 3);

    // weight を正規化して合計 1.0 に
    const totalW = emotions.reduce((s, e) => s + e.weight, 0);
    if (totalW > 0) emotions.forEach(e => { e.weight = Math.round((e.weight / totalW) * 100) / 100; });

    if (emotions.length === 0) return NextResponse.json(fallback(), { status: 200 });

    const dominant = emotions.reduce((a, b) => a.weight > b.weight ? a : b);

    const result: AnalyzeResult = {
      emotions,
      emotion: dominant.emotion,
      intensity: dominant.weight,
      color: blendEmotionColors(emotions),
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 3) : [],
      summary: (parsed.summary ?? "").slice(0, 30),
    };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(fallback(), { status: 200 });
  }
}

function fallback(): AnalyzeResult {
  const emotions: EmotionWeight[] = [{ emotion: "neutral", weight: 1.0 }];
  return {
    emotions,
    emotion: "neutral",
    intensity: 1.0,
    color: blendEmotionColors(emotions),
    keywords: [],
    summary: "今日の色が静かに漂う",
  };
}
