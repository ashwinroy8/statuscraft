/**
 * Signup OTP — sends a code to any phone number (new users welcome).
 * Unlike /api/auth/send-otp which requires an existing account.
 */
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendText } from "@/lib/whatsapp/client";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s+\-()]/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export async function POST(req: NextRequest) {
  try {
    const { phone: rawPhone } = await req.json();
    if (!rawPhone) return NextResponse.json({ error: "Phone required" }, { status: 400 });

    const phone = normalizePhone(String(rawPhone));
    if (phone.length < 10) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpCode.upsert({
      where: { phone },
      create: { phone, code, expiresAt },
      update: { code, expiresAt },
    });

    await sendText(
      phone,
      `Welcome to StatusCraft! 🚀\n\nYour verification code:\n\n*${code}*\n\nExpires in 10 minutes. Don't share this with anyone.`
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[signup/send-otp]", err);
    return NextResponse.json({ error: "Failed to send code. Please try again." }, { status: 500 });
  }
}
