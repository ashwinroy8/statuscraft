import { type NextRequest, NextResponse } from "next/server";
import { fetchEntertainmentSignals } from "@/lib/signals/fetchers/entertainment";

export async function GET(req: NextRequest) {
  const triggerKey = req.headers.get("x-trigger-secret-key");
  if (triggerKey !== process.env.TRIGGER_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await fetchEntertainmentSignals();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[cron/fetch-entertainment] Error:", e);
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
