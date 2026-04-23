import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { uploadFileToStorage } from "@/lib/media/storage";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("logo") as File;
  const brandId = formData.get("brandId") as string;

  if (!file || !brandId) return NextResponse.json({ error: "Missing" }, { status: 400 });

  const brand = await prisma.brand.findFirst({ where: { id: brandId, userId: user.id } });
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ext = file.name.split(".").pop() ?? "png";
  const bytes = await file.arrayBuffer();
  const url = await uploadFileToStorage(bytes, `logos/${brandId}/logo.${ext}`, file.type);

  await prisma.brand.update({ where: { id: brandId }, data: { logoUrl: url } });

  return NextResponse.json({ url });
}
