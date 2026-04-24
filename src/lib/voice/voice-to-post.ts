import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { transcribeAudio } from "./transcription";
import { generatePostImage } from "@/lib/media/image-generator";

const anthropic = new Anthropic();

const VOICE_INTENT_SYSTEM = `You are an expert at understanding Indian small business owners describing their products and offers in casual spoken language — Hindi, Hinglish, Tamil, Marathi, or English.

Extract the intent from their voice note and generate 3 different WhatsApp Status post variants.

OUTPUT FORMAT (valid JSON only, no markdown):
{
  "intent": {
    "type": "PRODUCT_LAUNCH | OFFER | ANNOUNCEMENT | FESTIVAL | GENERAL",
    "productName": "...",
    "price": null,
    "discount": null,
    "timing": "today | this week | limited | ongoing",
    "mood": "exciting | casual | premium | urgent"
  },
  "posts": [
    {
      "style": "Bold and attention-grabbing",
      "headline": "...",
      "bodyText": "...",
      "ctaText": "...",
      "visualDirection": "Detailed image scene for AI generator — NO TEXT in image",
      "textOverlay": { "headline": "...", "subtext": "...", "cta": "..." }
    },
    {
      "style": "Elegant and premium",
      "headline": "...",
      "bodyText": "...",
      "ctaText": "...",
      "visualDirection": "...",
      "textOverlay": { "headline": "...", "subtext": "...", "cta": "..." }
    },
    {
      "style": "Fun and casual",
      "headline": "...",
      "bodyText": "...",
      "ctaText": "...",
      "visualDirection": "...",
      "textOverlay": { "headline": "...", "subtext": "...", "cta": "..." }
    }
  ]
}`;

export interface VoicePostResult {
  transcription: string;
  language: string;
  posts: Array<{
    id: string;
    headline: string;
    bodyText: string;
    ctaText: string;
    style: string;
    imageUrl?: string;
  }>;
}

export interface VoicePostCallbacks {
  // Called each time an image is ready — use to send it to WhatsApp
  onImageReady?: (postIndex: number, imageUrl: string, post: {
    headline: string;
    bodyText: string;
    ctaText: string;
    style: string;
  }) => Promise<void>;
  // Called when all images are done
  onAllDone?: (postIds: string[]) => Promise<void>;
}

export async function processVoiceNote(
  audioBuffer: Buffer,
  brandId: string,
  originalFilename?: string,
  callbacks?: VoicePostCallbacks
): Promise<VoicePostResult> {
  const brand = await prisma.brand.findUniqueOrThrow({ where: { id: brandId } });

  // Step 1 — Transcribe
  const transcription = await transcribeAudio(audioBuffer, originalFilename);

  // Step 2 — Extract intent + generate 3 variants
  const userPrompt = `Voice note from ${brand.name} (${brand.category ?? "business"} owner):
"${transcription.text}"

Detected language: ${transcription.language}${transcription.isHinglish ? " (Hinglish)" : ""}
Brand voice: ${JSON.stringify(brand.voicePersonality ?? {})}
Brand colors: ${JSON.stringify(brand.colors ?? {})}

Write 3 post variants. Match the language/tone of the transcription.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: VOICE_INTENT_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const aiText = response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonMatch = aiText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI failed to generate posts");

  const result = JSON.parse(jsonMatch[0]);
  const postsData: any[] = result.posts ?? [];

  // Step 3 — Create post records
  const createdPosts: VoicePostResult["posts"] = [];
  const postRecords: Array<{ id: string; index: number; postData: any }> = [];

  for (let i = 0; i < Math.min(postsData.length, 3); i++) {
    const postData = postsData[i];
    const post = await prisma.post.create({
      data: {
        brandId,
        type: "PRODUCT",
        tonality: "WITTY",
        headline: postData.headline,
        bodyText: postData.bodyText,
        ctaText: postData.ctaText,
        aiReasoning: `Voice-to-Post: "${transcription.text.slice(0, 100)}"`,
        scheduledAt: new Date(),
        status: "DRAFT",
        metadata: {
          source: "voice",
          style: postData.style,
          transcription: transcription.text.slice(0, 300),
        },
      },
    });
    createdPosts.push({
      id: post.id,
      headline: postData.headline,
      bodyText: postData.bodyText,
      ctaText: postData.ctaText,
      style: postData.style,
    });
    postRecords.push({ id: post.id, index: i, postData });
  }

  // Step 4 — Generate images in parallel; fire callbacks as each finishes
  await Promise.all(
    postRecords.map(async ({ id: postId, index, postData }) => {
      try {
        const imageUrl = await generatePostImage({
          postId,
          visualDirection: postData.visualDirection,
          textOverlay: postData.textOverlay,
          brandColors: (brand.colors as any) ?? {},
          postType: "PRODUCT",
          tonality: "WITTY",
        });

        // Update the result with the image URL
        const entry = createdPosts.find((p) => p.id === postId);
        if (entry) entry.imageUrl = imageUrl;

        // Notify caller (e.g. send to WhatsApp) — no WhatsApp import needed here
        if (callbacks?.onImageReady && imageUrl) {
          await callbacks.onImageReady(index, imageUrl, {
            headline: postData.headline,
            bodyText: postData.bodyText,
            ctaText: postData.ctaText,
            style: postData.style,
          }).catch((e) => console.error(`onImageReady callback failed for post ${index}:`, e));
        }
      } catch (e) {
        console.error(`Voice post image failed for post ${postId}:`, e);
      }
    })
  );

  // Step 5 — All done callback
  if (callbacks?.onAllDone) {
    await callbacks.onAllDone(createdPosts.map((p) => p.id)).catch((e) =>
      console.error("onAllDone callback failed:", e)
    );
  }

  return {
    transcription: transcription.text,
    language: transcription.language,
    posts: createdPosts,
  };
}
