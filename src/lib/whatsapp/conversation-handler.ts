import { prisma } from "@/lib/prisma";
import { sendText, sendImage, sendImageWithButtons, sendButtons, downloadMedia } from "./client";
import { generateDailyContent } from "@/lib/ai/content-generator";
import { handleStatusReply } from "./auto-responder";
import { processVoiceNote } from "@/lib/voice/voice-to-post";
import { handleOnboardingMessage } from "./onboarding-handler";

// Strip +, spaces, dashes so "91 810-810 5860" === "918108105860"
function normalisePhone(p: string): string {
  return p.replace(/[\s+\-()]/g, "");
}

export async function handleIncomingMessage(
  message: any,
  contact: any,
  phoneNumberId?: string
): Promise<void> {
  const from: string = normalisePhone(message.from);
  const messageType: string = message.type;
  const contactName: string | undefined = contact?.profile?.name;

  // ── Check for in-progress WhatsApp onboarding ─────────────────────────────
  const onboardingSession = await prisma.onboardingSession.findUnique({ where: { phone: from } });
  if (onboardingSession) {
    await handleOnboardingMessage(from, messageType, message, contactName);
    return;
  }

  // ── Find who is messaging ──────────────────────────────────────────────────
  let user = await prisma.user.findFirst({ where: { phone: from } });

  if (!user) {
    // Try all settings records and compare normalised ownerPhone
    const allSettings = await prisma.settings.findMany({
      where: { whatsappOwnerPhone: { not: null } },
      include: { user: true },
    });
    const match = allSettings.find(
      (s) => normalisePhone(s.whatsappOwnerPhone ?? "") === from
    );
    if (match?.user) {
      user = match.user;
      // Normalise saved number and backfill user.phone
      await prisma.settings.update({
        where: { userId: user.id },
        data: { whatsappOwnerPhone: from },
      }).catch(() => {});
      await prisma.user.update({ where: { id: user.id }, data: { phone: from } }).catch(() => {});
    }
  }

  if (!user) {
    // No ownerPhone saved at all yet — find any connected account and claim it
    const anyConnected = await prisma.settings.findFirst({
      where: { whatsappConnected: true },
      include: { user: true },
    });
    if (anyConnected?.user && !anyConnected.whatsappOwnerPhone) {
      user = anyConnected.user;
      const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? phoneNumberId ?? "";
      await prisma.settings.update({
        where: { userId: user.id },
        data: { whatsappOwnerPhone: from, whatsappBusinessPhoneId: envPhoneId },
      }).catch(() => {});
      await prisma.user.update({ where: { id: user.id }, data: { phone: from } }).catch(() => {});
    } else if (anyConnected?.user && anyConnected.whatsappOwnerPhone) {
      // Owner IS set — this is a customer messaging in
      const brand = await prisma.brand.findFirst({
        where: { userId: anyConnected.user.id, onboardingCompleted: true },
      });
      if (brand) {
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

  if (!user) {
    await handleOnboardingMessage(from, messageType, message, contactName);
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

    console.log(`[WA] Interactive message from ${from}, replyId: "${replyId}"`);

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

    // ── Main menu button replies ──────────────────────────────────────────
    if (replyId === "cmd:today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const posts = await prisma.post.findMany({
        where: { brandId: brand.id, createdAt: { gte: today, lt: tomorrow } },
        orderBy: { scheduledAt: "asc" },
        take: 3,
      });
      if (!posts.length) {
        await sendText(
          from,
          "📅 No posts for today yet.\n\nSend me a *voice note* or type 'post [description]' to create one! 🎙️"
        );
      } else {
        await sendText(from, `📅 *Today's ${posts.length} post${posts.length > 1 ? "s" : ""}:*\n\nSending each one now 👇`);
        for (let i = 0; i < posts.length; i++) {
          const p = posts[i];
          const scheduleStr = p.scheduledAt
            ? new Date(p.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            : "unscheduled";
          const caption =
            `*${i + 1}. ${p.headline ?? "Untitled"}*\n\n` +
            `${p.bodyText ? p.bodyText.slice(0, 200) + "\n\n" : ""}` +
            `${p.ctaText ? "👉 " + p.ctaText + "\n\n" : ""}` +
            `⏰ ${scheduleStr}`;

          const draftButtons = [
            { id: `approve:${p.id}`, title: "✅ Approve" },
            { id: `reject:${p.id}`, title: "❌ Discard" },
          ];

          if (p.imageUrl && p.status === "DRAFT") {
            // Image + content + approve/discard buttons — all in one bubble
            await sendImageWithButtons(from, p.imageUrl, caption, draftButtons);
          } else if (p.imageUrl) {
            await sendImage(from, p.imageUrl, caption);
          } else if (p.status === "DRAFT") {
            // No image yet — text + buttons
            await sendButtons(from, `Post ${i + 1}`, caption + "\n\n_(image still generating)_", draftButtons);
          } else {
            await sendText(from, caption);
          }
        }
      }
      return;
    }

    // Auto-generate ad from stored product image (no voice note)
    if (replyId.startsWith("autogenerate_ad:")) {
      const imageUrl = replyId.replace("autogenerate_ad:", "");
      await sendText(from, "✨ Generating your professional ad...\n\n⏳ Takes about 30-40 seconds!");
      await expireSession(from);
      try {
        const { runAdStudioFromUrl } = await import("@/lib/media/ad-studio");
        const result = await runAdStudioFromUrl(imageUrl, brand.id);
        const caption = `✨ *${result.headline}*\n\n${result.bodyText}\n\n👉 ${result.ctaText}`;
        await sendImageWithButtons(from, result.enhancedImageUrl, caption, [
          { id: `approve:${result.postId}`, title: "✅ Approve" },
          { id: `reject:${result.postId}`, title: "❌ Discard" },
        ]);
      } catch (e) {
        console.error("Ad Studio error:", e);
        await sendText(from, "Sorry, couldn't generate the ad. Please try again. 🙏");
      }
      return;
    }

    // Approve a specific post
    if (replyId.startsWith("approve:")) {
      const postId = replyId.replace("approve:", "");
      await prisma.post.update({ where: { id: postId }, data: { status: "SCHEDULED" } });
      await sendText(from, "✅ Post approved and scheduled!");
      return;
    }

    // Reject/discard a specific post
    if (replyId.startsWith("reject:")) {
      const postId = replyId.replace("reject:", "");
      await prisma.post.delete({ where: { id: postId } });
      await sendText(from, "🗑️ Post discarded.");
      return;
    }

    if (replyId === "cmd:stats") {
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

    if (replyId === "cmd:festival") {
      await sendText(
        from,
        `🎉 *Festival Post*\n\nTell me which festival or celebrity birthday you want a post for!\n\nExample: "Diwali post" or "Virat Kohli birthday post"`
      );
      await upsertSession(user.id, brand.id, from, "FESTIVAL_REQUEST", {});
      return;
    }

    // Fallback — unknown button
    console.log(`[WA] Unhandled interactive replyId: "${replyId}"`);
    await sendText(from, `Got your tap! (id: ${replyId}) — reply "hi" to see the menu again.`);
    return;
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

  // ── Handle image — store and ask for voice note or auto-generate ─────────────
  if (messageType === "image") {
    const mediaId: string = message.image?.id ?? "";
    if (!mediaId) {
      await sendText(from, "Couldn't read that image. Please try again!");
      return;
    }

    try {
      // Upload to storage so we can retrieve it when the voice note arrives
      const imageBuffer = await downloadMedia(mediaId);
      const { uploadFileToStorage } = await import("@/lib/media/storage");
      const imagePath = `whatsapp-uploads/${brand.id}/${Date.now()}.jpg`;
      const storedImageUrl = await uploadFileToStorage(imageBuffer, imagePath, "image/jpeg");

      // Save image URL in session — wait for voice note
      await upsertSession(user.id, brand.id, from, "AWAITING_VOICE_FOR_IMAGE", { imageUrl: storedImageUrl });

      await sendButtons(
        from,
        "📸 Product photo received!",
        "Now send a *voice note* to describe it — price, offer, anything you want to say.\n\nOr tap below to auto-generate an ad right away.",
        [{ id: `autogenerate_ad:${storedImageUrl}`, title: "⚡ Auto-Generate Ad" }]
      );
    } catch (e) {
      console.error("Image save error:", e);
      await sendText(from, "Sorry, couldn't save that image. Please try again. 🙏");
    }
    return;
  }

  // ── Handle audio (voice notes) ───────────────────────────────────────────────
  if (messageType === "audio") {
    const mediaId: string = message.audio?.id ?? "";
    if (!mediaId) {
      await sendText(from, "Couldn't process that voice note. Please try again! 🎙️");
      return;
    }

    const audioBuffer = await downloadMedia(mediaId);

    // ── Voice note + pending product image → combined Ad Studio ──────────────
    const pendingImage = session?.state === "AWAITING_VOICE_FOR_IMAGE"
      ? (session.stateData as any)?.imageUrl as string | undefined
      : undefined;

    if (pendingImage) {
      await expireSession(from);
      await sendText(
        from,
        "🎙️📸 Got your voice note + photo! Creating a professional ad...\n\n⏳ Takes about 30-40 seconds!"
      );
      try {
        const { runAdStudioWithVoice } = await import("@/lib/media/ad-studio");
        const result = await runAdStudioWithVoice(audioBuffer, pendingImage, brand.id);
        const caption = `✨ *${result.headline}*\n\n${result.bodyText}\n\n👉 ${result.ctaText}`;
        await sendImageWithButtons(from, result.enhancedImageUrl, caption, [
          { id: `approve:${result.postId}`, title: "✅ Approve" },
          { id: `reject:${result.postId}`, title: "❌ Discard" },
        ]);
      } catch (e) {
        console.error("Ad Studio + voice error:", e);
        await sendText(from, "Sorry, couldn't generate the ad. Please try again. 🙏");
      }
      return;
    }

    // ── Voice note alone → 3 post variants ───────────────────────────────────
    await sendText(
      from,
      "🎙️ Voice note received! Transcribing and generating 3 posts with images...\n\n⏳ Takes about 60 seconds — I'll send each image directly here as it's ready!"
    );

    try {
      const styleEmojis = ["🔥", "✨", "😄"];
      const styleLabels = ["Bold", "Elegant", "Fun"];

      await processVoiceNote(audioBuffer, brand.id, undefined, {
        onImageReady: async (index, imageUrl, post) => {
          const caption =
            `${styleEmojis[index]} *Post ${index + 1} of 3 — ${styleLabels[index]}*\n\n` +
            `📰 *${post.headline}*\n` +
            (post.bodyText ? `${post.bodyText}\n` : "") +
            `\n👉 ${post.ctaText}\n\n` +
            `_Download and post as your WhatsApp Status!_`;
          await sendImage(from, imageUrl, caption);
        },
        onAllDone: async (postIds) => {
          const ids = postIds.join(",");
          await sendButtons(
            from,
            "✅ All 3 posts ready!",
            "Approve to schedule, or open StatusCraft to review.",
            [
              { id: `approve_all:${ids}`, title: "✅ Approve All" },
              { id: `edit_posts:${ids}`, title: "✏️ Edit Posts" },
              { id: `regenerate:${brand.id}`, title: "🔄 Regenerate" },
            ]
          );
        },
      });
    } catch (e: any) {
      console.error("[Voice-to-post] FULL ERROR:", e?.message ?? e);
      console.error("[Voice-to-post] Stack:", e?.stack);
      const hint = e?.message?.includes("GROQ_API_KEY")
        ? "GROQ_API_KEY is not set on the server."
        : e?.message?.includes("Groq transcription failed")
        ? `Groq error: ${e.message}`
        : e?.message ?? String(e);
      console.error("[Voice-to-post] Hint:", hint);
      await sendText(
        from,
        `Sorry, I had trouble with your voice note. Please try again or type your message instead. 🙏\n\n_Error: ${hint.slice(0, 120)}_`
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
