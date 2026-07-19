import {
  clearCrmData,
  getAnalytics,
  getSession,
  listSessions,
} from "@/lib/store";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (sessionId) {
    const session = getSession(sessionId);
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
