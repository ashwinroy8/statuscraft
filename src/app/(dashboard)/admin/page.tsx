import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import AdminClient from "./admin-client";

const ADMIN_EMAIL = "ashwin@mobcast.in";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  // Fetch all users with their brands and post counts
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      brands: {
        include: {
          _count: {
            select: { posts: true },
          },
          posts: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              title: true,
              type: true,
              status: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  // Total posts count
  const totalPosts = await prisma.post.count();

  // Posts this week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const postsThisWeek = await prisma.post.count({
    where: { createdAt: { gte: weekAgo } },
  });

  // Total brands
  const totalBrands = await prisma.brand.count();

  const stats = {
    totalUsers: users.length,
    totalBrands,
    totalPosts,
    postsThisWeek,
  };

  return (
    <AdminClient
      users={JSON.parse(JSON.stringify(users))}
      stats={stats}
    />
  );
}
