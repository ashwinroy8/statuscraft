import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deliverDailyPostsToOwner } from "@/lib/whatsapp/daily-delivery";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.TRIGGER_SECRET_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { brandId } = await req.json().catch(() => ({}));

  if (brandId) {
    await deliverDailyPostsToOwner(brandId);
    return NextResponse.json({ success: true, brandId });
  }

  // Deliver to all connected brands
  const brands = await prisma.brand.findMany({
    where: { onboardingCompleted: true },
    include: {
      user: { select: { phone: true } },
    },
  });

  const settingsList = await prisma.settings.findMany({
    where: { userId: { in: brands.map(b => b.userId) } },
    select: { userId: true, whatsappConnected: true },
  });

  const connectedUserIds = new Set(
    settingsList.filter(s => s.whatsappConnected).map(s => s.userId)
  );

  const connected = brands.filter(b => b.user.phone && connectedUserIds.has(b.userId));

  const results = await Promise.allSettled(connected.map(b => deliverDailyPostsToOwner(b.id)));
  const succeeded = results.filter(r => r.status === "fulfilled").length;

  return NextResponse.json({ succeeded, total: connected.length });
}
