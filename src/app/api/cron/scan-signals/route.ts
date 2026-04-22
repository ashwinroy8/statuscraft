import { type NextRequest, NextResponse } from "next/server";
import { fetchSignals } from "@/lib/ai/signal-radar";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.TRIGGER_SECRET_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await fetchSignals();

  return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
}
