import { prisma } from "@/lib/prisma";
import { sendImage, sendButtons, sendText } from "./client";

export async function deliverDailyPostsToOwner(brandId: string): Promise<void> {
  // 1. Get brand + owner phone
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: { user: true },
  });
  if (!brand?.user.phone) return; // WhatsApp not set up

  const settings = await prisma.settings.findUnique({ where: { userId: brand.userId } });
  if (!settings?.whatsappConnected) return;

  const ownerPhone = brand.user.phone;

  // 2. Get today's DRAFT posts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const posts = await prisma.post.findMany({
    where: { brandId, status: "DRAFT", createdAt: { gte: today, lt: tomorrow } },
    include: { signal: true },
    orderBy: { scheduledAt: "asc" },
    take: 3,
  });

  if (posts.length === 0) {
    await sendText(
      ownerPhone,
      `Good morning! 🌅 No new posts were generated for today. Tap "Generate" in the app or send me a voice note describing what you want to post.`
    );
    return;
  }

  // 3. Send a greeting
  await sendText(ownerPhone, `Good morning ${brand.name}! 🎨 Here are your ${posts.length} posts for today:`);

  // 4. Send each post image + caption
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const time = post.scheduledAt
      ? new Date(post.scheduledAt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "—";

    const caption = [
      `*Post ${i + 1} of ${posts.length}* — ${post.type}`,
      `📰 ${post.headline ?? "Untitled"}`,
      post.bodyText ? `\n${post.bodyText}` : "",
      `\n🕐 Scheduled: ${time}`,
      post.signal ? `📈 Inspired by: ${post.signal.title}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (post.imageUrl) {
      await sendImage(ownerPhone, post.imageUrl, caption);
    } else {
      await sendText(ownerPhone, caption);
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  // 5. Send the approval buttons
  const postIds = posts.map(p => p.id).join(",");

  await sendButtons(
    ownerPhone,
    "Your posts are ready! 🎨",
    `${posts.length} posts scheduled for today. What would you like to do?`,
    [
      { id: `approve_all:${postIds}`, title: "✅ Approve All" },
      { id: `edit_posts:${postIds}`, title: "✏️ Edit" },
      { id: `regenerate:${brandId}`, title: "🔄 Regenerate" },
    ]
  );

  // 6. Save the session state
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
  await prisma.conversationSession.upsert({
    where: { id: `${brand.userId}-active` },
    create: {
      id: `${brand.userId}-active`,
      userId: brand.userId,
      brandId,
      phone: ownerPhone,
      state: "AWAITING_APPROVAL",
      stateData: { postIds: posts.map(p => p.id) },
      expiresAt,
    },
    update: {
      state: "AWAITING_APPROVAL",
      stateData: { postIds: posts.map(p => p.id) },
      lastMessageAt: new Date(),
      expiresAt,
    },
  });
}
