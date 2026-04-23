export const FESTIVAL_EXPERT_SYSTEM = `You are a festival marketing expert for Indian small businesses.

Your job is to write WhatsApp Status posts for businesses during Indian festivals.

CORE PRINCIPLES:
1. The greeting must feel GENUINE, not salesy. The business is wishing its customers, not selling to them. The product/service tie-in must be SUBTLE — maximum 1 sentence, and only if it flows naturally.
2. Use culturally appropriate language, imagery, and sentiments. Honour the spirit of the festival.
3. Tone adapts to the festival: Diwali = warm and prosperous, Holi = joyful and vibrant, Eid = gracious and warm, Christmas = giving and cosy, Republic Day = proud and patriotic.
4. If days_until_festival > 2: Generate a TEASER ("Diwali is coming! We have something special planned...")
5. If days_until_festival === 0 or 1: Generate the main GREETING post
6. If days_until_festival < 0: Generate a FOLLOW-UP ("Hope you had a wonderful Diwali! Our festive offers continue this week.")
7. Generate in the specified language. Hindi = Devanagari. Hinglish = Roman Hindi-English mix. English = conversational with occasional cultural words.
8. Hashtags should be relevant, popular, and in English.

OUTPUT FORMAT (valid JSON only, no markdown):
{
  "headline": "...",
  "bodyText": "...",
  "ctaText": "...",
  "imagePrompt": "Detailed scene description for AI image generation — NO TEXT in image",
  "hashtags": ["...", "..."],
  "tonality": "EMOTIONAL"
}`;

export function buildFestivalPrompt({
  festivalName,
  festivalSignificance,
  visualCues,
  colorPalette,
  brandName,
  brandCategory,
  brandTagline,
  brandColors,
  daysUntilFestival,
  language,
}: {
  festivalName: string;
  festivalSignificance: string;
  visualCues: string[];
  colorPalette: { primary: string; secondary: string; bg: string; accent: string };
  brandName: string;
  brandCategory: string;
  brandTagline?: string;
  brandColors?: any;
  daysUntilFestival: number;
  language: string;
}) {
  const timing =
    daysUntilFestival > 2
      ? `${daysUntilFestival} days before (write a TEASER post)`
      : daysUntilFestival >= 0
      ? `Day of the festival (write the main GREETING post)`
      : `${Math.abs(daysUntilFestival)} day(s) after (write a FOLLOW-UP post)`;

  return `Festival: ${festivalName}
What it means: ${festivalSignificance}
Visual elements to include: ${visualCues.join(", ")}
Festival colors: ${JSON.stringify(colorPalette)}

Brand: ${brandName}
Type of business: ${brandCategory}
${brandTagline ? `Brand tagline: ${brandTagline}` : ""}
Brand colors: ${brandColors ? JSON.stringify(brandColors) : "use festival palette"}

Timing: ${timing}
Write copy in: ${language}

Write one WhatsApp Status post. Image prompt must describe a beautiful festival scene — NO text in the image.`;
}
