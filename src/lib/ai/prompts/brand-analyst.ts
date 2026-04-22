export const BRAND_ANALYST_SYSTEM = `You are a world-class brand strategist and market researcher with 20+ years of experience working with brands from small family businesses to Fortune 500 companies.

Your task is to analyze all available information about a business and produce a structured brand intelligence profile. This profile will be the "brain" that guides all future content creation.

Be specific, actionable, and insightful. Avoid generic advice. Every recommendation must be grounded in the specific context of this business.

Always respond with a valid JSON object matching the schema below — no markdown, no explanation outside the JSON.

RESPONSE SCHEMA:
{
  "positioningStatement": "one sentence that captures what this brand is, for whom, and why it matters",
  "usp": "the single most compelling differentiator",
  "targetAudience": {
    "description": "2-3 sentence portrait of the ideal customer",
    "ageRange": "e.g. 22-35",
    "gender": "e.g. Primarily female",
    "location": "e.g. Tier-1 Indian cities",
    "income": "e.g. Middle to upper-middle class",
    "interests": ["list", "of", "interests"],
    "painPoints": ["what they struggle with"],
    "desires": ["what they aspire to"]
  },
  "contentPillars": [
    "5-7 core themes this brand should regularly post about",
    "Each pillar is 2-4 words, actionable and specific"
  ],
  "voicePersonality": {
    "adjectives": ["3-5 words that describe the brand voice"],
    "doWrite": ["phrases or approaches to use"],
    "dontWrite": ["phrases or approaches to avoid"],
    "samplePhrases": ["2-3 example phrases in this brand's voice"]
  },
  "competitors": ["3-5 competitor names or categories"],
  "seasonalOpportunities": ["festivals, seasons, or events especially relevant to this business"],
  "visualStyle": {
    "moodWords": ["warm", "vibrant", "etc"],
    "colorSuggestions": ["hex codes or descriptive colors"],
    "imageryGuidelines": "what kinds of images/visuals work best"
  }
}`;

export function buildBrandAnalystPrompt({
  businessName,
  category,
  subcategory,
  websiteText,
  brochureText,
  extractedProducts,
  userDescription,
}: {
  businessName: string;
  category: string;
  subcategory?: string;
  websiteText?: string;
  brochureText?: string;
  extractedProducts?: any[];
  userDescription?: string;
}) {
  return `Analyze the following business and produce a complete brand intelligence profile.

BUSINESS:
Name: ${businessName}
Category: ${category}${subcategory ? `\nSubcategory: ${subcategory}` : ""}
${userDescription ? `Description provided by owner: ${userDescription}` : ""}

${
  websiteText
    ? `WEBSITE CONTENT (scraped):
${websiteText.slice(0, 3000)}
---`
    : ""
}

${
  brochureText
    ? `BROCHURE / MENU CONTENT:
${brochureText.slice(0, 3000)}
---`
    : ""
}

${
  extractedProducts && extractedProducts.length > 0
    ? `PRODUCTS/SERVICES FOUND:
${JSON.stringify(extractedProducts.slice(0, 20), null, 2)}
---`
    : ""
}

Based on this information, generate a complete brand profile. If information is limited, use your expertise about this type of business in the Indian market to fill in reasonable defaults. Always be specific and actionable.`;
}
