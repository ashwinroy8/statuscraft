import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { FESTIVAL_EXPERT_SYSTEM, buildFestivalPrompt } from "./prompts/festival-expert";
import { generatePostImage } from "@/lib/media/image-generator";
import { getUpcomingFestivals } from "@/data/festivals";

const anthropic = new Anthropic();

export async function generateFestivalPostsForBrand(brandId: string): Promise<void> {
  const brand = await prisma.brand.findUniqueOrThrow({ where: { id: brandId } });

  const festivalPrefs = await prisma.festivalPreferences.findUnique({
    where: { userId: brand.userId },
  });

  const language = festivalPrefs?.language ?? "en";
  const upcoming = getUpcomingFestivals(7);

  for (const festival of upcoming) {
    // Skip if already generated a post for this festival today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await prisma.post.findFirst({
      where: {
        brandId,
        createdAt: { gte: today, lt: tomorrow },
        aiReasoning: { contains: festival.name },
      },
    });
    if (existing) continue;

    // Filter by religion preference
    if (festival.religion && festivalPrefs?.religions?.length) {
      const allowed = festivalPrefs.religions;
      if (!allowed.includes(festival.religion) && !allowed.includes("ALL")) continue;
    }

    // Skip minor festivals unless explicitly enabled
    if (festival.tier === "MINOR" && !festivalPrefs?.includeFunDays) continue;

    try {
      const prompt = buildFestivalPrompt({
        festivalName: festival.name,
        festivalSignificance: festival.significance,
        visualCues: festival.visualCues,
        colorPalette: festival.colorPalette,
        brandName: brand.name,
        brandCategory: brand.category ?? "Business",
        brandTagline: brand.tagline ?? undefined,
        brandColors: brand.colors,
        daysUntilFestival: festival.daysUntil,
        language,
      });

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        system: FESTIVAL_EXPERT_SYSTEM,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const postData = JSON.parse(jsonMatch[0]);

      // Schedule for 6 AM on the festival day
      const scheduledAt = new Date(festival.date);
      scheduledAt.setHours(6, 0, 0, 0);

      const post = await prisma.post.create({
        data: {
          brandId,
          type: "EVENT",
          tonality: "EMOTIONAL",
          headline: postData.headline,
          bodyText: postData.bodyText,
          ctaText: postData.ctaText,
          aiReasoning: `Festival post for ${festival.name} — ${festival.significance}`,
          scheduledAt,
          status: "DRAFT",
          metadata: {
            festivalName: festival.name,
            festivalTier: festival.tier,
            daysUntil: festival.daysUntil,
            hashtags: postData.hashtags ?? [],
          },
        },
      });

      // Generate image in background
      generatePostImage({
        postId: post.id,
        visualDirection: postData.imagePrompt,
        textOverlay: {
          headline: postData.headline,
          subtext: (postData.bodyText ?? "").slice(0, 80),
          cta: postData.ctaText ?? "",
        },
        brandColors: (brand.colors as any) ?? {
          primary: festival.colorPalette.primary,
          background: festival.colorPalette.bg,
        },
        postType: "EVENT",
        tonality: "EMOTIONAL",
      }).catch((e) => console.error(`Festival image failed for ${festival.name}:`, e));
    } catch (e) {
      console.error(`Failed to generate festival post for ${festival.name}:`, e);
    }
  }
}
