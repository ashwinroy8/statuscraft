import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Root route — redirect to dashboard or login
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let brand;
  try {
    brand = await prisma.brand.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("DB error on root page:", err);
    throw err;
  }

  if (!brand || !brand.onboardingCompleted) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
