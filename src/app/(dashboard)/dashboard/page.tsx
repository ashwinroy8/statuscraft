import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get or create user record in our DB
  let dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name,
        avatarUrl: user.user_metadata?.avatar_url,
      },
    });
  }

  // Get brands — only completed ones
  const brands = await prisma.brand.findMany({
    where: { userId: user.id, onboardingCompleted: true },
    orderBy: { createdAt: "desc" },
  });

  if (brands.length === 0) {
    redirect("/onboarding");
  }

  const brand = brands[0];

  // Today's posts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayPosts = await prisma.post.findMany({
    where: {
      brandId: brand.id,
      OR: [
        { scheduledAt: { gte: today, lt: tomorrow } },
        { status: "DRAFT", createdAt: { gte: today } },
      ],
    },
    include: { analytics: true, signal: true },
    orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
  });

  // 30-day stats
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [totalPosts, sentPosts, analytics] = await Promise.all([
    prisma.post.count({ where: { brandId: brand.id, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.post.count({ where: { brandId: brand.id, status: "SENT", createdAt: { gte: thirtyDaysAgo } } }),
    prisma.postAnalytics.aggregate({
      where: { post: { brandId: brand.id, createdAt: { gte: thirtyDaysAgo } } },
      _sum: { views: true, replies: true },
      _avg: { engagementRate: true },
    }),
  ]);

  // Active signals
  const signals = await prisma.signal.findMany({
    where: {
      relevanceScore: { gte: 60 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { relevanceScore: "desc" },
    take: 5,
  });

  return (
    <DashboardClient
      brand={brand}
      todayPosts={JSON.parse(JSON.stringify(todayPosts))}
      stats={{
        totalPosts,
        sentPosts,
        totalViews: analytics._sum.views ?? 0,
        totalReplies: analytics._sum.replies ?? 0,
        avgEngagement: analytics._avg.engagementRate ?? 0,
      }}
      signals={JSON.parse(JSON.stringify(signals))}
    />
  );
}
