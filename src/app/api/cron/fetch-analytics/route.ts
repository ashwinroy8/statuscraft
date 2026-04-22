import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Simulate analytics fetching (in production, pull from WhatsApp Business API)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.TRIGGER_SECRET_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get sent posts without fresh analytics data (fetched > 6h ago or never)
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const sentPosts = await prisma.post.findMany({
    where: {
      status: "SENT",
      sentAt: { not: null },
      OR: [
        { analytics: null },
        { analytics: { fetchedAt: { lt: sixHoursAgo } } },
      ],
    },
    take: 50,
  });

  // In production: call WhatsApp Business API for each post's media stats
  // For now, create placeholder analytics
  let updated = 0;
  for (const post of sentPosts) {
    await prisma.postAnalytics.upsert({
      where: { postId: post.id },
      create: {
        postId: post.id,
        views: 0,
        replies: 0,
        engagementRate: 0,
        fetchedAt: new Date(),
      },
      update: { fetchedAt: new Date() },
    });
    updated++;
  }

  return NextResponse.json({ updated });
}
