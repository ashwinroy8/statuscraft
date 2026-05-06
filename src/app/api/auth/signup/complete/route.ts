/**
 * Signup Complete — verifies OTP, creates account if new, generates 3 posts, returns session.
 * Returns { redirectUrl, posts: [...] } on success.
 */
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s+\-()]/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export async function POST(req: NextRequest) {
  try {
    const { phone: rawPhone, code, businessName, category } = await req.json();

    if (!rawPhone || !code || !businessName || !category) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const phone = normalizePhone(String(rawPhone));

    // ── 1. Verify OTP ──────────────────────────────────────────────────────────
    const otpRecord = await prisma.otpCode.findUnique({ where: { phone } });

    if (!otpRecord) {
      return NextResponse.json({ error: "No OTP found. Please request a new code." }, { status: 400 });
    }
    if (otpRecord.expiresAt < new Date()) {
      await prisma.otpCode.delete({ where: { phone } }).catch(() => {});
      return NextResponse.json({ error: "Code expired. Please request a new one." }, { status: 400 });
    }
    if (otpRecord.code !== String(code).trim()) {
      return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
    }
    await prisma.otpCode.delete({ where: { phone } }).catch(() => {});

    // ── 2. Find or create user ─────────────────────────────────────────────────
    const adminClient = getAdminClient();
    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://statuscraft.in";

    let existingUser = await prisma.user.findFirst({ where: { phone } });
    let userEmail: string;

    if (existingUser) {
      // Returning user — just sign them in
      userEmail = existingUser.email;
    } else {
      // New user — create Supabase auth account + Prisma record
      userEmail = `wa${phone}@users.statuscraft.in`;

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: userEmail,
        phone: `+${phone}`,
        user_metadata: { name: businessName, phone },
        email_confirm: true,
      });

      let supabaseUserId: string;
      if (authError || !authData?.user) {
        // Email/phone already exists in Supabase — find the existing auth user
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const found = listData?.users?.find((u) => u.phone === `+${phone}` || u.email === userEmail);
        if (!found) {
          console.error("[signup/complete] createUser error:", authError);
          return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
        }
        supabaseUserId = found.id;
        userEmail = found.email ?? userEmail;
      } else {
        supabaseUserId = authData.user.id;
      }

      // Upsert Prisma user — id must match Supabase auth UUID
      existingUser = await prisma.user.upsert({
        where: { phone },
        create: {
          id: supabaseUserId,
          email: userEmail,
          name: businessName,
          phone,
          plan: "FREE",
        },
        update: { name: businessName, email: userEmail },
      });
    }

    // ── 3. Ensure brand exists ────────────────────────────────────────────────
    let brand = await prisma.brand.findFirst({ where: { userId: existingUser.id } });
    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          userId: existingUser.id,
          name: businessName,
          category,
          onboardingCompleted: true,   // name + category collected → ready to generate
        },
      });
    }

    // Also create Settings record so WhatsApp + auto features work
    await prisma.settings.upsert({
      where: { userId: existingUser.id },
      create: { userId: existingUser.id, whatsappConnected: false },
      update: {},
    }).catch(() => {});

    // ── 4. Generate 3 sample post ideas with Claude (text only, fast) ─────────
    const posts = await generateSamplePosts(businessName, category);

    // ── 5. Save posts as drafts ────────────────────────────────────────────────
    const savedPosts = await Promise.all(
      posts.map((p) =>
        prisma.post.create({
          data: {
            brandId: brand!.id,
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

    // ── 6. Mark latest visitor as converted (best-effort) ────────────────────
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;
    if (ip) {
      // Find the most recent visitor from this IP within the last 30 min
      const cutoff = new Date(Date.now() - 30 * 60 * 1000);
      await prisma.visitor.updateMany({
        where: { createdAt: { gte: cutoff }, converted: false },
        data: { converted: true },
      }).catch(() => {});
    }

    // ── 7. Generate magic link ────────────────────────────────────────────────
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: userEmail,
      options: { redirectTo: `${origin}/auth/callback` },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("[signup/complete] generateLink error:", linkError);
      return NextResponse.json({ error: "Account created but login failed. Please use the login page." }, { status: 500 });
    }

    return NextResponse.json({
      redirectUrl: linkData.properties.action_link,
      posts: posts.map((p, i) => ({ ...p, id: savedPosts[i].id })),
      brandId: brand.id,
      isNew: !brand,
    });
  } catch (err: any) {
    console.error("[signup/complete]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

async function generateSamplePosts(
  businessName: string,
  category: string
): Promise<Array<{ headline: string; bodyText: string; ctaText: string; emoji: string }>> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `Generate 3 WhatsApp Status post ideas for a ${category} business called "${businessName}" in India.

Return JSON array (no markdown):
[
  {
    "headline": "punchy headline under 8 words",
    "bodyText": "2-3 sentences of engaging copy. Use 1-2 emojis. Mention the business type naturally.",
    "ctaText": "short CTA under 5 words",
    "emoji": "single relevant emoji"
  }
]

Make posts varied: one promotional, one engagement-focused, one festive/seasonal.`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch (err) {
    console.error("[generateSamplePosts]", err);
  }

  // Fallback posts
  return [
    {
      headline: `Fresh from ${businessName}!`,
      bodyText: `✨ Discover our latest offerings at ${businessName}. Quality you can taste/see/feel — every single time. Visit us today!`,
      ctaText: "Order Now",
      emoji: "🌟",
    },
    {
      headline: "Weekend Special — Just for You",
      bodyText: `🎉 This weekend only — exclusive deals at ${businessName}. Don't miss out! Limited time, unlimited smiles.`,
      ctaText: "Grab the Deal",
      emoji: "🎁",
    },
    {
      headline: "Your Feedback Matters",
      bodyText: `💬 We love hearing from our customers! Drop a comment — what's your favourite thing about ${businessName}? Your response helps us serve you better.`,
      ctaText: "Tell Us",
      emoji: "💚",
    },
  ];
}
