/**
 * WhatsApp Onboarding — 3 messages, account live, posts delivered.
 *
 * Flow:
 *  Message 1 (any) → "What's your business called?"
 *  Message 2       → business name saved → numbered category list sent
 *  Message 3       → category chosen → account created → 3 posts sent immediately
 */
import { prisma } from "@/lib/prisma";
import { sendText, sendButtons } from "./client";
import { getAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

// ── Category list (numbered for maximum compatibility) ────────────────────────
const CATEGORIES = [
  { n: 1,  label: "Restaurant / Food & Drinks" },
  { n: 2,  label: "Sweet Shop / Bakery"         },
  { n: 3,  label: "Salon & Beauty"              },
  { n: 4,  label: "Retail / Kirana Store"       },
  { n: 5,  label: "Clothing & Fashion"          },
  { n: 6,  label: "Coaching / Education"        },
  { n: 7,  label: "Medical / Pharmacy"          },
  { n: 8,  label: "Jewellery"                   },
  { n: 9,  label: "Electronics & Gadgets"       },
  { n: 10, label: "Real Estate"                 },
  { n: 11, label: "Fitness / Gym"               },
  { n: 12, label: "Other"                       },
];

function categoryLine() {
  return CATEGORIES.map(c => `${c.n}. ${c.label}`).join("\n");
}

function matchCategory(text: string): string | null {
  const trimmed = text.trim().toLowerCase();
  // Try exact number
  const n = parseInt(trimmed);
  if (!isNaN(n)) {
    const match = CATEGORIES.find(c => c.n === n);
    if (match) return match.label;
  }
  // Try partial name match
  const byName = CATEGORIES.find(c => c.label.toLowerCase().includes(trimmed) || trimmed.includes(c.label.toLowerCase().split("/")[0].trim()));
  return byName?.label ?? null;
}

// ── Session helpers ───────────────────────────────────────────────────────────
async function getSession(phone: string) {
  return prisma.onboardingSession.findUnique({ where: { phone } });
}

async function setStep(phone: string, step: string, data: object) {
  await prisma.onboardingSession.upsert({
    where: { phone },
    create: { phone, step, data },
    update: { step, data, updatedAt: new Date() },
  });
}

async function clearSession(phone: string) {
  await prisma.onboardingSession.delete({ where: { phone } }).catch(() => {});
}

// ── Entry point ───────────────────────────────────────────────────────────────
export async function handleOnboardingMessage(
  from: string,
  messageType: string,
  message: any,
  contactName?: string
): Promise<void> {
  const session = await getSession(from);
  const step = session?.step ?? "WELCOME";
  const data: any = session?.data ?? {};

  // ── Interactive button reply ───────────────────────────────────────────────
  if (messageType === "interactive") {
    const replyId: string =
      message.interactive?.button_reply?.id ??
      message.interactive?.list_reply?.id ??
      "";

    if (replyId === "onboard:restart") {
      await clearSession(from);
      await askBusinessName(from);
      return;
    }

    // Any other interactive during onboarding — re-ask current step
    await nudge(from, step, data);
    return;
  }

  // ── Text messages ─────────────────────────────────────────────────────────
  if (messageType === "text") {
    const text = message.text?.body?.trim() ?? "";

    // ── STEP 1: Ask business name ──────────────────────────────────────────
    if (step === "WELCOME") {
      await askBusinessName(from, contactName);
      return;
    }

    // ── STEP 2: Receive business name → ask category ───────────────────────
    if (step === "ASK_BUSINESS_NAME") {
      if (text.length < 2) {
        await sendText(from, "Please tell me your business name 😊");
        return;
      }
      const newData = { ...data, businessName: text };
      await setStep(from, "ASK_CATEGORY", newData);
      await sendText(
        from,
        `Got it — *${text}* 🎉\n\nWhat type of business is it? Reply with the *number*:\n\n${categoryLine()}`
      );
      return;
    }

    // ── STEP 3: Receive category → create account + generate posts ─────────
    if (step === "ASK_CATEGORY") {
      const category = matchCategory(text);
      if (!category) {
        await sendText(
          from,
          `Please reply with a number from the list:\n\n${categoryLine()}`
        );
        return;
      }
      const finalData = { ...data, category };
      await setStep(from, "CREATING", finalData);
      await sendText(from, `✅ *${category}*\n\nCreating your account and first posts… ⏳`);
      await createAccountAndSendPosts(from, finalData);
      return;
    }

    if (step === "CREATING") {
      await sendText(from, "Still creating your posts — almost done! ⏳");
      return;
    }

    // Fallback nudge
    await nudge(from, step, data);
    return;
  }

  // ── Non-text (image, audio, etc.) before onboarding complete ─────────────
  if (messageType !== "text" && messageType !== "interactive") {
    if (!session || step === "WELCOME") {
      await askBusinessName(from, contactName);
    } else {
      await nudge(from, step, data);
    }
    return;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function askBusinessName(from: string, contactName?: string) {
  await setStep(from, "ASK_BUSINESS_NAME", {});
  const greeting = contactName ? `Hi ${contactName}! 👋` : "Hi there! 👋";
  await sendText(
    from,
    `${greeting} Welcome to *StatusCraft* — your AI marketing assistant.\n\nI'll set up your account in *under 2 minutes* and create your first posts right here on WhatsApp.\n\n*What's your business called?*`
  );
}

async function nudge(from: string, step: string, data: any) {
  if (step === "ASK_BUSINESS_NAME") {
    await sendText(from, "What's your business name? 😊");
  } else if (step === "ASK_CATEGORY") {
    await sendText(from, `Please reply with a number:\n\n${categoryLine()}`);
  } else {
    await sendText(from, "Type *restart* to start over, or keep replying to continue. 😊");
  }
}

async function createAccountAndSendPosts(from: string, data: any): Promise<void> {
  const { businessName, category } = data;
  const placeholderEmail = `${from}@wa.statuscraft.in`;

  try {
    const adminClient = getAdminClient();

    // 1. Create Supabase user
    let supabaseUserId: string;
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: placeholderEmail,
      email_confirm: true,
      phone: `+${from}`,
      phone_confirm: true,
      user_metadata: { source: "whatsapp_onboarding" },
    });

    if (createError) {
      const { data: listData } = await adminClient.auth.admin.listUsers();
      const existing = listData?.users?.find((u) => u.email === placeholderEmail || u.phone === `+${from}`);
      if (!existing) throw createError;
      supabaseUserId = existing.id;
    } else {
      supabaseUserId = createData.user.id;
    }

    // 2. Create Prisma user
    await prisma.user.upsert({
      where: { phone: from },
      create: { id: supabaseUserId, email: placeholderEmail, phone: from, plan: "FREE" },
      update: {},
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { phone: from } });

    // 3. Create brand
    const brand = await prisma.brand.create({
      data: {
        userId: user.id,
        name: businessName,
        category,
        onboardingCompleted: true,
      },
    });

    // 4. Create settings
    await prisma.settings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, whatsappConnected: true, whatsappOwnerPhone: from },
      update: { whatsappConnected: true, whatsappOwnerPhone: from },
    });

    // 5. Generate 3 posts with Claude (text only, fast ~3s)
    const posts = await generateWelcomePosts(businessName, category);

    // 6. Save as drafts
    const saved = await Promise.all(
      posts.map(p =>
        prisma.post.create({
          data: {
            brandId: brand.id,
            type: "PRODUCT",
            status: "DRAFT",
            tonality: "INFORMATIVE",
            headline: p.headline,
            bodyText: p.bodyText,
            ctaText: p.ctaText,
          },
        })
      )
    );

    // 7. Clean up onboarding session
    await clearSession(from);

    // 8. Send success message
    await sendText(
      from,
      `🎉 *Welcome to StatusCraft!*\n\n*${businessName}* is live.\n\nHere are your first 3 posts — approve the ones you like 👇`
    );

    // 9. Send each post with Approve / Discard buttons
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      const s = saved[i];
      const caption =
        `*Post ${i + 1} of 3*\n\n` +
        `📰 *${p.headline}*\n\n` +
        `${p.bodyText}\n\n` +
        `👉 ${p.ctaText}`;

      await sendButtons(from, `Post ${i + 1}`, caption, [
        { id: `approve:${s.id}`, title: "✅ Approve" },
        { id: `reject:${s.id}`,  title: "❌ Discard"  },
      ]);

      // Small delay so messages arrive in order
      await new Promise(r => setTimeout(r, 800));
    }

    // 10. Send closing tip
    await sendText(
      from,
      `That's it! 🚀\n\n*Your StatusCraft commands:*\n• Send a *voice note* anytime → instant new post\n• Reply *today* → see today's posts\n• Reply *help* → all commands\n\nEvery morning I'll automatically create 3 fresh posts for you. 🌅`
    );

  } catch (err: any) {
    console.error("[WA Onboarding] createAccount error:", err);
    await clearSession(from);
    await sendText(
      from,
      "Sorry, something went wrong setting up your account 😔 Please message us again in a moment."
    );
  }
}

async function generateWelcomePosts(
  businessName: string,
  category: string
): Promise<Array<{ headline: string; bodyText: string; ctaText: string }>> {
  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 700,
      messages: [{
        role: "user",
        content: `Create 3 WhatsApp Status posts for "${businessName}", a ${category} business in India.

Return JSON array only (no markdown):
[
  { "headline": "max 8 words", "bodyText": "2-3 sentences, 1-2 emojis, sounds natural in Indian English", "ctaText": "max 5 words" },
  { ... },
  { ... }
]

Make them varied: one promotional, one engagement, one seasonal/festive.`,
      }],
    });

    const text = res.content[0].type === "text" ? res.content[0].text : "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch (e) {
    console.error("[generateWelcomePosts]", e);
  }

  // Fallback
  return [
    { headline: `${businessName} — Fresh Today!`, bodyText: `✨ Visit ${businessName} for the best quality. We're open and ready to serve you!`, ctaText: "Visit Us Today" },
    { headline: "Special Offer This Week",         bodyText: `🎁 Exciting deals at ${businessName} this week only. Limited time — don't miss out!`, ctaText: "Grab the Deal" },
    { headline: "Thank You for Your Support",      bodyText: `💚 Because of you, ${businessName} keeps growing. Share this with a friend who'd love us!`, ctaText: "Tell a Friend" },
  ];
}
