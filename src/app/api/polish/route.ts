import { polishLastAssistantReply } from "@/lib/agent";
import { isLlmConfigured } from "@/lib/llm";
import { getOrRestoreSession } from "@/lib/store";
import type { SessionState } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ configured: isLlmConfigured() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId = String(body.sessionId || "");
    const snapshot = (body.session || null) as SessionState | null;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const existing = getOrRestoreSession(sessionId, snapshot);
    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Session not found. Click New lead to start a fresh session.",
        },
        { status: 404 }
      );
    }

    const { session, provider } = await polishLastAssistantReply(sessionId);
    return NextResponse.json({ session, provider });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Polish failed";
    const status =
      msg.includes("No LLM") || msg.includes("incomplete") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
