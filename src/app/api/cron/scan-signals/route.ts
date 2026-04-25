import { type NextRequest, NextResponse } from "next/server";
import { fetchSignals } from "@/lib/ai/signal-radar";

export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("authorization")?.replace("Bearer ", "") ??
    new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.TRIGGER_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await fetchSignals();

  return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
}
