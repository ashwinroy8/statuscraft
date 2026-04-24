import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not logged in" });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  const brands = await prisma.brand.findMany({ where: { userId: user.id } });

  // Fix WhatsApp settings — update phoneNumberId from current env var
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
  let settings = await prisma.settings.findUnique({ where: { userId: user.id } });

  if (settings && phoneNumberId && settings.whatsappBusinessPhoneId !== phoneNumberId) {
    settings = await prisma.settings.update({
      where: { userId: user.id },
      data: {
        whatsappBusinessPhoneId: phoneNumberId,
        whatsappConnected: true,
      },
    });
  }

  return NextResponse.json({
    supabaseId: user.id,
    email: user.email,
    dbUser: dbUser ? { id: dbUser.id, email: dbUser.email, phone: dbUser.phone } : null,
    idMatch: dbUser?.id === user.id,
    brands: brands.map(b => ({ id: b.id, name: b.name, onboardingCompleted: b.onboardingCompleted })),
    whatsapp: {
      connected: settings?.whatsappConnected,
      ownerPhone: settings?.whatsappOwnerPhone,
      businessPhoneId: settings?.whatsappBusinessPhoneId,
      envPhoneId: phoneNumberId,
      fixed: settings?.whatsappBusinessPhoneId === phoneNumberId,
    },
  });
}
