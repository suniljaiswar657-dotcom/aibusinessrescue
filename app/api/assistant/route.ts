import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI assistant is not configured yet. Add OPENAI_API_KEY on the server." }, { status: 503 });
  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 4000) : "";
    if (!prompt.trim()) return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: "You are the practical AI business assistant inside AI Business Rescue. Help local Indian businesses with customer enquiries, sales follow-ups, simple marketing and operations. Be concise, actionable, and use INR when discussing prices. Do not claim to send messages, make payments, or perform actions that were not actually connected.",
        input: prompt,
        max_output_tokens: 700
      })
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error?.message || "AI request failed." }, { status: response.status });
    const answer = (data.output || []).flatMap((item: {content?: Array<{type?:string,text?:string}>}) => item.content || []).filter((part: {type?:string}) => part.type === "output_text").map((part: {text?:string}) => part.text || "").join("\n");
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ error: "Could not reach the AI service. Please try again." }, { status: 500 });
  }
}
