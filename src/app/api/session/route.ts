import { createSession } from "@/lib/agent";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = createSession();
  return NextResponse.json({ session });
}
