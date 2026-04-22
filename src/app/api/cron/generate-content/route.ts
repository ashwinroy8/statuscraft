import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDailyContent } from "@/lib/ai/content-generator";

// This route is called by Trigger.dev daily at 4 AM for each user's timezone
export async function POST(req: NextRequest) {
  // Verify the request comes from Trigger.dev or internal cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.TRIGGER_SECRET_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { brandId } = await req.json();

  if (brandId) {
    // Generate for a specific brand
    await generateDailyContent(brandId);
    return NextResponse.json({ success: true, brandId });
  }

  // Generate for all active brands
  const brands = await prisma.brand.findMany({
    where: { onboardingCompleted: true },
    select: { id: true },
  });

  const results = await Promise.allSettled(
    brands.map((b: { id: string }) => generateDailyContent(b.id))
  );

  const succeeded = results.filter((r: PromiseSettledResult<void>) => r.status === "fulfilled").length;
  const failed = results.filter((r: PromiseSettledResult<void>) => r.status === "rejected").length;

  return NextResponse.json({ succeeded, failed, total: brands.length });
}
