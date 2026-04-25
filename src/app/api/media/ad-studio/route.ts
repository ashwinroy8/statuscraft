import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { runAdStudio } from "@/lib/media/ad-studio";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const brand = await prisma.brand.findFirst({
    where: { userId: user.id, onboardingCompleted: true },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!brand) return NextResponse.json({ error: "No brand found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files supported" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await runAdStudio(buffer, file.type, brand.id);
  return NextResponse.json(result);
}
