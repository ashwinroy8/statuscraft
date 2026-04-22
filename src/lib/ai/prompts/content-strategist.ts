export const CONTENT_STRATEGIST_SYSTEM = `You are a team of 5 world-class experts collaborating to plan today's WhatsApp Status content for a small business:

1. CONTENT STRATEGIST — decides what to post and why, based on brand goals and past performance
2. COPYWRITER — writes compelling headlines, body text, and CTAs in the brand's voice
3. BRAND MANAGER — ensures every post fits the brand personality and visual identity
4. SOCIAL MEDIA EXPERT — knows what formats get engagement on WhatsApp Status
5. TREND ANALYST — connects current signals (news, trends, weather, events) to the brand's products

Together you must decide 1-3 posts for today. Each post must be purposeful — either leveraging a signal, advancing a campaign, or filling a content pillar.

IMPORTANT RULES:
- WhatsApp Status disappears in 24 hours — posts must feel timely and relevant TODAY
- Avoid corporate/generic language. Write like a smart local business owner
- Every post needs a hook in the headline — curiosity, humor, or urgency
- CTAs should drive replies, visits, or purchases
- Visual direction must be specific enough to generate with AI image tools (Flux, Ideogram)
- Mix post types — don't generate 3 product posts in a row

Respond with valid JSON only. No markdown, no explanation outside JSON.

RESPONSE SCHEMA:
{
  "posts": [
    {
      "type": "PRODUCT | TREND | QUIZ | POLL | MEME | EVENT | EDUCATIONAL | STORY",
      "tonality": "WITTY | PREMIUM | INFORMATIVE | EMOTIONAL | URGENT | PLAYFUL",
      "headline": "the big hook — max 8 words",
      "bodyText": "1-3 sentences of copy in brand voice",
      "ctaText": "action-oriented CTA — max 6 words",
      "signalId": "id of signal used, or null",
      "signalSource": { "type": "TREND|HOLIDAY|etc", "title": "signal title", "angle": "how it connects to this brand" },
      "visualDirection": "detailed prompt for AI image generator — describe background, mood, colors, composition, NO TEXT in image",
      "textOverlay": {
        "headline": "exact text for large overlay",
        "subtext": "exact text for smaller overlay",
        "cta": "CTA text"
      },
      "aiReasoning": "2-3 sentences explaining why this specific post, why today, what outcome is expected",
      "suggestedScheduleTime": "HH:MM in 24h format"
    }
  ]
}`;

export function buildContentStrategyPrompt({
  brand,
  signals,
  recentPosts,
  campaigns,
  date,
}: {
  brand: any;
  signals: any[];
  recentPosts: any[];
  campaigns: any[];
  date: string;
}) {
  const performanceInsights = analyzePerformance(recentPosts);

  return `Plan today's WhatsApp Status posts for this business.

TODAY'S DATE: ${date}

BRAND PROFILE:
Name: ${brand.name}
Category: ${brand.category}
USP: ${brand.usp}
Positioning: ${brand.description}
Target Audience: ${JSON.stringify(brand.targetAudience)}
Voice Personality: ${JSON.stringify(brand.voicePersonality)}
Content Pillars: ${JSON.stringify(brand.contentPillars || [])}
Preferred Tonality: ${brand.voicePersonality?.tonality || "WITTY"}
Brand Colors: ${JSON.stringify(brand.colors)}

ACTIVE SIGNALS (use the most relevant ones):
${signals.map((s) => `[${s.type}] ${s.title} — relevance ${s.relevanceScore}/100\n  ${s.description || ""}`).join("\n")}

PERFORMANCE FROM LAST 14 DAYS:
${performanceInsights}

ACTIVE CAMPAIGNS:
${campaigns.map((c) => `- ${c.name} (${c.type}, ${c.frequency}): ${c.description || ""}`).join("\n") || "None"}

RECENT POST HISTORY (to avoid repetition):
${recentPosts
  .slice(0, 7)
  .map((p) => `- ${p.type}: "${p.headline}" (${p.status}, score: ${p.analytics?.aiScore ?? "?"})`)
  .join("\n")}

Generate 1-3 posts for today. Prioritize signals with relevance > 70. Avoid repeating post types from the last 3 days.`;
}

function analyzePerformance(posts: any[]): string {
  if (!posts.length) return "No performance data yet — this is the beginning!";

  const withAnalytics = posts.filter((p) => p.analytics);
  if (!withAnalytics.length) return "Posts exist but analytics not yet available.";

  const avgScore =
    withAnalytics.reduce((sum, p) => sum + (p.analytics.aiScore || 0), 0) /
    withAnalytics.length;

  const bestPost = withAnalytics.sort(
    (a, b) => (b.analytics.aiScore || 0) - (a.analytics.aiScore || 0)
  )[0];

  const typePerformance: Record<string, { total: number; count: number }> = {};
  withAnalytics.forEach((p) => {
    if (!typePerformance[p.type])
      typePerformance[p.type] = { total: 0, count: 0 };
    typePerformance[p.type].total += p.analytics.aiScore || 0;
    typePerformance[p.type].count++;
  });

  const bestType = Object.entries(typePerformance).sort(
    (a, b) => b[1].total / b[1].count - a[1].total / a[1].count
  )[0];

  return `Average engagement score: ${avgScore.toFixed(0)}/100
Best performing post type: ${bestType?.[0]} (avg score ${(bestType?.[1].total / bestType?.[1].count).toFixed(0)})
Best post: "${bestPost?.headline}" (score ${bestPost?.analytics?.aiScore})`;
}
