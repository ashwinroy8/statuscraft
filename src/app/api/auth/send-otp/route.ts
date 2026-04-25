import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendText } from "@/lib/whatsapp/client";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s+\-()]/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export async function POST(req: NextRequest) {
  const { phone: rawPhone } = await req.json();
  if (!rawPhone) return NextResponse.json({ error: "Phone required" }, { status: 400 });

  const phone = normalizePhone(String(rawPhone));

  const user = await prisma.user.findFirst({ where: { phone } });
  if (!user) {
    return NextResponse.json(
      { error: "No account found for this number. Message us on WhatsApp to sign up for free! 👋" },
      { status: 404 }
    );
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpCode.upsert({
    where: { phone },
    create: { phone, code, expiresAt },
    update: { code, expiresAt },
  });

  await sendText(
    phone,
    `Your StatusCraft login code is:\n\n*${code}*\n\nThis code expires in 10 minutes. Do not share it with anyone.`
  );

  return NextResponse.json({ ok: true });
}
