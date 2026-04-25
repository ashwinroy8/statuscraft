import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format as fmtDate, isToday, isYesterday } from "date-fns";
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

  // Last 7 days of posts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);

  const recentPosts = await prisma.post.findMany({
    where: {
      brandId: brand.id,
      createdAt: { gte: sevenDaysAgo },
    },
    include: { analytics: true, signal: true },
    orderBy: [{ createdAt: "desc" }, { scheduledAt: "asc" }],
  });

  // Group posts by date label
  const grouped: Record<string, any[]> = {};
  for (const post of recentPosts) {
    const d = new Date(post.createdAt);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().split("T")[0];
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(post);
  }

  const postsByDay = Object.entries(grouped)
    .sort(([a], [b]) => (a > b ? -1 : 1))
    .map(([dateStr, posts]) => {
      const d = new Date(dateStr + "T00:00:00");
      let label: string;
      if (isToday(d)) label = "Today";
      else if (isYesterday(d)) label = "Yesterday";
      else label = fmtDate(d, "EEEE, MMM d");
      return { dateStr, label, posts };
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
      postsByDay={JSON.parse(JSON.stringify(postsByDay))}
      todayDateStr={today.toISOString().split("T")[0]}
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
