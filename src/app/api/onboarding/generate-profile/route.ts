import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateBrandProfile } from "@/lib/ai/brand-intelligence";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { brandId } = await req.json();
  if (!brandId) {
    return NextResponse.json({ error: "Missing brandId" }, { status: 400 });
  }

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: user.id },
  });
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const profile = await generateBrandProfile(brandId);
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("generate-profile error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
