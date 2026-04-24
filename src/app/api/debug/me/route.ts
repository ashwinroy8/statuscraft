import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not logged in" });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  const brands = await prisma.brand.findMany({ where: { userId: user.id } });
  const brandsByDbUserId = dbUser ? await prisma.brand.findMany({ where: { userId: dbUser.id } }) : [];

  return NextResponse.json({
    supabaseId: user.id,
    email: user.email,
    dbUser: dbUser ? { id: dbUser.id, email: dbUser.email } : null,
    idMatch: dbUser?.id === user.id,
    brandsBySupabaseId: brands.map(b => ({ id: b.id, name: b.name, onboardingCompleted: b.onboardingCompleted })),
    brandsByDbUserId: brandsByDbUserId.map(b => ({ id: b.id, name: b.name, onboardingCompleted: b.onboardingCompleted })),
  });
}
