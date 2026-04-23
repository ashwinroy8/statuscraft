import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateFestivalPostsForBrand } from "@/lib/ai/festival-generator";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.TRIGGER_SECRET_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { brandId } = await req.json().catch(() => ({}));

  if (brandId) {
    await generateFestivalPostsForBrand(brandId);
    return NextResponse.json({ success: true });
  }

  const brands = await prisma.brand.findMany({
    where: { onboardingCompleted: true },
    select: { id: true },
  });

  const results = await Promise.allSettled(
    brands.map((b: { id: string }) => generateFestivalPostsForBrand(b.id))
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ succeeded, total: brands.length });
}
