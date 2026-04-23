import Replicate from "replicate";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import {
  IMAGE_DIRECTOR_SYSTEM,
  buildImageDirectorPrompt,
} from "@/lib/ai/prompts/image-director";
import { uploadToStorage } from "./storage";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const anthropic = new Anthropic();

export interface TextOverlay {
  headline: string;
  subtext: string;
  cta: string;
}

interface ImageGenerationParams {
  postId: string;
  visualDirection: string;
  textOverlay: TextOverlay;
  brandColors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
  };
  postType: string;
  tonality: string;
  size?: "9:16" | "1:1";
}

export async function generatePostImage(
  params: ImageGenerationParams
): Promise<string> {
  const { postId, visualDirection, textOverlay, brandColors, postType, tonality, size = "9:16" } = params;

  // Step 1: Optimize the visual prompt with Claude
  const directorPrompt = buildImageDirectorPrompt({
    visualDirection,
    brandColors,
    postType,
    tonality,
  });

  const directorResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: IMAGE_DIRECTOR_SYSTEM,
    messages: [{ role: "user", content: directorPrompt }],
  });

  const directorText =
    directorResponse.content[0].type === "text"
      ? directorResponse.content[0].text
      : "{}";

  let fluxPrompt = visualDirection;
  let negativePrompt =
    "text, words, letters, numbers, watermark, logo, signature, blurry, low quality";

  try {
    const jsonMatch = directorText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      fluxPrompt = parsed.fluxPrompt ?? visualDirection;
      negativePrompt = parsed.negativePrompt ?? negativePrompt;
    }
  } catch {
    // Use original direction as fallback
  }

  // Determine if this is text-heavy (use Ideogram) or image-focused (use Flux)
  const isTextHeavy = ["QUIZ", "POLL", "MEME"].includes(postType);

  let imageUrl: string;

  if (isTextHeavy && process.env.IDEOGRAM_API_KEY) {
    // Use Ideogram for text-in-image posts
    imageUrl = await generateWithIdeogram({
      prompt: `${fluxPrompt}. Text overlay: "${textOverlay.headline}" in large bold font. "${textOverlay.subtext}". "${textOverlay.cta}" as CTA button.`,
      brandColors,
    });
  } else {
    // Use Flux Schnell for background generation
    imageUrl = await generateWithFlux({
      prompt: fluxPrompt,
      negativePrompt,
      aspectRatio: size,
    });

    // Text overlay is handled via CSS in the frontend
  }

  let storedUrl = typeof imageUrl === "string" ? imageUrl : String(imageUrl);

  // Only re-upload to Supabase if it's a Replicate URL (Cloudinary URLs are already CDN-hosted)
  if (storedUrl && !storedUrl.includes("cloudinary.com")) {
    storedUrl = await uploadToStorage(storedUrl, `posts/${postId}/status.jpg`);
  }

  // Watermark is applied client-side in preview-client.tsx (canvas download)
  // and as a CSS overlay in the phone mockup. Server-side watermarking
  // via Sharp would be needed for plan-based removal (future: PRO plan).

  // Update post record
  await prisma.post.update({
    where: { id: postId },
    data: { imageUrl: storedUrl },
  });

  return storedUrl;
}

async function generateWithFlux({
  prompt,
  negativePrompt,
  aspectRatio,
}: {
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;
}): Promise<string> {
  const width = aspectRatio === "9:16" ? 1080 : 1080;
  const height = aspectRatio === "9:16" ? 1920 : 1080;

  const output = await replicate.run("black-forest-labs/flux-schnell", {
    input: {
      prompt: `${prompt}, high quality, professional photography, vibrant colors, sharp focus`,
      width,
      height,
      num_inference_steps: 4,
      output_format: "jpg",
      output_quality: 90,
    },
  });

  // Replicate returns various formats depending on SDK version
  if (typeof output === "string") return output;
  if (Array.isArray(output) && output.length > 0) {
    const item = output[0];
    if (typeof item === "string") return item;
    if (item && typeof (item as any).url === "function") return await (item as any).url();
    if (item && typeof (item as any).url === "string") return (item as any).url;
    return String(item);
  }
  if (output && typeof (output as any).url === "function") return await (output as any).url();
  if (output && typeof (output as any).url === "string") return (output as any).url;
  throw new Error("Flux returned unexpected output format: " + typeof output);
}

async function generateWithIdeogram({
  prompt,
  brandColors,
}: {
  prompt: string;
  brandColors: any;
}): Promise<string> {
  const res = await fetch("https://api.ideogram.ai/generate", {
    method: "POST",
    headers: {
      "Api-Key": process.env.IDEOGRAM_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_request: {
        prompt,
        aspect_ratio: "ASPECT_9_16",
        model: "V_2",
        magic_prompt_option: "AUTO",
      },
    }),
  });

  const data = await res.json();
  return data.data?.[0]?.url ?? "";
}

async function applyCloudinaryTextOverlay({
  imageUrl,
  textOverlay,
  brandColors,
}: {
  imageUrl: string;
  textOverlay: TextOverlay;
  brandColors: any;
}): Promise<string> {
  // Cloudinary transformation URL construction
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const primaryColor = (brandColors.primary ?? "#FFFFFF").replace("#", "");
  const bgColor = "000000";

  // Truncate texts to avoid Cloudinary URL length limits
  const headline = textOverlay.headline.slice(0, 60);
  const subtext = textOverlay.subtext.slice(0, 80);
  const cta = textOverlay.cta.slice(0, 40);

  // Build transformation string
  const transforms = [
    // Dark gradient overlay for readability
    `e_gradient_fade:30,y_-0.5`,
    // Headline text
    `l_text:Outfit_60_bold:${encodeURIComponent(headline)},co_rgb:${primaryColor},g_north,y_120,w_900`,
    // Subtext
    `l_text:Outfit_32:${encodeURIComponent(subtext)},co_white,g_north,y_230,w_900`,
    // CTA
    `l_text:Outfit_30_bold:${encodeURIComponent(cta)},co_rgb:${bgColor},g_south,y_120`,
  ].join("/");

  // Upload original image to Cloudinary first, then apply transforms
  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: imageUrl,
        upload_preset: "statuscraft",
      }),
    }
  );

  const uploadData = await uploadRes.json();
  console.log("Cloudinary upload response:", JSON.stringify(uploadData).slice(0, 300));
  const publicId = uploadData.public_id;
  if (!publicId) throw new Error(`Cloudinary upload failed: ${JSON.stringify(uploadData).slice(0, 200)}`);

  const finalUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}.jpg`;
  console.log("Cloudinary final URL:", finalUrl);
  return finalUrl;
}

export async function uploadToStorageDirect(
  url: string,
  path: string
): Promise<string> {
  return uploadToStorage(url, path);
}
