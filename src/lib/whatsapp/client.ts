import { prisma } from "@/lib/prisma";

const WHATSAPP_API_BASE = "https://graph.facebook.com/v19.0";

interface WhatsAppStatusPayload {
  messaging_product: "whatsapp";
  to: string;
  type: "image" | "video";
  image?: { link: string; caption?: string };
  video?: { link: string; caption?: string };
}

async function callWhatsAppApi(
  phoneNumberId: string,
  accessToken: string,
  body: object
) {
  const res = await fetch(
    `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`WhatsApp API error ${res.status}: ${error}`);
  }

  return res.json();
}

export async function sendPostAsStatus(postId: string): Promise<void> {
  const post = await prisma.post.findUniqueOrThrow({
    where: { id: postId },
    include: { brand: { include: { user: true } } },
  });

  const settings = await prisma.settings.findUnique({
    where: { userId: post.brand.userId },
  });

  if (!settings?.whatsappConnected || !settings.whatsappBusinessPhoneId) {
    throw new Error("WhatsApp not connected for this brand");
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
  const phoneNumberId = settings.whatsappBusinessPhoneId;

  // WhatsApp Status is sent to the business's own number as a "broadcast"
  // In the Business API, statuses are posted via the status update endpoint
  // For now, we send as a message to self (testing) or broadcast
  const toPhone = post.brand.user.phone ?? "";

  if (!post.imageUrl && !post.videoUrl) {
    throw new Error("Post has no media to send");
  }

  const caption = [post.headline, post.bodyText, post.ctaText]
    .filter(Boolean)
    .join("\n\n");

  const payload: WhatsAppStatusPayload = {
    messaging_product: "whatsapp",
    to: toPhone,
    type: post.videoUrl ? "video" : "image",
    ...(post.videoUrl
      ? { video: { link: post.videoUrl, caption } }
      : { image: { link: post.imageUrl!, caption } }),
  };

  const result = await callWhatsAppApi(phoneNumberId, accessToken, payload);

  // Update post as sent
  await prisma.post.update({
    where: { id: postId },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
  });

  // Create analytics record
  await prisma.postAnalytics.upsert({
    where: { postId },
    create: { postId, views: 0, replies: 0 },
    update: {},
  });
}

export async function processWhatsAppWebhook(body: any): Promise<void> {
  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (!value) return;

  // Handle incoming messages (replies to status)
  const messages = value.messages ?? [];
  for (const message of messages) {
    const from = message.from; // phone number of the sender
    const text = message.text?.body ?? "";

    // Find recent sent posts from this brand's phone
    // This is simplified — in production, you'd match by phone number to brand
    const recentPost = await prisma.post.findFirst({
      where: { status: "SENT" },
      include: { brand: { include: { user: true } }, analytics: true },
      orderBy: { sentAt: "desc" },
    });

    if (recentPost && (recentPost as any)?.analytics) {
      const existing = ((recentPost as any).analytics.responseTexts as string[]) ?? [];
      await prisma.postAnalytics.update({
        where: { postId: recentPost.id },
        data: {
          replies: { increment: 1 },
          responseTexts: [...existing, text].slice(-50), // Keep last 50 replies
        },
      });
    }
  }

  // Handle message status updates (delivered, read)
  const statuses = value.statuses ?? [];
  for (const status of statuses) {
    if (status.status === "read") {
      // Find the post by message ID (if we stored it)
      // This is a simplification
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

export function verifyWhatsAppWebhook(
  mode: string,
  token: string,
  challenge: string
): string | null {
  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return challenge;
  }
  return null;
}
