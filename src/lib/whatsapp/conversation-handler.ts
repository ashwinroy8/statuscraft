import { prisma } from "@/lib/prisma";
import { sendText, sendButtons, downloadMedia } from "./client";
import { generateDailyContent } from "@/lib/ai/content-generator";
import { handleStatusReply } from "./auto-responder";
import { processVoiceNote } from "@/lib/voice/voice-to-post";

export async function handleIncomingMessage(
  message: any,
  contact: any,
  phoneNumberId?: string
): Promise<void> {
  const from: string = message.from;
  const messageId: string = message.id;
  const messageType: string = message.type;
  const contactName: string | undefined = contact?.profile?.name;

  // ── Route customer replies (not owner) to auto-responder ──────────────────
  // Find the brand this phone number ID belongs to
  if (phoneNumberId) {
    const settings = await prisma.settings.findFirst({
      where: { whatsappBusinessPhoneId: phoneNumberId },
      include: { user: { include: { brands: { where: { onboardingCompleted: true } } } } },
    });

    if (settings) {
      const ownerPhone = settings.whatsappOwnerPhone ?? settings.user?.phone;
      const brand = settings.user?.brands?.[0];

      // If sender is NOT the owner, route to auto-responder
      if (ownerPhone && from !== ownerPhone && brand) {
        if (messageType === "text") {
          const replyText = message.text?.body?.trim() ?? "";
          await handleStatusReply(from, contactName, replyText, brand.id).catch(
            (e) => console.error("Auto-responder error:", e)
          );
        } else {
          await sendText(
            from,
            `Hi${contactName ? ` ${contactName}` : ""}! Thanks for reaching out to ${brand.name}. 😊 Reply with a text message and we'll get back to you!`
          );
        }
        return;
      }
    }
  }

  // ── Owner bot flow ─────────────────────────────────────────────────────────
  // Find user by phone — check User.phone first, then Settings.whatsappOwnerPhone as fallback
  let user = await prisma.user.findFirst({ where: { phone: from } });
  if (!user) {
    const ownerSettings = await prisma.settings.findFirst({
      where: { whatsappOwnerPhone: from },
      include: { user: true },
    });
    if (ownerSettings?.user) {
      user = ownerSettings.user;
      // Backfill user.phone so future lookups are faster
      await prisma.user.update({
        where: { id: user.id },
        data: { phone: from },
      }).catch(() => {}); // ignore unique constraint errors
    }
  }
  if (!user) {
    await sendText(
      from,
      "Hi! I don't recognise your number. Please sign up at statuscraft.in to connect your WhatsApp. 👋"
    );
    return;
  }

  const brand = await prisma.brand.findFirst({
    where: { userId: user.id, onboardingCompleted: true },
    orderBy: { createdAt: "desc" },
  });
  if (!brand) {
    await sendText(from, "Please complete your onboarding at statuscraft.in first! 🚀");
    return;
  }

  // Get or create conversation session
  const now = new Date();
  let session = await prisma.conversationSession.findFirst({
    where: { phone: from, expiresAt: { gt: now } },
    orderBy: { lastMessageAt: "desc" },
  });

  // Update last seen
  if (session) {
    await prisma.conversationSession.update({
      where: { id: session.id },
      data: { lastMessageAt: now, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
    });
  }

  const state = session?.state ?? "IDLE";
  const stateData: any = session?.stateData ?? {};

  // ── Handle button/interactive replies ──────────────────────────────────────
  if (messageType === "interactive") {
    const replyId: string =
      message.interactive?.button_reply?.id ??
      message.interactive?.list_reply?.id ??
      "";

    if (replyId.startsWith("approve_all:")) {
      const postIds = replyId.replace("approve_all:", "").split(",");
      await prisma.post.updateMany({
        where: { id: { in: postIds } },
        data: { status: "SCHEDULED" },
      });
      await sendText(
        from,
        `✅ All ${postIds.length} posts approved and scheduled! They'll go live at their scheduled times. Have a great day! 🚀`
      );
      await expireSession(from);
      return;
    }

    if (replyId.startsWith("regenerate:")) {
      const bId = replyId.replace("regenerate:", "");
      await sendText(from, "🔄 Regenerating your posts... This takes about 30 seconds.");
      // Delete today's drafts and regenerate
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      await prisma.post.deleteMany({
        where: { brandId: bId, status: "DRAFT", createdAt: { gte: today, lt: tomorrow } },
      });
      await generateDailyContent(bId);
      await sendText(
        from,
        "✨ New posts generated! Check the StatusCraft app to review them, or wait for my next morning message."
      );
      await expireSession(from);
      return;
    }

    if (replyId.startsWith("edit_posts:")) {
      await sendText(
        from,
        `✏️ To edit a post, reply with the post number (1, 2, or 3) and what you want to change.\n\nExample: "1 change headline to New Sale is Live!"`
      );
      await upsertSession(user.id, brand.id, from, "EDITING_POST", stateData);
      return;
    }
  }

  // ── Handle text messages ───────────────────────────────────────────────────
  if (messageType === "text") {
    const text: string = message.text?.body?.trim() ?? "";
    const lower = text.toLowerCase();

    // Menu / Help commands
    if (["hi", "hello", "hey", "menu", "help", "start"].some(k => lower.includes(k))) {
      await sendButtons(
        from,
        `Welcome back, ${user.name ?? brand.name}! 👋`,
        "What would you like to do?",
        [
          { id: "cmd:today", title: "📅 Today's Posts" },
          { id: "cmd:stats", title: "📊 Stats" },
          { id: "cmd:festival", title: "🎉 Festival Post" },
        ]
      );
      return;
    }

    if (lower === "cmd:today" || lower === "today" || lower === "aaj") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const posts = await prisma.post.findMany({
        where: { brandId: brand.id, createdAt: { gte: today, lt: tomorrow } },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      });
      if (!posts.length) {
        await sendText(
          from,
          "No posts for today yet. Send me a voice note or type 'post [description]' to create one!"
        );
      } else {
        const summary = posts
          .map(
            (p, i) =>
              `${i + 1}. *${p.headline ?? "Untitled"}* — ${p.status}${
                p.scheduledAt
                  ? " @ " +
                    new Date(p.scheduledAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""
              }`
          )
          .join("\n");
        await sendText(from, `📅 *Today's posts:*\n\n${summary}`);
      }
      return;
    }

    if (lower.startsWith("stats") || lower.startsWith("analytics")) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [totalPosts, analytics] = await Promise.all([
        prisma.post.count({
          where: { brandId: brand.id, status: "SENT", createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.postAnalytics.aggregate({
          where: { post: { brandId: brand.id } },
          _sum: { views: true, replies: true },
        }),
      ]);
      await sendText(
        from,
        `📊 *Your stats (last 30 days):*\n\n` +
          `✅ Posts sent: ${totalPosts}\n` +
          `👁 Total views: ${analytics._sum.views ?? 0}\n` +
          `💬 Total replies: ${analytics._sum.replies ?? 0}\n\n` +
          `For detailed analytics, visit statuscraft.in 📈`
      );
      return;
    }

    if (lower.startsWith("post ")) {
      const description = text.slice(5).trim();
      await sendText(
        from,
        `🎨 Got it! Creating a post for: "${description}"\n\nThis takes about 20-30 seconds...`
      );
      await upsertSession(user.id, brand.id, from, "CREATING_ADHOC", { description });
      // The actual generation is handled by Feature 4 / ad-hoc generator
      // For now, confirm and direct to app
      await sendText(
        from,
        `✨ Post creation queued! Open the StatusCraft app to see it when ready. Or send me a *voice note* for faster post creation! 🎙️`
      );
      return;
    }

    // Handle editing state
    if (state === "EDITING_POST") {
      const match = text.match(/^(\d)\s+(.+)$/);
      if (match) {
        const postIndex = parseInt(match[1]) - 1;
        const newText = match[2];
        const postIds: string[] = stateData.postIds ?? [];
        if (postIds[postIndex]) {
          await prisma.post.update({
            where: { id: postIds[postIndex] },
            data: { headline: newText },
          });
          await sendText(
            from,
            `✅ Post ${postIndex + 1} updated! New headline: "${newText}"\n\nReply "approve all" to schedule, or edit another post.`
          );
        }
      } else {
        await sendText(
          from,
          `Please format your edit like: "1 new headline text"\n\nFor example: "2 Flash sale ends tonight — 40% off!"`
        );
      }
      return;
    }

    // Fallback
    await sendText(
      from,
      `👋 Not sure what you mean. Try:\n\n` +
        `• "today" — see today's posts\n` +
        `• "stats" — view analytics\n` +
        `• "post [description]" — create a new post\n` +
        `• Send a *voice note* to create a post by speaking 🎙️`
    );
    return;
  }

  // ── Handle audio (voice notes) — Feature 4: Voice-to-Post ────────────────
  if (messageType === "audio") {
    const mediaId: string = message.audio?.id ?? "";
    if (!mediaId) {
      await sendText(from, "Couldn't process that voice note. Please try again! 🎙️");
      return;
    }

    await sendText(
      from,
      "🎙️ Voice note received! Transcribing and creating your posts... (about 20-30 seconds)"
    );

    try {
      const audioBuffer = await downloadMedia(mediaId);
      const result = await processVoiceNote(audioBuffer, brand.id);

      const postList = result.posts
        .map((p, i) => `${i + 1}. *${p.headline}*\n_${p.style}_`)
        .join("\n\n");

      await sendText(
        from,
        `✨ *3 posts created from your voice note!*\n\n` +
          `📝 Transcription: "${result.transcription.slice(0, 100)}${result.transcription.length > 100 ? "…" : ""}"\n\n` +
          `${postList}\n\n` +
          `Open StatusCraft to review images and schedule your posts! 🚀`
      );
    } catch (e) {
      console.error("Voice-to-post error:", e);
      await sendText(
        from,
        "Sorry, I had trouble processing that voice note. Please try again or type 'post [description]' instead. 🙏"
      );
    }
    return;
  }
}

async function upsertSession(
  userId: string,
  brandId: string,
  phone: string,
  state: string,
  stateData: any
) {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.conversationSession.upsert({
    where: { id: `${userId}-active` },
    create: { id: `${userId}-active`, userId, brandId, phone, state, stateData, expiresAt },
    update: { state, stateData, lastMessageAt: new Date(), expiresAt },
  });
}

async function expireSession(phone: string) {
  await prisma.conversationSession.updateMany({
    where: { phone },
    data: { state: "IDLE", expiresAt: new Date() },
  });
}
