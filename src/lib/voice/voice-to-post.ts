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
  }>;
}

export async function processVoiceNote(
  audioBuffer: Buffer,
  brandId: string,
  originalFilename?: string
): Promise<VoicePostResult> {
  const brand = await prisma.brand.findUniqueOrThrow({ where: { id: brandId } });

  // Step 1 — Transcribe
  const transcription = await transcribeAudio(audioBuffer, originalFilename);

  // Step 2 — Extract intent + generate 3 variants in one Claude call
  const userPrompt = `Voice note from ${brand.name} (${brand.category ?? "business"} owner):
"${transcription.text}"

Detected language: ${transcription.language}${transcription.isHinglish ? " (Hinglish)" : ""}
Brand voice: ${JSON.stringify(brand.voicePersonality ?? {})}
Brand colors: ${JSON.stringify(brand.colors ?? {})}

Write 3 post variants. Match the language/tone of the transcription — if they spoke in Hindi, write Hindi copy; if Hinglish, write Hinglish.`;

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

  // Step 3 — Create post records and kick off image gen in parallel
  const createdPosts: VoicePostResult["posts"] = [];

  await Promise.all(
    postsData.slice(0, 3).map(async (postData) => {
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

      // Fire-and-forget image generation
      generatePostImage({
        postId: post.id,
        visualDirection: postData.visualDirection,
        textOverlay: postData.textOverlay,
        brandColors: (brand.colors as any) ?? {},
        postType: "PRODUCT",
        tonality: "WITTY",
      }).catch((e) => console.error(`Voice post image failed ${post.id}:`, e));

      createdPosts.push({
        id: post.id,
        headline: postData.headline,
        bodyText: postData.bodyText,
        ctaText: postData.ctaText,
        style: postData.style,
      });
    })
  );

  return {
    transcription: transcription.text,
    language: transcription.language,
    posts: createdPosts,
  };
}
