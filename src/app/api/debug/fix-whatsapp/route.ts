import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// One-time fix: update Settings with correct phoneNumberId and owner phone
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" });

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";

  const updated = await prisma.settings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      whatsappConnected: true,
      whatsappBusinessPhoneId: phoneNumberId,
    },
    update: {
      whatsappConnected: true,
      whatsappBusinessPhoneId: phoneNumberId,
    },
  });

  return NextResponse.json({
    ok: true,
    phoneNumberId,
    whatsappOwnerPhone: updated.whatsappOwnerPhone,
    whatsappConnected: updated.whatsappConnected,
    whatsappBusinessPhoneId: updated.whatsappBusinessPhoneId,
    message: "Settings fixed. Now send 'hi' to the bot — it will auto-save your number on first message.",
  });
}
