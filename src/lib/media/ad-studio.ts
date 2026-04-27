/**
 * Ad Studio Pipeline
 * Upload product photo → remove background → generate pro studio background →
 * composite product onto new background → Claude writes copy → saved as draft post
 *
 * The product itself is NEVER changed. Only the background is replaced.
 */

import Replicate from "replicate";
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { uploadFileToStorage } from "./storage";
import { transcribeAudio } from "@/lib/voice/transcription";

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
  "backgroundPrompt": "describe ONLY the ideal background/setting for this product — e.g. 'warm wooden table with soft bokeh' or 'clean white gradient studio backdrop with subtle shadow'. Do NOT describe the product itself. 1-2 sentences."
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
  const backgroundPrompt: string =
    analysis.backgroundPrompt ??
    "clean white studio backdrop, soft shadow beneath product, professional photography lighting";

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

  // ── Step 4: Remove bg → generate pro background → composite ────────────────
  const enhancedImageUrl = await enhanceProductPhoto(originalImageUrl, backgroundPrompt);

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

// Fixed canvas: 1080×1920 (9:16 WhatsApp Status) — FLUX Schnell requires multiples of 16
const CANVAS_W = 1080;
const CANVAS_H = 1920;

/**
 * Three-step enhancement — product is NEVER changed:
 * 1. rembg → removes background, keeps product with transparency
 * 2. FLUX Schnell → generates a matching professional studio background (1080×1920)
 * 3. Sharp → composites product centered on background, applies edge sharpening
 *
 * Falls back to FLUX-only (no compositing) if rembg fails.
 */
async function enhanceProductPhoto(imageUrl: string, backgroundPrompt: string): Promise<string> {
  // ── Step 2 (run in parallel with step 1): Generate background ────────────────
  console.log("[AdStudio] Generating background + removing bg in parallel...");
  const bgPrompt = `${backgroundPrompt}, clean professional photography studio background, soft even lighting, no objects no people, subtle gradient, high quality`;

  const [bgResult, rembgResult] = await Promise.allSettled([
    replicateRun("black-forest-labs/flux-schnell", {
      prompt: bgPrompt,
      width: CANVAS_W,
      height: CANVAS_H,
      num_inference_steps: 4,
      output_format: "jpg",
      output_quality: 95,
    }),
    replicateRun("cjwbw/rembg", {
      image: imageUrl,
      model: "u2net",
    }),
  ]);

  if (bgResult.status === "rejected") {
    console.error("[AdStudio] Background generation failed:", bgResult.reason);
    throw new Error("Background generation failed: " + bgResult.reason?.message);
  }

  const bgUrl = extractUrl(bgResult.value);
  const bgRes = await fetch(bgUrl);
  const bgBuffer = Buffer.from(await bgRes.arrayBuffer());

  // ── Step 3: Composite if rembg succeeded, otherwise use original ─────────────
  if (rembgResult.status === "rejected") {
    console.warn("[AdStudio] rembg failed, using original product on new background:", rembgResult.reason?.message);
    // Fallback: resize original onto background (no transparency, but still better bg)
    const origRes = await fetch(imageUrl);
    const origBuffer = Buffer.from(await origRes.arrayBuffer());

    const composited = await sharp(bgBuffer)
      .resize(CANVAS_W, CANVAS_H, { fit: "cover" })
      .composite([{
        input: await sharp(origBuffer)
          .resize(Math.round(CANVAS_W * 0.80), Math.round(CANVAS_H * 0.70), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .toBuffer(),
        top: Math.round(CANVAS_H * 0.12),
        left: Math.round(CANVAS_W * 0.10),
        blend: "over",
      }])
      .jpeg({ quality: 92 })
      .toBuffer();

    const path = `ad-studio/enhanced/${Date.now()}.jpg`;
    return uploadFileToStorage(composited, path, "image/jpeg");
  }

  console.log("[AdStudio] Compositing product onto background...");
  const rembgUrl = extractUrl(rembgResult.value);
  const productRes = await fetch(rembgUrl);
  const productBuffer = Buffer.from(await productRes.arrayBuffer());

  // Scale product to 78% of canvas height, centered
  const targetH = Math.round(CANVAS_H * 0.78);
  const targetW = Math.round(CANVAS_W * 0.82);

  const resizedProduct = await sharp(productBuffer)
    .resize(targetW, targetH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .sharpen({ sigma: 1.0, m1: 0.5, m2: 0.5 })
    .toBuffer();

  const left = Math.round((CANVAS_W - targetW) / 2);
  const top = Math.round((CANVAS_H - targetH) / 2);

  const composited = await sharp(bgBuffer)
    .resize(CANVAS_W, CANVAS_H, { fit: "cover" })
    .composite([{ input: resizedProduct, top, left, blend: "over" }])
    .jpeg({ quality: 92 })
    .toBuffer();

  const path = `ad-studio/enhanced/${Date.now()}.jpg`;
  return uploadFileToStorage(composited, path, "image/jpeg");
}

// ── Replicate helper with 429 retry ──────────────────────────────────────────
async function replicateRun(model: string, input: Record<string, unknown>): Promise<unknown> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 12_000));
    try {
      return await replicate.run(model as `${string}/${string}`, { input });
    } catch (err: any) {
      lastError = err;
      const is429 = err?.response?.status === 429 || err?.message?.includes("429") || err?.message?.includes("Too Many Requests");
      if (!is429) throw err;
    }
  }
  throw lastError ?? new Error("Replicate failed after retries");
}

function extractUrl(output: unknown): string {
  if (typeof output === "string") return output;
  if (Array.isArray(output) && output[0]) {
    const item = output[0];
    if (typeof item === "string") return item;
    if (typeof (item as any).url === "function") return (item as any).url();
    return String(item);
  }
  if (output && typeof (output as any).url === "function") return (output as any).url();
  if (output && typeof (output as any).url === "string") return (output as any).url;
  return String(output);
}

// ── Run Ad Studio from an already-stored image URL (no buffer needed) ─────────
export async function runAdStudioFromUrl(
  imageUrl: string,
  brandId: string
): Promise<AdStudioResult> {
  const res = await fetch(imageUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  return runAdStudio(buffer, "image/jpeg", brandId);
}

// ── Combined: voice note + product image → single enhanced ad post ────────────
export async function runAdStudioWithVoice(
  audioBuffer: Buffer,
  imageUrl: string,
  brandId: string
): Promise<AdStudioResult> {
  const brand = await prisma.brand.findUniqueOrThrow({
    where: { id: brandId },
    select: { name: true, category: true, description: true, colors: true },
  });

  // Fetch signals for trend context
  const signals = await prisma.signal.findMany({
    where: { relevanceScore: { gte: 60 }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: { relevanceScore: "desc" },
    take: 3,
    select: { title: true, type: true },
  });
  const signalContext = signals.length > 0
    ? signals.map((s) => `${s.type}: ${s.title}`).join("; ")
    : "general Indian market trends";

  // Step 1: Transcribe voice note
  const transcription = await transcribeAudio(audioBuffer);
  const voiceText = transcription.text;

  // Step 2: Claude Vision + voice transcript together
  const imgRes = await fetch(imageUrl);
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
  const base64 = imgBuffer.toString("base64");

  const analysisResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
        {
          type: "text",
          text: `This is a product photo from "${brand.name}" (${brand.category}).
The owner described it in a voice note: "${voiceText}"
Current trends: ${signalContext}

Generate an ad for this product. Return JSON:
{
  "productName": "short product name from image + voice",
  "backgroundPrompt": "describe ONLY the ideal background/setting — e.g. 'warm wooden table soft bokeh' or 'clean white studio gradient subtle shadow'. Do NOT describe the product itself.",
  "headline": "punchy headline under 8 words",
  "bodyText": "2-3 engaging sentences using the voice note details and trends. Use 1-2 emojis.",
  "ctaText": "short CTA under 6 words",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"]
}`,
        },
      ],
    }],
  });

  const analysisText = analysisResponse.content[0].type === "text" ? analysisResponse.content[0].text : "{}";
  const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
  const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  const productName: string = analysis.productName ?? "Product";
  const backgroundPrompt: string = analysis.backgroundPrompt ?? "clean white studio backdrop, soft shadow, professional lighting";
  const headline: string = analysis.headline ?? `${productName} — Get Yours Now!`;
  const bodyText: string = analysis.bodyText ?? voiceText.slice(0, 200);
  const ctaText: string = analysis.ctaText ?? "Order Now";
  const hashtags: string[] = analysis.hashtags ?? [];

  // Step 3: Remove bg → pro background → composite (product unchanged)
  const enhancedImageUrl = await enhanceProductPhoto(imageUrl, backgroundPrompt);

  // Step 4: Save original to storage
  const originalPath = `ad-studio/${brandId}/${Date.now()}-original.jpg`;
  const originalImageUrl = await uploadFileToStorage(imgBuffer, originalPath, "image/jpeg");

  // Step 5: Create draft post
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
      aiReasoning: `Ad Studio (voice+image): "${voiceText.slice(0, 100)}". Trends: ${signalContext}`,
    },
  });

  return { postId: post.id, originalImageUrl, enhancedImageUrl, headline, bodyText, ctaText, hashtags, productName };
}
