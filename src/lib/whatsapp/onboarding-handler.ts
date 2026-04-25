import { prisma } from "@/lib/prisma";
import { sendText, sendButtons, sendList } from "./client";
import { getAdminClient } from "@/lib/supabase/admin";

const CATEGORIES: Array<{ id: string; title: string }> = [
  { id: "cat:restaurant", title: "Restaurant / Food" },
  { id: "cat:retail", title: "Retail / Shop" },
  { id: "cat:salon", title: "Salon / Beauty" },
  { id: "cat:realestate", title: "Real Estate" },
  { id: "cat:education", title: "Education / Coaching" },
  { id: "cat:medical", title: "Medical / Pharmacy" },
  { id: "cat:services", title: "Services & Repair" },
  { id: "cat:tech", title: "Tech / IT" },
  { id: "cat:fashion", title: "Fashion / Clothing" },
  { id: "cat:fitness", title: "Fitness / Gym" },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.title])
);

interface OnboardingData {
  ownerName?: string;
  businessName?: string;
  category?: string;
  description?: string;
}

export async function handleOnboardingMessage(
  from: string,
  messageType: string,
  message: any,
  contactName?: string
): Promise<void> {
  const session = await prisma.onboardingSession.findUnique({ where: { phone: from } });

  if (messageType === "interactive") {
    const replyId: string =
      message.interactive?.button_reply?.id ??
      message.interactive?.list_reply?.id ??
      "";

    if (replyId === "onboard:yes") {
      await updateSession(from, "ASK_NAME", {});
      await sendText(from, "Great! Let's get you set up 🙌\n\n*What's your name?*");
      return;
    }

    if (replyId === "onboard:skip") {
      await prisma.onboardingSession.delete({ where: { phone: from } }).catch(() => {});
      await sendText(from, "No worries! Whenever you're ready, just message us again to sign up. 👋");
      return;
    }

    if (replyId.startsWith("cat:") && session?.step === "ASK_CATEGORY") {
      const category = CATEGORY_LABELS[replyId] ?? replyId.replace("cat:", "");
      const data = { ...(session.data as OnboardingData), category };
      await updateSession(from, "ASK_DESCRIPTION", data);
      await sendText(
        from,
        `*${category}* ✅\n\nIn one sentence, what do you sell or offer?\n\n_Example: "We make and deliver fresh cakes for all occasions"_`
      );
      return;
    }

    if (replyId === "onboard:confirm" && session?.step === "CONFIRM") {
      await createAccount(from, session.data as OnboardingData);
      return;
    }

    if (replyId === "onboard:restart") {
      await prisma.onboardingSession.delete({ where: { phone: from } }).catch(() => {});
      await startOnboarding(from, contactName);
      return;
    }

    // Unhandled interactive during onboarding — nudge them along
    if (session) {
      await sendText(from, "Please reply to the question above to continue your signup 😊");
      return;
    }
  }

  if (messageType === "text") {
    const text = message.text?.body?.trim() ?? "";
    const lower = text.toLowerCase();

    if (!session || session.step === "WELCOME") {
      if (
        ["yes", "hi", "hello", "hey", "start", "haan", "ha", "ok", "okay", "signup", "sign up"].some(
          (k) => lower.includes(k)
        )
      ) {
        await updateSession(from, "ASK_NAME", {});
        await sendText(from, "Great! Let's get you set up 🙌\n\n*What's your name?*");
      } else {
        await startOnboarding(from, contactName);
      }
      return;
    }

    if (session.step === "ASK_NAME") {
      if (text.length < 2) {
        await sendText(from, "Please tell me your name 😊");
        return;
      }
      const data = { ...(session.data as OnboardingData), ownerName: text };
      await updateSession(from, "ASK_BUSINESS_NAME", data);
      await sendText(from, `Hi *${text}*! 👋\n\nWhat's the name of your business?`);
      return;
    }

    if (session.step === "ASK_BUSINESS_NAME") {
      if (text.length < 2) {
        await sendText(from, "Please enter your business name 😊");
        return;
      }
      const data = { ...(session.data as OnboardingData), businessName: text };
      await updateSession(from, "ASK_CATEGORY", data);
      await sendCategoryList(from);
      return;
    }

    if (session.step === "ASK_DESCRIPTION") {
      if (text.length < 5) {
        await sendText(from, "Please describe your business in a few words 😊");
        return;
      }
      const data = { ...(session.data as OnboardingData), description: text };
      await updateSession(from, "CONFIRM", data);
      await sendConfirmation(from, data as OnboardingData);
      return;
    }

    if (session.step === "CONFIRM") {
      if (["yes", "confirm", "ok", "okay", "haan", "correct"].some((k) => lower.includes(k))) {
        await createAccount(from, session.data as OnboardingData);
      } else {
        await prisma.onboardingSession.delete({ where: { phone: from } }).catch(() => {});
        await startOnboarding(from, contactName);
      }
      return;
    }

    // Catch-all for any other text during onboarding
    await sendText(from, "Please reply to the question above, or send *restart* to start over. 😊");
    return;
  }

  // Non-text, non-interactive message (image, video, etc.) during onboarding
  if (session) {
    await sendText(from, "Please reply with text to continue signing up 😊");
    return;
  }

  await startOnboarding(from, contactName);
}

async function startOnboarding(from: string, contactName?: string) {
  await prisma.onboardingSession.upsert({
    where: { phone: from },
    create: { phone: from, step: "WELCOME", data: {} },
    update: { step: "WELCOME", data: {}, updatedAt: new Date() },
  });

  const name = contactName ? `, ${contactName}` : "";
  await sendButtons(
    from,
    `Hi${name}! Welcome to StatusCraft 🚀`,
    "I use AI to create daily *WhatsApp Status posts* for your business — fresh marketing content every morning, automatically.\n\nWant to set up your free account? Takes 2 minutes!",
    [
      { id: "onboard:yes", title: "Yes, sign me up! 🎉" },
      { id: "onboard:skip", title: "Not now" },
    ]
  );
}

async function sendCategoryList(from: string) {
  await sendList(
    from,
    "What type of business do you run?",
    "Pick the category that best describes your business 👇",
    "Choose category",
    [
      {
        title: "Business categories",
        rows: CATEGORIES.map((c) => ({ id: c.id, title: c.title })),
      },
    ]
  );
}

async function sendConfirmation(from: string, data: OnboardingData) {
  await sendButtons(
    from,
    "Almost done! Here's your setup:",
    `👤 *Name:* ${data.ownerName}\n🏪 *Business:* ${data.businessName}\n🏷️ *Category:* ${data.category}\n📝 *About:* ${data.description}\n\nLooks good?`,
    [
      { id: "onboard:confirm", title: "✅ Yes, create account!" },
      { id: "onboard:restart", title: "🔄 Start over" },
    ]
  );
}

async function createAccount(from: string, data: OnboardingData): Promise<void> {
  await sendText(from, "Creating your account... ⏳");

  const placeholderEmail = `${from}@wa.statuscraft.in`;

  try {
    const adminClient = getAdminClient();

    // Create or retrieve Supabase auth user
    let supabaseUserId: string;
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: placeholderEmail,
      email_confirm: true,
      phone: `+${from}`,
      phone_confirm: true,
      user_metadata: { full_name: data.ownerName, source: "whatsapp_onboarding" },
    });

    if (createError) {
      // User may already exist — look them up by email
      const { data: listData } = await adminClient.auth.admin.listUsers();
      const existing = listData?.users?.find((u) => u.email === placeholderEmail);
      if (!existing) throw createError;
      supabaseUserId = existing.id;
    } else {
      supabaseUserId = createData.user.id;
    }

    // Create or update Prisma User
    await prisma.user.upsert({
      where: { phone: from },
      create: {
        id: supabaseUserId,
        email: placeholderEmail,
        name: data.ownerName,
        phone: from,
        plan: "FREE",
      },
      update: { name: data.ownerName },
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { phone: from } });

    // Create Brand
    await prisma.brand.create({
      data: {
        userId: user.id,
        name: data.businessName!,
        category: data.category ?? null,
        description: data.description ?? null,
        onboardingCompleted: true,
      },
    });

    // Create Settings
    await prisma.settings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        whatsappConnected: true,
        whatsappOwnerPhone: from,
      },
      update: {
        whatsappConnected: true,
        whatsappOwnerPhone: from,
      },
    });

    // Clean up onboarding session
    await prisma.onboardingSession.delete({ where: { phone: from } }).catch(() => {});

    await sendText(
      from,
      `🎉 *Welcome to StatusCraft, ${data.ownerName}!*\n\n` +
        `Your account for *${data.businessName}* is ready!\n\n` +
        `Here's what happens next:\n` +
        `📱 Every morning I'll send you 3 AI-crafted posts\n` +
        `✅ Approve them with a tap\n` +
        `🚀 They go out as your WhatsApp Status automatically\n\n` +
        `To get your first posts now, send me a *voice note* describing any product or offer you want to promote! 🎙️\n\n` +
        `_(Want the web dashboard too? Visit statuscraft.in → sign in with your phone number *+${from}* and the OTP we'll send here)_`
    );
  } catch (e) {
    console.error("[Onboarding] createAccount error:", e);
    await sendText(
      from,
      "Sorry, something went wrong creating your account 😔 Please try again in a moment, or contact us for help."
    );
  }
}

async function updateSession(phone: string, step: string, data: OnboardingData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonData = data as any;
  await prisma.onboardingSession.upsert({
    where: { phone },
    create: { phone, step, data: jsonData },
    update: { step, data: jsonData, updatedAt: new Date() },
  });
}
