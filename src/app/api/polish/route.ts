import { polishLastAssistantReply } from "@/lib/agent";
import { isLlmConfigured } from "@/lib/llm";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ configured: isLlmConfigured() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId = String(body.sessionId || "");
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const { session, provider } = await polishLastAssistantReply(sessionId);
    return NextResponse.json({ session, provider });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Polish failed";
    const status = msg.includes("No LLM") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
