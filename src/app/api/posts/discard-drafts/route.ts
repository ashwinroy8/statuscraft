import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { brandId, dateStr } = await req.json();
  if (!brandId) return NextResponse.json({ error: "brandId required" }, { status: 400 });

  // Verify ownership
  const brand = await prisma.brand.findFirst({ where: { id: brandId, userId: user.id } });
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  // Date range for the given date (defaults to today)
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  d.setHours(0, 0, 0, 0);
  const nextDay = new Date(d);
  nextDay.setDate(d.getDate() + 1);

  const deleted = await prisma.post.deleteMany({
    where: {
      brandId,
      status: "DRAFT",
      createdAt: { gte: d, lt: nextDay },
    },
  });

  return NextResponse.json({ deleted: deleted.count });
}
