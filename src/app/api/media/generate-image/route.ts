import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generatePostImage } from "@/lib/media/image-generator";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await req.json();
  if (!postId) return NextResponse.json({ error: "Missing postId" }, { status: 400 });

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { brand: true },
  });

  if (!post || post.brand.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const imageUrl = await generatePostImage({
    postId,
    visualDirection: post.aiReasoning ?? "Professional business image",
    textOverlay: {
      headline: post.headline ?? "",
      subtext: post.bodyText ?? "",
      cta: post.ctaText ?? "",
    },
    brandColors: (post.brand.colors as any) ?? {},
    postType: post.type,
    tonality: post.tonality,
  });

  return NextResponse.json({ imageUrl });
}
