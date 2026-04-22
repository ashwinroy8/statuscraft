import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { extractBrochureContent } from "@/lib/ai/brand-intelligence";
import { uploadFileToStorage } from "@/lib/media/storage";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const brandId = formData.get("brandId") as string;

  if (!file || !brandId) {
    return NextResponse.json({ error: "Missing file or brandId" }, { status: 400 });
  }

  // Verify brand ownership
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: user.id },
  });
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bytes = await file.arrayBuffer();
  const path = `brochures/${brandId}/${Date.now()}-${file.name}`;
  const fileUrl = await uploadFileToStorage(bytes, path, file.type);

  // For PDFs, extract text
  let extractedText = "";
  let extractedProducts: any[] = [];

  if (file.type === "application/pdf" || file.type.startsWith("text")) {
    const text = new TextDecoder().decode(bytes);
    const result = await extractBrochureContent(text);
    extractedText = result.extractedText;
    extractedProducts = result.products;
  }

  const brochure = await prisma.brochure.create({
    data: {
      brandId,
      fileName: file.name,
      fileUrl,
      fileType: file.type,
      extractedText: extractedText || null,
      extractedProducts: extractedProducts.length > 0 ? extractedProducts : undefined,
      processedAt: new Date(),
    },
  });

  return NextResponse.json({ brochure });
}
