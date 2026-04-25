/**
 * Ad Studio Pipeline
 * Upload product photo → Claude analyses it → FLUX img2img enhances it →
 * Claude writes tagline + body based on current trends → saved as draft post
 */

import Replicate from "replicate";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { uploadFileToStorage } from "./storage";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const anthropic = new Anthropic();

interface AdStudioResult {
  postId: string;
  originalImageUrl: string;
  enhancedImageUrl: string;
  headline: string;
  bodyText: string;
  ctaText: string;
  hashtags: string[];
  productName: string;
}

export async function runAdStudio(
  imageBuffer: Buffer,
  mimeType: string,
  brandId: string
): Promise<AdStudioResult> {
  const brand = await prisma.brand.findUniqueOrThrow({
    where: { id: brandId },
    select: { name: true, category: true, description: true, colors: true },
  });

  // ── Step 1: Upload original image to storage ─────────────────────────────────
  const originalPath = `ad-studio/${brandId}/${Date.now()}-original.jpg`;
  const originalImageUrl = await uploadFileToStorage(imageBuffer, originalPath, mimeType);

  // ── Step 2: Claude Vision — analyse the product ──────────────────────────────
  const base64 = imageBuffer.toString("base64");
  const analysisResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType as any, data: base64 },
          },
          {
            type: "text",
            text: `Analyse this product photo for a ${brand.category} business called "${brand.name}".

Return JSON:
{
  "productName": "short product name",
  "productDescription": "1-2 sentences describing what you see",
  "dominantColors": ["color1", "color2"],
  "style": "premium | casual | traditional | modern | rustic",
  "category": "food | fashion | electronics | beauty | home | other",
  "fluxPrompt": "detailed professional product photography prompt for FLUX AI — describe the ideal professional ad version of this product with studio lighting, clean composition, commercial quality. 2-3 sentences. Do NOT mention text or logos."
}`,
          },
        ],
      },
    ],
  });

  const analysisText =
    analysisResponse.content[0].type === "text" ? analysisResponse.content[0].text : "{}";
  const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
  const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  const productName: string = analysis.productName ?? "Product";
  const fluxPrompt: string =
    analysis.fluxPrompt ??
    `Professional product photography of ${productName}, studio lighting, white or gradient background, commercial quality, sharp focus, high end advertisement style`;

  // ── Step 3: Fetch trending signals for content context ───────────────────────
  const signals = await prisma.signal.findMany({
    where: {
      relevanceScore: { gte: 60 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { relevanceScore: "desc" },
    take: 3,
    select: { title: true, type: true },
  });

  const signalContext =
    signals.length > 0
      ? signals.map((s) => `${s.type}: ${s.title}`).join("; ")
      : "general Indian market trends";

  // ── Step 4: FLUX img2img — enhance to professional ad ───────────────────────
  const enhancedImageUrl = await enhanceWithFlux(originalImageUrl, fluxPrompt);

  // ── Step 5: Claude generates ad copy ────────────────────────────────────────
  const copyResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `Write WhatsApp Status ad copy for a ${brand.category} business called "${brand.name}".

Product: ${productName}
Product description: ${analysis.productDescription ?? ""}
Current trends: ${signalContext}

Return JSON:
{
  "headline": "punchy headline under 8 words, no emojis",
  "bodyText": "2-3 sentences of engaging ad copy mentioning the product and connecting to current trends or season. Use 1-2 relevant emojis.",
  "ctaText": "short call to action under 6 words",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}`,
      },
    ],
  });

  const copyText =
    copyResponse.content[0].type === "text" ? copyResponse.content[0].text : "{}";
  const copyMatch = copyText.match(/\{[\s\S]*\}/);
  const copy = copyMatch ? JSON.parse(copyMatch[0]) : {};

  const headline: string = copy.headline ?? `${productName} — Just Arrived!`;
  const bodyText: string = copy.bodyText ?? `Check out our latest ${productName}. Quality you can trust.`;
  const ctaText: string = copy.ctaText ?? "Order Now";
  const hashtags: string[] = copy.hashtags ?? [];

  // ── Step 6: Create draft Post ────────────────────────────────────────────────
  const post = await prisma.post.create({
    data: {
      brandId,
      type: "PRODUCT",
      status: "DRAFT",
      tonality: "PREMIUM",
      headline,
      bodyText: `${bodyText}\n\n${hashtags.join(" ")}`,
      ctaText,
      imageUrl: enhancedImageUrl,
      aiReasoning: `Ad Studio: Product photo of "${productName}" enhanced with FLUX img2img. Trends used: ${signalContext}`,
    },
  });

  return {
    postId: post.id,
    originalImageUrl,
    enhancedImageUrl,
    headline,
    bodyText,
    ctaText,
    hashtags,
    productName,
  };
}

async function enhanceWithFlux(imageUrl: string, prompt: string): Promise<string> {
  const fullPrompt = `${prompt}, professional advertisement photography, ultra high quality, commercial grade, vibrant colors, sharp focus, 9:16 vertical format`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, attempt * 12_000));
    }
    try {
      const output = await replicate.run("black-forest-labs/flux-dev", {
        input: {
          prompt: fullPrompt,
          image: imageUrl,
          prompt_strength: 0.65,
          num_inference_steps: 28,
          guidance: 3.5,
          aspect_ratio: "9:16",
          output_format: "jpg",
          output_quality: 90,
        },
      });

      let url: string;
      if (typeof output === "string") url = output;
      else if (Array.isArray(output) && output[0]) {
        const item = output[0];
        if (typeof item === "string") url = item;
        else if (typeof (item as any).url === "function") url = await (item as any).url();
        else url = String(item);
      } else if (output && typeof (output as any).url === "function") {
        url = await (output as any).url();
      } else {
        url = String(output);
      }

      // Store in Supabase permanently
      const { uploadFileToStorage: upload } = await import("./storage");
      const res = await fetch(url);
      const buf = Buffer.from(await res.arrayBuffer());
      const path = `ad-studio/enhanced/${Date.now()}.jpg`;
      return await upload(buf, path, "image/jpeg");
    } catch (err: any) {
      lastError = err;
      const is429 =
        err?.response?.status === 429 ||
        err?.message?.includes("429") ||
        err?.message?.includes("Too Many Requests");
      if (!is429) throw err;
    }
  }
  throw lastError ?? new Error("Enhancement failed");
}
