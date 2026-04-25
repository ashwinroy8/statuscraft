import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDailyContent } from "@/lib/ai/content-generator";

// Called by cron-job.org (or Trigger.dev) daily for all brands
export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("authorization")?.replace("Bearer ", "") ??
    new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.TRIGGER_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const brandId = new URL(req.url).searchParams.get("brandId") ?? undefined;

  if (brandId) {
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

// Keep POST working for the dashboard "Generate Today's Posts" button
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.TRIGGER_SECRET_KEY}` && authHeader !== "Bearer local-dev-secret") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { brandId } = await req.json();
  if (brandId) {
    await generateDailyContent(brandId);
    return NextResponse.json({ success: true, brandId });
  }
  const brands = await prisma.brand.findMany({ where: { onboardingCompleted: true }, select: { id: true } });
  const results = await Promise.allSettled(brands.map((b: { id: string }) => generateDailyContent(b.id)));
  const succeeded = results.filter((r: PromiseSettledResult<void>) => r.status === "fulfilled").length;
  return NextResponse.json({ succeeded, total: brands.length });
}
