import {
  clearCrmData,
  getAnalytics,
  getOrRestoreSession,
  listSessions,
} from "@/lib/store";
import type { SessionState } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (sessionId) {
    const session = getOrRestoreSession(sessionId, null);
    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ session });
  }

  return NextResponse.json({
    analytics: getAnalytics(),
    sessions: listSessions().map((s) => ({
      id: s.id,
      stage: s.stage,
      company: s.profile.company,
      name: s.profile.name,
      score: s.score.total,
      tier: s.score.tier,
      updatedAt: s.updatedAt,
    })),
  });
}

export async function DELETE() {
  clearCrmData();
  return NextResponse.json({
    ok: true,
    analytics: getAnalytics(),
    sessions: [],
  });
}

/** Optional: merge a client session into analytics store (dashboard sync). */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const snapshot = body.session as SessionState | undefined;
    if (!snapshot?.id) {
      return NextResponse.json({ error: "session required" }, { status: 400 });
    }
    const session = getOrRestoreSession(snapshot.id, snapshot);
    return NextResponse.json({
      ok: true,
      analytics: getAnalytics(),
      session,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
