import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { uploadFileToStorage } from "@/lib/media/storage";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const images = formData.getAll("images") as File[];
  const brandId = formData.get("brandId") as string;

  if (!images.length || !brandId) {
    return NextResponse.json({ error: "Missing images or brandId" }, { status: 400 });
  }

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: user.id },
  });
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const uploadedUrls: string[] = [];

  for (const image of images.slice(0, 10)) {
    const bytes = await image.arrayBuffer();
    const path = `brand-images/${brandId}/${Date.now()}-${image.name}`;
    const url = await uploadFileToStorage(bytes, path, image.type);
    uploadedUrls.push(url);
  }

  await prisma.brand.update({
    where: { id: brandId },
    data: {
      brandImagesUrls: [
        ...(brand.brandImagesUrls ?? []),
        ...uploadedUrls,
      ],
    },
  });

  return NextResponse.json({ urls: uploadedUrls });
}
