import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AnalyticsClient from "./analytics-client";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const brand = await prisma.brand.findFirst({
    where: { userId: user.id, onboardingCompleted: true },
    orderBy: { createdAt: "desc" },
  });
  if (!brand) redirect("/onboarding");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const posts = await prisma.post.findMany({
    where: { brandId: brand.id, createdAt: { gte: thirtyDaysAgo } },
    include: { analytics: true },
    orderBy: { createdAt: "asc" },
  });

  // Build time-series data
  const byDay: Record<string, { date: string; views: number; replies: number; posts: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().split("T")[0];
    byDay[key] = { date: key, views: 0, replies: 0, posts: 0 };
  }
  for (const post of posts) {
    const key = post.createdAt.toISOString().split("T")[0];
    if (byDay[key]) {
      byDay[key].posts++;
      byDay[key].views += post.analytics?.views ?? 0;
      byDay[key].replies += post.analytics?.replies ?? 0;
    }
  }

  // Type performance
  const typeStats: Record<string, { views: number; replies: number; count: number }> = {};
  for (const post of posts) {
    if (!typeStats[post.type]) typeStats[post.type] = { views: 0, replies: 0, count: 0 };
    typeStats[post.type].count++;
    typeStats[post.type].views += post.analytics?.views ?? 0;
    typeStats[post.type].replies += post.analytics?.replies ?? 0;
  }

  return (
    <AnalyticsClient
      brand={brand}
      timeSeries={Object.values(byDay)}
      typeStats={typeStats}
      posts={JSON.parse(JSON.stringify(posts))}
    />
  );
}
