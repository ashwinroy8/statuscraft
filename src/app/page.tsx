import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Zap } from "lucide-react";

export default async function LandingPage() {
  // Redirect authenticated users with a brand straight to the dashboard
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const brand = await prisma.brand.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      if (!brand || !brand.onboardingCompleted) {
        redirect("/onboarding");
      }

      redirect("/dashboard");
    }
  } catch {
    // If auth check fails, fall through and show the landing page
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center">
            <Zap className="w-5 h-5 text-black fill-black" />
          </div>
          <span className="text-2xl font-bold">StatusCraft</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
          Beautiful WhatsApp Status posts.<br />
          <span className="text-[#25D366]">Automatically.</span>
        </h1>
        <p className="text-[#8b8b9a] text-lg mb-8 max-w-lg mx-auto">
          AI generates daily status posts for your business — product launches, festival greetings,
          offers, memes — in your brand&apos;s voice. You approve in one tap.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-bold px-8 py-4 rounded-2xl text-lg transition-colors"
        >
          <Zap className="w-5 h-5 fill-black" />
          Start free — first 3 posts in 60 seconds
        </Link>

        <p className="text-[#555562] text-sm mt-4">No credit card needed · Free forever plan available</p>

        {/* Social proof */}
        <div className="mt-16 grid grid-cols-3 gap-6 text-center">
          {[
            { value: "12,000+", label: "Businesses using StatusCraft" },
            { value: "4.2M+", label: "Posts generated" },
            { value: "1,000+", label: "Conversations/month on free plan" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-[#25D366]">{stat.value}</p>
              <p className="text-xs text-[#8b8b9a] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
