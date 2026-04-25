import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminClient } from "@/lib/supabase/admin";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s+\-()]/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export async function POST(req: NextRequest) {
  const { phone: rawPhone, code } = await req.json();
  if (!rawPhone || !code) {
    return NextResponse.json({ error: "Phone and code required" }, { status: 400 });
  }

  const phone = normalizePhone(String(rawPhone));

  const otpRecord = await prisma.otpCode.findUnique({ where: { phone } });

  if (!otpRecord) {
    return NextResponse.json({ error: "No OTP found. Please request a new code." }, { status: 400 });
  }

  if (otpRecord.expiresAt < new Date()) {
    await prisma.otpCode.delete({ where: { phone } }).catch(() => {});
    return NextResponse.json({ error: "Code expired. Please request a new one." }, { status: 400 });
  }

  if (otpRecord.code !== String(code).trim()) {
    return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
  }

  // OTP valid — delete it immediately (single use)
  await prisma.otpCode.delete({ where: { phone } }).catch(() => {});

  const user = await prisma.user.findFirst({ where: { phone } });
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  // Generate a Supabase magic link for this user so they get a proper session
  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://statuscraft.in";
  const adminClient = getAdminClient();

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data?.properties?.action_link) {
    console.error("[verify-otp] generateLink error:", error);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ redirectUrl: data.properties.action_link });
}
