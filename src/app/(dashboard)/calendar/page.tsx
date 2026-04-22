import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CalendarClient from "./calendar-client";
import { startOfMonth, endOfMonth } from "date-fns";

export default async function CalendarPage() {
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

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const posts = await prisma.post.findMany({
    where: {
      brandId: brand.id,
      scheduledAt: { gte: monthStart, lte: monthEnd },
    },
    include: { analytics: true },
    orderBy: { scheduledAt: "asc" },
  });

  return (
    <CalendarClient
      brand={brand}
      posts={JSON.parse(JSON.stringify(posts))}
    />
  );
}
