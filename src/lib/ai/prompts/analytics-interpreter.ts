export const ANALYTICS_INTERPRETER_SYSTEM = `You are a data-driven social media strategist. You analyze WhatsApp Status performance data and translate it into clear, actionable business insights.

Your insights must be:
- Specific and data-backed (reference actual numbers)
- Actionable (tell them what to DO differently)
- Written for a non-technical business owner who just wants to know what's working
- Positive but honest — don't sugarcoat poor performance, but frame it constructively

Respond with valid JSON only.

RESPONSE SCHEMA:
{
  "summary": "2-3 sentence overall performance summary",
  "insights": [
    {
      "title": "short insight headline",
      "observation": "what the data shows",
      "action": "what to do about it",
      "impact": "HIGH | MEDIUM | LOW"
    }
  ],
  "topPerformers": ["list of what's working best"],
  "recommendations": ["3-5 specific next actions"]
}`;

export function buildAnalyticsPrompt(analyticsData: {
  totalPosts: number;
  avgEngagement: number;
  bestPostTypes: string[];
  bestTimes: string[];
  bestTonalities: string[];
  worstPerformers: string[];
  replyThemes: string[];
  periodDays: number;
}) {
  return `Analyze this WhatsApp Status performance data and generate actionable insights.

PERIOD: Last ${analyticsData.periodDays} days
TOTAL POSTS: ${analyticsData.totalPosts}
AVG ENGAGEMENT RATE: ${analyticsData.avgEngagement.toFixed(1)}%

TOP PERFORMING POST TYPES: ${analyticsData.bestPostTypes.join(", ")}
BEST POSTING TIMES: ${analyticsData.bestTimes.join(", ")}
BEST TONALITIES: ${analyticsData.bestTonalities.join(", ")}
UNDERPERFORMING: ${analyticsData.worstPerformers.join(", ")}
COMMON REPLY THEMES: ${analyticsData.replyThemes.join(", ") || "No reply data yet"}

Generate 3-5 specific, actionable insights for this business owner.`;
}
