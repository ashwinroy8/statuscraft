import { type NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { after } from "next/server";
import {
  processWhatsAppWebhook,
  verifyWhatsAppWebhook,
} from "@/lib/whatsapp/client";

// Webhook verification (GET) — Meta calls this when you register the webhook URL
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
  let body: any;

  // Verify signature using App Secret (prevents spoofed requests)
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    const expectedSig =
      "sha256=" +
      createHmac("sha256", appSecret).update(rawBody).digest("hex");

    if (signature !== expectedSig) {
      console.error("WhatsApp webhook signature mismatch");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    body = JSON.parse(rawBody);
  } else {
    // No app secret configured — skip verification (dev mode)
    body = await req.json();
  }

  // Return 200 to Meta IMMEDIATELY — then process in background.
  // This prevents Meta from retrying because we took too long
  // (voice note processing + image generation can take 60+ seconds).
  after(async () => {
    try {
      await processWhatsAppWebhook(body);
    } catch (e) {
      console.error("WhatsApp webhook error:", e);
    }
  });

  return NextResponse.json({ ok: true });
}
