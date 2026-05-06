import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDailyContent } from "@/lib/ai/content-generator";

// ── Auth helper ───────────────────────────────────────────────────────────────
function isAuthorised(req: NextRequest): boolean {
  const secret =
    req.headers.get("authorization")?.replace("Bearer ", "") ??
    new URL(req.url).searchParams.get("secret");
  return (
    secret === process.env.TRIGGER_SECRET_KEY ||
    secret === "local-dev-secret"
  );
}

// ── Push today's posts to the brand owner on WhatsApp ─────────────────────────
async function pushPostsToWhatsApp(brandId: string): Promise<void> {
  // Get brand + user + settings in one query
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: {
      user: {
        include: { settings: true },
      },
    },
  });

  if (!brand) return;

  // Resolve owner phone: prefer settings.whatsappOwnerPhone, fall back to user.phone
  const ownerPhone =
    brand.user.settings?.whatsappOwnerPhone ??
    brand.user.phone;

  if (!ownerPhone) return; // no phone on record — skip silently

  // Get today's draft posts (just generated)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const posts = await prisma.post.findMany({
    where: {
      brandId,
      status: "DRAFT",
      createdAt: { gte: today, lt: tomorrow },
    },
    orderBy: { createdAt: "asc" },
    take: 3,
  });

  if (!posts.length) return;

  // Lazy-load WhatsApp client to avoid circular import issues at module load time
  const { sendText, sendImageWithButtons, sendButtons } = await import("@/lib/whatsapp/client");

  // Opening message
  await sendText(
    ownerPhone,
    `🌅 Good morning! Here are today's ${posts.length} posts for *${brand.name}* — approve the ones you like 👇`
  );

  // Send each post with approve/discard
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];

    const caption =
      `*Post ${i + 1} of ${posts.length}*\n\n` +
      `📰 *${p.headline ?? "Untitled"}*\n\n` +
      (p.bodyText ? `${p.bodyText.slice(0, 600)}\n\n` : "") +
      (p.ctaText ? `👉 ${p.ctaText}` : "");

    const buttons = [
      { id: `approve:${p.id}`, title: "✅ Approve" },
      { id: `reject:${p.id}`,  title: "❌ Discard"  },
    ];

    if (p.imageUrl) {
      await sendImageWithButtons(ownerPhone, p.imageUrl, caption, buttons);
    } else {
      await sendButtons(ownerPhone, `Post ${i + 1}`, caption, buttons);
    }

    // small delay so messages arrive in order
    if (i < posts.length - 1) await new Promise(r => setTimeout(r, 800));
  }

  // Closing tip
  await sendText(
    ownerPhone,
    `💡 _Tip: Send me a *voice note* anytime to create more posts, or reply *today* to see these again._`
  );
}

// ── GET — called by cron-job.org ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const brandId = new URL(req.url).searchParams.get("brandId") ?? undefined;

  if (brandId) {
    await generateDailyContent(brandId);
    await pushPostsToWhatsApp(brandId).catch(e =>
      console.error(`[push-posts] brand ${brandId}:`, e?.message)
    );
    return NextResponse.json({ success: true, brandId });
  }

  // All active brands
  const brands = await prisma.brand.findMany({
    where: { onboardingCompleted: true },
    select: { id: true },
  });

  const results = await Promise.allSettled(
    brands.map(async (b) => {
      await generateDailyContent(b.id);
      await pushPostsToWhatsApp(b.id);
    })
  );

  const succeeded = results.filter(r => r.status === "fulfilled").length;
  const failed    = results.filter(r => r.status === "rejected").length;

  return NextResponse.json({ succeeded, failed, total: brands.length });
}

// ── POST — called by the dashboard "Generate Today's Posts" button ────────────
export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { brandId, push = false } = await req.json();

  if (brandId) {
    try {
      await generateDailyContent(brandId);
    } catch (err: any) {
      console.error("[generate-content POST] generateDailyContent failed:", err);
      return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
    }
    if (push) {
      await pushPostsToWhatsApp(brandId).catch(e =>
        console.error(`[push-posts] brand ${brandId}:`, e?.message)
      );
    }
    return NextResponse.json({ success: true, brandId });
  }

  const brands = await prisma.brand.findMany({
    where: { onboardingCompleted: true },
    select: { id: true },
  });

  const results = await Promise.allSettled(
    brands.map(async (b) => {
      await generateDailyContent(b.id);
      if (push) await pushPostsToWhatsApp(b.id);
    })
  );

  const succeeded = results.filter(r => r.status === "fulfilled").length;
  return NextResponse.json({ succeeded, total: brands.length });
}
