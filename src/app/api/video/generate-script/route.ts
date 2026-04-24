import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { description, style } = await req.json();

  const brand = await prisma.brand.findFirst({
    where: { userId: user.id, onboardingCompleted: true },
    orderBy: { createdAt: "desc" },
  });

  const brandInfo = brand
    ? `Brand: ${brand.name}, Category: ${brand.category ?? "business"}, Colors: ${JSON.stringify(brand.colors ?? {})}`
    : "Generic Indian small business";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: `You generate short punchy video scripts for Indian small businesses to post as WhatsApp Status videos. Return ONLY valid JSON, no markdown.`,
    messages: [
      {
        role: "user",
        content: `${brandInfo}
Style: ${style}
Description: ${description}

Generate a video script. Return JSON:
{
  "headline": "short punchy main text (max 4 words)",
  "subtext": "supporting text (max 8 words)",
  "cta": "call to action (max 6 words)",
  "tagline": "brand name or tagline",
  "words": ["word1", "word2", "word3", "word4", "word5"],
  "colors": { "bg1": "#hex", "bg2": "#hex", "text": "#ffffff", "accent": "#hex" }
}

For colors: make them vibrant and match the mood. Festival=saffron/orange, Product=brand colors or deep blue, Kinetic=dark with bright accent, Countdown=dark red/orange urgency, Slideshow=elegant dark.
words array = 5 key words from the description for kinetic animation.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: "AI failed" }, { status: 500 });

  return NextResponse.json(JSON.parse(match[0]));
}
