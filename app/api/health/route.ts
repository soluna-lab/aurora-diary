import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "GROQ_API_KEY not set" });
  }

  // Groq への疎通確認（最小リクエスト）
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ ok: false, status: res.status, reason: body.slice(0, 200) });
    }

    return NextResponse.json({ ok: true, status: res.status });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: String(e) });
  }
}
