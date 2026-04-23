import { prisma } from "@/lib/prisma";
import { handleIncomingMessage } from "./conversation-handler";

const WHATSAPP_API_BASE = "https://graph.facebook.com/v20.0";

function getPhoneId() {
  return process.env.WHATSAPP_PHONE_NUMBER_ID!;
}

function getToken() {
  return process.env.WHATSAPP_ACCESS_TOKEN!;
}

async function callApi(path: string, body: object) {
  const res = await fetch(`${WHATSAPP_API_BASE}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`WhatsApp API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function sendText(to: string, text: string) {
  return callApi(`${getPhoneId()}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  });
}

export async function sendImage(to: string, imageUrl: string, caption?: string) {
  return callApi(`${getPhoneId()}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "image",
    image: { link: imageUrl, ...(caption ? { caption } : {}) },
  });
}

export async function sendInteractive(to: string, interactive: object) {
  return callApi(`${getPhoneId()}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive,
  });
}

export async function sendButtons(
  to: string,
  headerText: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
) {
  return sendInteractive(to, {
    type: "button",
    header: { type: "text", text: headerText },
    body: { text: bodyText },
    action: {
      buttons: buttons.map(b => ({
        type: "reply",
        reply: { id: b.id, title: b.title },
      })),
    },
  });
}

export async function sendList(
  to: string,
  headerText: string,
  bodyText: string,
  buttonLabel: string,
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>
) {
  return sendInteractive(to, {
    type: "list",
    header: { type: "text", text: headerText },
    body: { text: bodyText },
    action: {
      button: buttonLabel,
      sections,
    },
  });
}

export async function markAsRead(messageId: string) {
  return callApi(`${getPhoneId()}/messages`, {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  });
}

export async function downloadMedia(mediaId: string): Promise<Buffer> {
  const infoRes = await fetch(`${WHATSAPP_API_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const { url } = await infoRes.json();
  const mediaRes = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return Buffer.from(await mediaRes.arrayBuffer());
}

export async function sendPostAsStatus(postId: string): Promise<void> {
  const post = await prisma.post.findUniqueOrThrow({
    where: { id: postId },
    include: { brand: { include: { user: true } } },
  });

  const settings = await prisma.settings.findUnique({
    where: { userId: post.brand.userId },
  });

  if (!settings?.whatsappConnected) {
    throw new Error("WhatsApp not connected for this brand");
  }

  const toPhone = post.brand.user.phone ?? "";

  if (!post.imageUrl && !post.videoUrl) {
    throw new Error("Post has no media to send");
  }

  const caption = [post.headline, post.bodyText, post.ctaText]
    .filter(Boolean)
    .join("\n\n");

  if (post.videoUrl) {
    await callApi(`${getPhoneId()}/messages`, {
      messaging_product: "whatsapp",
      to: toPhone,
      type: "video",
      video: { link: post.videoUrl, caption },
    });
  } else {
    await sendImage(toPhone, post.imageUrl!, caption);
  }

  await prisma.post.update({
    where: { id: postId },
    data: { status: "SENT", sentAt: new Date() },
  });

  await prisma.postAnalytics.upsert({
    where: { postId },
    create: { postId, views: 0, replies: 0 },
    update: {},
  });
}

export function verifyWhatsAppWebhook(
  mode: string,
  token: string,
  challenge: string
): string | null {
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return challenge;
  }
  return null;
}

export async function processWhatsAppWebhook(body: any): Promise<void> {
  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (!value) return;

  const phoneNumberId: string =
    value.metadata?.phone_number_id ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";

  // Handle incoming messages
  const messages = value.messages ?? [];
  for (const message of messages) {
    try {
      await handleIncomingMessage(message, value.contacts?.[0], phoneNumberId);
    } catch (e) {
      console.error("Error handling incoming message:", e);
    }
  }

  // Handle message status updates (delivered, read) — increment views
  const statuses = value.statuses ?? [];
  for (const status of statuses) {
    if (status.status === "read") {
      const recentPost = await prisma.post.findFirst({
        where: { status: "SENT" },
        orderBy: { sentAt: "desc" },
      });

      if (recentPost) {
        await prisma.postAnalytics.updateMany({
          where: { postId: recentPost.id },
          data: { views: { increment: 1 } },
        });
      }
    }
  }
}
