import { createSession } from "@/lib/agent";
import { NextResponse } from "next/server";

export async function POST() {
  const session = createSession();
  return NextResponse.json({ session });
}
