import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import FestivalsClient from "./festivals-client";

export default async function FestivalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const brand = await prisma.brand.findFirst({
    where: { userId: user.id, onboardingCompleted: true },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!brand) redirect("/onboarding");

  return <FestivalsClient brandId={brand.id} />;
}
