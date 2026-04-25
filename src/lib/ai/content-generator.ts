import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import {
  CONTENT_STRATEGIST_SYSTEM,
  buildContentStrategyPrompt,
} from "./prompts/content-strategist";
import { generatePostImage } from "@/lib/media/image-generator";
import { format } from "date-fns";

const client = new Anthropic();

export interface GeneratedPost {
  type: string;
  tonality: string;
  headline: string;
  bodyText: string;
  ctaText: string;
  signalId?: string;
  signalSource?: any;
  visualDirection: string;
  textOverlay: {
    headline: string;
    subtext: string;
    cta: string;
  };
  aiReasoning: string;
  suggestedScheduleTime: string;
}

export async function generateDailyContent(brandId: string): Promise<void> {
  const brand = await prisma.brand.findUniqueOrThrow({
    where: { id: brandId },
    include: { brochures: true },
  });

  if (!brand.onboardingCompleted) return;

  const settings = await prisma.settings.findUnique({ where: { userId: brand.userId } });

  // Fetch active signals
  const now = new Date();
  const signals = await prisma.signal.findMany({
    where: {
      relevanceScore: { gte: 40 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { relevanceScore: "desc" },
    take: 10,
  });

  // Fetch recent posts with analytics
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const recentPosts = await prisma.post.findMany({
    where: { brandId, createdAt: { gte: fourteenDaysAgo } },
    include: { analytics: true, signal: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Fetch active campaigns
  const campaigns = await prisma.campaign.findMany({
    where: { brandId, isActive: true },
  });

  const prompt = buildContentStrategyPrompt({
    brand,
    signals,
    recentPosts,
    campaigns,
    date: format(now, "EEEE, MMMM d, yyyy"),
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: CONTENT_STRATEGIST_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return;

  const result = JSON.parse(jsonMatch[0]);
  const posts: GeneratedPost[] = result.posts ?? [];

  const preferredTimes: string[] = Array.isArray(settings?.preferredPostTimes)
    ? (settings.preferredPostTimes as string[])
    : ["08:00", "12:00", "18:00"];

  for (let i = 0; i < posts.length; i++) {
    const postData = posts[i];
    const scheduledTime = preferredTimes[i] ?? postData.suggestedScheduleTime ?? "09:00";
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const scheduledAt = new Date(now);
    scheduledAt.setHours(hours, minutes, 0, 0);

    // Create post record
    const post = await prisma.post.create({
      data: {
        brandId,
        type: postData.type as any,
        tonality: postData.tonality as any,
        headline: postData.headline,
        bodyText: postData.bodyText,
        ctaText: postData.ctaText,
        signalId: postData.signalId ?? null,
        signalSource: postData.signalSource ?? undefined,
        aiReasoning: postData.aiReasoning,
        scheduledAt,
        status: settings?.autoApprove ? "SCHEDULED" : "DRAFT",
      },
    });

    // Generate image in background — pass variantIndex so each post gets a distinct visual style
    generatePostImage({
      postId: post.id,
      visualDirection: postData.visualDirection,
      textOverlay: postData.textOverlay,
      brandColors: (brand.colors as any) ?? {},
      postType: postData.type,
      tonality: postData.tonality,
      variantIndex: i,
    }).catch((e) => console.error(`Image generation failed for post ${post.id}:`, e));
  }
}

export async function generateSinglePost(
  brandId: string,
  options: {
    type?: string;
    tonality?: string;
    signalId?: string;
    campaignId?: string;
  }
): Promise<string> {
  await generateDailyContent(brandId);
  // Returns the ID of the first newly created post
  const post = await prisma.post.findFirst({
    where: { brandId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });
  return post?.id ?? "";
}
