import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import BrandClient from "./brand-client";

export default async function BrandPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const brand = await prisma.brand.findFirst({
    where: { userId: user.id },
    include: { brochures: true },
    orderBy: { createdAt: "desc" },
  });

  if (!brand) redirect("/onboarding");

  return <BrandClient brand={JSON.parse(JSON.stringify(brand))} />;
}
