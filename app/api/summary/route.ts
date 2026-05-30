import { NextRequest, NextResponse } from "next/server";
import type { Emotion } from "@/lib/types";

const SYSTEM_PROMPT = `あなたは感情を色と揺らぎで観測するアシスタントです。
ユーザーの1ヶ月分の感情記録から、叙情的な月次まとめを生成してください。

ルール：
- 診断・アドバイス・点数化・医療的表現は絶対禁止
- 「〜な月でした」「〜が漂っていた月」形式の叙情的な一文（40字以内）
- 例：「迷いと回復が混在した、揺れる月でした」

JSONのみを返してください：
{ "text": "まとめ文" }`;

interface EntryInput {
  emotion: Emotion;
  intensity: number;
  summary: string;
}

export async function POST(req: NextRequest) {
  const { entries, month } = await req.json() as { entries: EntryInput[]; month: string };

  if (!entries || entries.length === 0) {
    return NextResponse.json({ text: "記録のなかった静かな月でした" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ text: buildFallbackSummary(entries) });
  }

  const digest = entries
    .map(e => `${e.emotion}(${e.intensity.toFixed(1)}): ${e.summary}`)
    .join("\n")
    .slice(0, 1500);

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
          { role: "user", content: `${month}の記録:\n${digest}` },
        ],
        max_tokens: 100,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return NextResponse.json({ text: buildFallbackSummary(entries) });

    const data = await res.json() as { choices: { message: { content: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as { text: string };
    return NextResponse.json({ text: (parsed.text ?? "").slice(0, 60) });
  } catch {
    return NextResponse.json({ text: buildFallbackSummary(entries) });
  }
}

function buildFallbackSummary(entries: EntryInput[]): string {
  const counts: Partial<Record<Emotion, number>> = {};
  for (const e of entries) counts[e.emotion] = (counts[e.emotion] ?? 0) + 1;
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as Emotion;
  const map: Record<Emotion, string> = {
    joy:     "よろこびが輝いていた月でした",
    sadness: "静かな波が漂っていた月でした",
    anger:   "熱を帯びた色が揺れた月でした",
    fear:    "揺らぎの多かった月でした",
    calm:    "静かな安定が続いた月でした",
    neutral: "穏やかに流れていった月でした",
  };
  return map[dominant] ?? "さまざまな色が混ざり合った月でした";
}
