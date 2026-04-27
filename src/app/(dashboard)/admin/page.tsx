import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import AdminClient from "./admin-client";

const ADMIN_EMAIL = "ashwin@mobcast.in";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/dashboard");

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      brands: {
        include: {
          _count: { select: { posts: true } },
          posts: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: { id: true, headline: true, type: true, status: true, createdAt: true },
          },
        },
      },
    },
  });

  // ── Post counts ────────────────────────────────────────────────────────────
  const totalPosts = await prisma.post.count();
  const weekAgo    = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const postsThisWeek = await prisma.post.count({ where: { createdAt: { gte: weekAgo } } });
  const totalBrands   = await prisma.brand.count();

  // ── Visitor stats ──────────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalVisitors,
    todayVisitors,
    totalConverted,
    recentVisitors,
    bySource,
    byCountry,
  ] = await Promise.all([
    prisma.visitor.count(),
    prisma.visitor.count({ where: { createdAt: { gte: today } } }),
    prisma.visitor.count({ where: { converted: true } }),
    prisma.visitor.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, createdAt: true, source: true, country: true, city: true, device: true, converted: true, utmCampaign: true },
    }),
    prisma.visitor.groupBy({
      by: ["source"],
      _count: { source: true },
      where: { createdAt: { gte: monthAgo } },
      orderBy: { _count: { source: "desc" } },
      take: 8,
    }),
    prisma.visitor.groupBy({
      by: ["country"],
      _count: { country: true },
      where: { createdAt: { gte: monthAgo }, country: { not: null } },
      orderBy: { _count: { country: "desc" } },
      take: 8,
    }),
  ]);

  const stats = {
    totalUsers: users.length,
    totalBrands,
    totalPosts,
    postsThisWeek,
  };

  const visitorStats = {
    total: totalVisitors,
    today: todayVisitors,
    converted: totalConverted,
    conversionRate: totalVisitors > 0 ? Math.round((totalConverted / totalVisitors) * 100) : 0,
    bySource: bySource.map(r => ({ source: r.source, count: r._count.source })),
    byCountry: byCountry.map(r => ({ country: r.country ?? "Unknown", count: r._count.country })),
    recent: recentVisitors,
  };

  return (
    <AdminClient
      users={JSON.parse(JSON.stringify(users))}
      stats={stats}
      visitorStats={JSON.parse(JSON.stringify(visitorStats))}
    />
  );
}
