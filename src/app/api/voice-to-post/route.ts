import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { processVoiceNote } from "@/lib/voice/voice-to-post";

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audioFile = formData.get("audio");
  const brandId = formData.get("brandId");

  if (!audioFile || !(audioFile instanceof File)) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }
  if (!brandId || typeof brandId !== "string") {
    return NextResponse.json({ error: "brandId is required" }, { status: 400 });
  }

  // Verify brand belongs to this user
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: user.id },
    select: { id: true },
  });
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  try {
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await processVoiceNote(buffer, brandId, audioFile.name);
    return NextResponse.json(result);
  } catch (err) {
    console.error("voice-to-post error:", err);
    const message = err instanceof Error ? err.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
