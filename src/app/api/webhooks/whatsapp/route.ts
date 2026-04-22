import { type NextRequest, NextResponse } from "next/server";
import {
  processWhatsAppWebhook,
  verifyWhatsAppWebhook,
} from "@/lib/whatsapp/client";

// Webhook verification (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode") ?? "";
  const token = searchParams.get("hub.verify_token") ?? "";
  const challenge = searchParams.get("hub.challenge") ?? "";

  const result = verifyWhatsAppWebhook(mode, token, challenge);
  if (result) {
    return new NextResponse(result, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Incoming messages/status updates (POST)
export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    await processWhatsAppWebhook(body);
  } catch (e) {
    console.error("WhatsApp webhook error:", e);
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ ok: true });
}
