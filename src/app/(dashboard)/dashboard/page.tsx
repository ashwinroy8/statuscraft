import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardClient from "../dashboard-client";
import { format } from "date-fns";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Ensure user exists in DB
  await prisma.user.upsert({
    where: { email: user.email! },
    create: {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
    },
    update: {
      name: user.user_metadata?.full_name ?? undefined,
      avatarUrl: user.user_metadata?.avatar_url ?? undefined,
    },
  });

  const brand = await prisma.brand.findFirst({
    where: { userId: user.id, onboardingCompleted: true },
    orderBy: { createdAt: "desc" },
  });
  if (!brand) redirect("/onboarding");

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
