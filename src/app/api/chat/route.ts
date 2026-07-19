import { handleUserMessage } from "@/lib/agent";
import { getSession } from "@/lib/store";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId = String(body.sessionId || "");
    const message = String(body.message || "").trim();

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: "sessionId and message are required" },
        { status: 400 }
      );
    }

    if (!getSession(sessionId)) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { session, toolsUsed } = await handleUserMessage(sessionId, message);
    return NextResponse.json({ session, toolsUsed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
