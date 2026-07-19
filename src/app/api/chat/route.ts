import { handleUserMessage } from "@/lib/agent";
import { getOrRestoreSession } from "@/lib/store";
import type { SessionState } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId = String(body.sessionId || "");
    const message = String(body.message || "").trim();
    const snapshot = (body.session || null) as SessionState | null;

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: "sessionId and message are required" },
        { status: 400 }
      );
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

    const { session, toolsUsed } = await handleUserMessage(sessionId, message);
    return NextResponse.json({ session, toolsUsed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
