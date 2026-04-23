import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { generatePostImage } from "@/lib/media/image-generator";
import {
  CONTENT_STRATEGIST_SYSTEM,
  buildContentStrategyPrompt,
} from "@/lib/ai/prompts/content-strategist";
import { format } from "date-fns";

const anthropic = new Anthropic();

// Maps template category → valid post type
const CATEGORY_TO_TYPE: Record<string, string> = {
  PRODUCT: "PRODUCT",
  QUOTE: "STORY",
  QUIZ: "QUIZ",
  ANNOUNCEMENT: "EVENT",
  MEME: "MEME",
  TESTIMONIAL: "STORY",
};

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { brandId, postType } = await req.json();
  if (!brandId) return NextResponse.json({ error: "brandId required" }, { status: 400 });

  // Verify brand ownership
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: user.id },
    include: { brochures: true },
  });
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const forcedType = CATEGORY_TO_TYPE[postType] ?? postType ?? "PRODUCT";

  const settings = await prisma.settings.findUnique({ where: { userId: brand.userId } });

  // Fetch recent posts and signals for context
  const now = new Date();
  const signals = await prisma.signal.findMany({
    where: {
      relevanceScore: { gte: 40 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { relevanceScore: "desc" },
    take: 5,
  });

  const recentPosts = await prisma.post.findMany({
    where: { brandId, createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
    include: { analytics: true, signal: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const campaigns = await prisma.campaign.findMany({
    where: { brandId, isActive: true },
  });

  // Build prompt with forced type override
  const basePrompt = buildContentStrategyPrompt({
    brand,
    signals,
    recentPosts,
    campaigns,
    date: format(now, "EEEE, MMMM d, yyyy"),
  });

  const prompt = `${basePrompt}

IMPORTANT: Generate exactly 1 post. The post type MUST be: ${forcedType}. This is a template-based request so force this specific type.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: CONTENT_STRATEGIST_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }

  const result = JSON.parse(jsonMatch[0]);
  const posts = result.posts ?? [];
  if (posts.length === 0) {
    return NextResponse.json({ error: "No posts generated" }, { status: 500 });
  }

  const postData = posts[0];

  // Create post record
  const post = await prisma.post.create({
    data: {
      brandId,
      type: (postData.type ?? forcedType) as any,
      tonality: (postData.tonality ?? "WITTY") as any,
      headline: postData.headline,
      bodyText: postData.bodyText,
      ctaText: postData.ctaText,
      signalId: postData.signalId ?? null,
      signalSource: postData.signalSource ?? undefined,
      aiReasoning: postData.aiReasoning,
      scheduledAt: now,
      status: settings?.autoApprove ? "SCHEDULED" : "DRAFT",
    },
  });

  // Generate image in background (non-blocking)
  generatePostImage({
    postId: post.id,
    visualDirection: postData.visualDirection,
    textOverlay: postData.textOverlay,
    brandColors: (brand.colors as any) ?? {},
    postType: postData.type ?? forcedType,
    tonality: postData.tonality ?? "WITTY",
  }).catch((e) => console.error(`Image generation failed for post ${post.id}:`, e));

  return NextResponse.json({ postId: post.id });
}
