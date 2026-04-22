import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { scrapeAndExtractWebsite } from "@/lib/ai/brand-intelligence";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { brandId, url } = await req.json();
  if (!brandId || !url) {
    return NextResponse.json({ error: "Missing brandId or url" }, { status: 400 });
  }

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: user.id },
  });
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { text, brandInfo } = await scrapeAndExtractWebsite(url);

  await prisma.brand.update({
    where: { id: brandId },
    data: {
      websiteUrl: url,
      description: brandInfo.description || brand.description,
      tagline: brandInfo.tagline || brand.tagline,
    },
  });

  return NextResponse.json({ success: true, extractedText: text.slice(0, 500) });
}
