import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPostAsStatus } from "@/lib/whatsapp/client";

// Runs every 5 minutes — checks for posts due to be sent
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.TRIGGER_SECRET_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  // Find scheduled posts whose time has passed
  const duePosts = await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { gte: fiveMinutesAgo, lte: now },
    },
    include: { brand: { include: { user: true } } },
  });

  const results = await Promise.allSettled(
    duePosts.map((post: { id: string }) => sendPostAsStatus(post.id))
  );

  const sent = results.filter((r: PromiseSettledResult<void>) => r.status === "fulfilled").length;
  const failed = results.filter((r: PromiseSettledResult<void>) => r.status === "rejected").length;

  // Mark failed posts
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      await prisma.post.update({
        where: { id: duePosts[i].id },
        data: { status: "FAILED" },
      });
    }
  }

  return NextResponse.json({ sent, failed, checked: duePosts.length });
}
