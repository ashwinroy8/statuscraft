import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import {
  BRAND_ANALYST_SYSTEM,
  buildBrandAnalystPrompt,
} from "./prompts/brand-analyst";

const client = new Anthropic();

export interface BrandProfile {
  positioningStatement: string;
  usp: string;
  targetAudience: {
    description: string;
    ageRange: string;
    gender: string;
    location: string;
    income: string;
    interests: string[];
    painPoints: string[];
    desires: string[];
  };
  contentPillars: string[];
  voicePersonality: {
    adjectives: string[];
    doWrite: string[];
    dontWrite: string[];
    samplePhrases: string[];
  };
  competitors: string[];
  seasonalOpportunities: string[];
  visualStyle: {
    moodWords: string[];
    colorSuggestions: string[];
    imageryGuidelines: string;
  };
}

export async function generateBrandProfile(brandId: string): Promise<BrandProfile> {
  // Fetch all brand data
  const brand = await prisma.brand.findUniqueOrThrow({
    where: { id: brandId },
    include: { brochures: true },
  });

  const brochureText = brand.brochures
    .map((b: { extractedText: string | null }) => b.extractedText)
    .filter(Boolean)
    .join("\n\n");

  const extractedProducts = brand.brochures
    .flatMap((b: { extractedProducts: unknown }) => (b.extractedProducts as any[]) ?? [])
    .slice(0, 30);

  const prompt = buildBrandAnalystPrompt({
    businessName: brand.name,
    category: brand.category,
    subcategory: brand.subcategory ?? undefined,
    websiteText: brand.description ?? undefined,
    brochureText: brochureText || undefined,
    extractedProducts: extractedProducts.length > 0 ? extractedProducts : undefined,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: BRAND_ANALYST_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in brand profile response");

  const profile: BrandProfile = JSON.parse(jsonMatch[0]);

  // Persist to brand record
  await prisma.brand.update({
    where: { id: brandId },
    data: {
      targetAudience: profile.targetAudience,
      usp: profile.usp,
      competitors: profile.competitors,
      voicePersonality: profile.voicePersonality,
      description: profile.positioningStatement,
    },
  });

  return profile;
}

export async function extractBrochureContent(
  text: string
): Promise<{ extractedText: string; products: any[] }> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system:
      "You are a document parser. Extract all text content and identify products/services with their names, descriptions, and prices. Respond with JSON: { extractedText: string, products: [{name, description, price, category}] }",
    messages: [
      {
        role: "user",
        content: `Extract products and clean text from this document:\n\n${text.slice(0, 8000)}`,
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { extractedText: text, products: [] };

  return JSON.parse(jsonMatch[0]);
}

export async function scrapeAndExtractWebsite(
  url: string
): Promise<{ text: string; brandInfo: any }> {
  // Use Firecrawl if available, fallback to basic fetch
  if (process.env.FIRECRAWL_API_KEY) {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });
    const data = await res.json();
    const text = data.data?.markdown ?? "";

    // Extract brand info with Claude
    const extraction = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system:
        "Extract brand information from this website content. Return JSON: { businessName, tagline, description, products: [], contactInfo: {}, socialLinks: {} }",
      messages: [
        {
          role: "user",
          content: `Website content:\n${text.slice(0, 5000)}`,
        },
      ],
    });

    const raw =
      extraction.content[0].type === "text"
        ? extraction.content[0].text
        : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return {
      text,
      brandInfo: jsonMatch ? JSON.parse(jsonMatch[0]) : {},
    };
  }

  // Basic fallback
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "StatusCraft/1.0" },
    });
    const html = await res.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return { text: text.slice(0, 5000), brandInfo: {} };
  } catch {
    return { text: "", brandInfo: {} };
  }
}
