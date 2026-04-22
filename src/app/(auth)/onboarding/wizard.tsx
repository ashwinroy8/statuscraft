"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import {
  Store,
  Globe,
  FileText,
  Image,
  Brain,
  Clock,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Upload,
  Zap,
} from "lucide-react";

const STEPS = [
  { id: 1, icon: Store, label: "Business" },
  { id: 2, icon: FileText, label: "Brochure" },
  { id: 3, icon: Globe, label: "Website" },
  { id: 4, icon: Image, label: "Images" },
  { id: 5, icon: Brain, label: "AI Profile" },
  { id: 6, icon: Clock, label: "Schedule" },
  { id: 7, icon: MessageCircle, label: "WhatsApp" },
];

const CATEGORIES = [
  "Food & Beverage",
  "Restaurant / Cafe",
  "Salon & Beauty",
  "Retail Store",
  "Clothing & Fashion",
  "Electronics",
  "Jewellery",
  "Health & Fitness",
  "Spa & Wellness",
  "Bakery",
  "Pharmacy",
  "Grocery",
  "Hardware Store",
  "Auto & Garage",
  "Real Estate",
  "Education & Coaching",
  "Interior Design",
  "Photography",
  "Event Management",
  "Travel & Tours",
  "Insurance",
  "Chartered Accountant",
  "Doctor / Clinic",
  "Dental",
  "Veterinary",
  "Legal / Law",
  "IT Services",
  "Digital Marketing",
  "Printing & Stationery",
  "Logistics",
  "Construction",
  "Cleaning Services",
  "Catering",
  "Florist",
  "Bookstore",
  "Toy Store",
  "Sports & Fitness Equipment",
  "Baby & Maternity",
  "Pet Store",
  "Organic / Eco Products",
  "Home Appliances",
  "Furniture",
  "Nursery / Plants",
  "Music Store",
  "Art Gallery",
  "Gift Shop",
  "Packaging",
  "Textile / Fabric",
  "Agricultural",
  "Other",
];

const TONALITIES = [
  {
    id: "WITTY",
    label: "Witty",
    desc: "Clever wordplay, memes, humor",
    emoji: "😄",
  },
  {
    id: "PREMIUM",
    label: "Premium",
    desc: "Elegant, aspirational, luxury feel",
    emoji: "✨",
  },
  {
    id: "INFORMATIVE",
    label: "Informative",
    desc: "Facts, tips, educational",
    emoji: "📚",
  },
  {
    id: "EMOTIONAL",
    label: "Emotional",
    desc: "Stories, feelings, connections",
    emoji: "❤️",
  },
  {
    id: "URGENT",
    label: "Urgent",
    desc: "Offers, deadlines, FOMO",
    emoji: "⚡",
  },
  {
    id: "PLAYFUL",
    label: "Playful",
    desc: "Fun, casual, energetic",
    emoji: "🎉",
  },
];

const POST_TIMES = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
];

interface WizardProps {
  userId: string;
  email: string;
}

export default function OnboardingWizard({ userId, email }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [brandId, setBrandId] = useState<string | null>(null);

  // Step 1
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");

  // Step 2
  const [brochureFile, setBrochureFile] = useState<File | null>(null);
  const [brochureProcessing, setBrochureProcessing] = useState(false);

  // Step 3
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteScraping, setWebsiteScraping] = useState(false);

  // Step 4
  const [brandImages, setBrandImages] = useState<File[]>([]);

  // Step 5 — AI generated brand profile
  const [brandProfile, setBrandProfile] = useState<any>(null);
  const [generatingProfile, setGeneratingProfile] = useState(false);

  // Step 6
  const [tonality, setTonality] = useState("WITTY");
  const [postTimes, setPostTimes] = useState(["08:00", "12:00", "18:00"]);

  const createBrand = trpc.brand.create.useMutation();
  const updateBrand = trpc.brand.update.useMutation();

  async function handleStep1() {
    setLoading(true);
    try {
      const brand = await createBrand.mutateAsync({
        name: businessName,
        category,
        subcategory: subcategory || undefined,
      });
      setBrandId(brand.id);
      setStep(2);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleStep2() {
    if (!brochureFile || !brandId) {
      setStep(3);
      return;
    }
    setBrochureProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", brochureFile);
      formData.append("brandId", brandId);
      await fetch("/api/onboarding/upload-brochure", {
        method: "POST",
        body: formData,
      });
    } catch (e) {
      console.error(e);
    }
    setBrochureProcessing(false);
    setStep(3);
  }

  async function handleStep3() {
    if (!websiteUrl || !brandId) {
      setStep(4);
      return;
    }
    setWebsiteScraping(true);
    try {
      await fetch("/api/onboarding/scrape-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, url: websiteUrl }),
      });
    } catch (e) {
      console.error(e);
    }
    setWebsiteScraping(false);
    setStep(4);
  }

  async function handleStep4() {
    if (!brandId) return;
    setLoading(true);
    if (brandImages.length > 0) {
      const formData = new FormData();
      brandImages.forEach((img) => formData.append("images", img));
      formData.append("brandId", brandId);
      await fetch("/api/onboarding/upload-images", {
        method: "POST",
        body: formData,
      });
    }
    setLoading(false);
    // Generate AI brand profile
    setStep(5);
    generateBrandProfile();
  }

  async function generateBrandProfile() {
    if (!brandId) return;
    setGeneratingProfile(true);
    try {
      const res = await fetch("/api/onboarding/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId }),
      });
      const data = await res.json();
      setBrandProfile(data.profile);
    } catch (e) {
      console.error(e);
    }
    setGeneratingProfile(false);
  }

  async function handleStep5() {
    if (!brandId || !brandProfile) return;
    setLoading(true);
    await updateBrand.mutateAsync({
      id: brandId,
      targetAudience: brandProfile.targetAudience,
      usp: brandProfile.usp,
      competitors: brandProfile.competitors ?? [],
      voicePersonality: brandProfile.voicePersonality,
      description: brandProfile.positioningStatement,
    });
    setLoading(false);
    setStep(6);
  }

  async function handleStep6() {
    if (!brandId) return;
    setLoading(true);
    await updateBrand.mutateAsync({
      id: brandId,
      voicePersonality: {
        ...(brandProfile?.voicePersonality ?? {}),
        tonality,
      },
    });
    setLoading(false);
    setStep(7);
  }

  async function handleStep7(connectNow: boolean) {
    if (!brandId) return;
    setLoading(true);
    await updateBrand.mutateAsync({
      id: brandId,
      onboardingCompleted: true,
    });
    setLoading(false);
    router.push("/");
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center">
            <Zap className="w-4 h-4 text-black fill-black" />
          </div>
          <span className="font-bold">StatusCraft</span>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = step > s.id;
            const isActive = step === s.id;
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`flex flex-col items-center gap-1 ${
                    isActive
                      ? "opacity-100"
                      : isDone
                      ? "opacity-70"
                      : "opacity-30"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                      isDone
                        ? "bg-[#25D366] border-[#25D366]"
                        : isActive
                        ? "border-[#25D366] bg-[#25D366]/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4 text-black" />
                    ) : (
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          isActive ? "text-[#25D366]" : "text-[#8b8b9a]"
                        }`}
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-[#8b8b9a] hidden sm:block">
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-1 transition-all ${
                      step > s.id ? "bg-[#25D366]/40" : "bg-white/10"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl bg-[#141416] border border-white/[0.06] rounded-2xl overflow-hidden">
        <AnimatePresence mode="wait">
          {/* STEP 1: Business Details */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-1">Tell us about your business</h2>
              <p className="text-[#8b8b9a] text-sm mb-6">
                This helps our AI understand your brand from day one
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Sharma Chai Corner"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#25D366]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#1a1a1d] border border-white/[0.08] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#25D366]/50 transition-colors"
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Subcategory{" "}
                    <span className="text-[#555562]">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="e.g. Masala chai, filter coffee"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#25D366]/50 transition-colors"
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleStep1}
                  disabled={!businessName || !category || loading}
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Continue <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Brochure Upload */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-1">Upload your brochure</h2>
              <p className="text-[#8b8b9a] text-sm mb-6">
                Our AI will extract your products, prices, and brand story from any
                PDF or image
              </p>
              <label className="block w-full border-2 border-dashed border-white/10 hover:border-[#25D366]/30 rounded-2xl p-10 text-center cursor-pointer transition-colors group">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setBrochureFile(e.target.files?.[0] ?? null)}
                />
                <FileText className="w-10 h-10 text-[#555562] group-hover:text-[#25D366]/60 mx-auto mb-3 transition-colors" />
                {brochureFile ? (
                  <p className="text-sm text-[#25D366]">{brochureFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">
                      Drop your brochure here or click to browse
                    </p>
                    <p className="text-xs text-[#555562] mt-1">
                      PDF, PNG, JPG up to 10MB
                    </p>
                  </>
                )}
              </label>
              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 text-sm text-[#8b8b9a] hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleStep2}
                  disabled={brochureProcessing}
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-40"
                >
                  {brochureProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                    </>
                  ) : (
                    <>
                      {brochureFile ? "Upload & Continue" : "Skip for now"}{" "}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Website URL */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-1">Add your website</h2>
              <p className="text-[#8b8b9a] text-sm mb-6">
                We&apos;ll scrape your website to extract brand info, products, and
                copy
              </p>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Website URL{" "}
                  <span className="text-[#555562]">(optional)</span>
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yourshop.com"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#25D366]/50 transition-colors"
                />
              </div>
              <p className="text-xs text-[#555562] mt-2">
                Instagram, Justdial, or Google Business links work too
              </p>
              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 text-sm text-[#8b8b9a] hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleStep3}
                  disabled={websiteScraping}
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-40"
                >
                  {websiteScraping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Scraping…
                    </>
                  ) : (
                    <>
                      {websiteUrl ? "Scrape & Continue" : "Skip for now"}{" "}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Brand Images */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-1">Upload brand images</h2>
              <p className="text-[#8b8b9a] text-sm mb-6">
                Product photos, your logo, or any images that represent your
                brand
              </p>
              <label className="block w-full border-2 border-dashed border-white/10 hover:border-[#25D366]/30 rounded-2xl p-10 text-center cursor-pointer transition-colors group">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setBrandImages(Array.from(e.target.files ?? []))
                  }
                />
                <Image className="w-10 h-10 text-[#555562] group-hover:text-[#25D366]/60 mx-auto mb-3 transition-colors" />
                {brandImages.length > 0 ? (
                  <p className="text-sm text-[#25D366]">
                    {brandImages.length} image
                    {brandImages.length > 1 ? "s" : ""} selected
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium">
                      Drop images here or click to browse
                    </p>
                    <p className="text-xs text-[#555562] mt-1">
                      PNG, JPG up to 5MB each
                    </p>
                  </>
                )}
              </label>
              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 text-sm text-[#8b8b9a] hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleStep4}
                  disabled={loading}
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {brandImages.length > 0 ? "Upload & Continue" : "Skip for now"}{" "}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: AI Brand Profile */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-1">Your AI brand profile</h2>
              <p className="text-[#8b8b9a] text-sm mb-6">
                Review and confirm what our AI has learnt about your brand
              </p>
              {generatingProfile ? (
                <div className="flex flex-col items-center gap-4 py-12">
                  <div className="w-16 h-16 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-[#25D366] animate-pulse" />
                  </div>
                  <p className="text-sm text-[#8b8b9a]">
                    Analysing your brand…
                  </p>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-[#25D366]"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : brandProfile ? (
                <div className="space-y-4">
                  <div className="bg-white/[0.03] rounded-xl p-4">
                    <p className="text-xs text-[#555562] font-mono uppercase tracking-wider mb-2">
                      Brand Positioning
                    </p>
                    <p className="text-sm">{brandProfile.positioningStatement}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.03] rounded-xl p-4">
                      <p className="text-xs text-[#555562] font-mono uppercase tracking-wider mb-2">
                        USP
                      </p>
                      <p className="text-sm">{brandProfile.usp}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-xl p-4">
                      <p className="text-xs text-[#555562] font-mono uppercase tracking-wider mb-2">
                        Target Audience
                      </p>
                      <p className="text-sm">
                        {brandProfile.targetAudience?.description ??
                          "See full profile"}
                      </p>
                    </div>
                  </div>
                  {brandProfile.contentPillars && (
                    <div className="bg-white/[0.03] rounded-xl p-4">
                      <p className="text-xs text-[#555562] font-mono uppercase tracking-wider mb-3">
                        Content Pillars
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {brandProfile.contentPillars.map(
                          (pillar: string, i: number) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-[#25D366]/10 text-[#25D366] text-xs rounded-full border border-[#25D366]/20"
                            >
                              {pillar}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-[#555562]">
                  <p>Could not generate profile. You can continue and edit later.</p>
                </div>
              )}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleStep5}
                  disabled={generatingProfile || loading}
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Looks good! <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 6: Schedule + Tonality */}
          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-1">
                Set your posting style
              </h2>
              <p className="text-[#8b8b9a] text-sm mb-6">
                Choose your brand voice and when you want to post
              </p>

              <div className="mb-6">
                <p className="text-sm font-medium mb-3">Brand Tonality</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TONALITIES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTonality(t.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        tonality === t.id
                          ? "border-[#25D366] bg-[#25D366]/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="text-lg">{t.emoji}</span>
                      <p className="text-sm font-medium mt-1">{t.label}</p>
                      <p className="text-xs text-[#8b8b9a]">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">
                  Preferred Post Times{" "}
                  <span className="text-[#555562] font-normal">
                    (pick up to 3)
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {POST_TIMES.map((time) => {
                    const selected = postTimes.includes(time);
                    return (
                      <button
                        key={time}
                        onClick={() => {
                          if (selected) {
                            setPostTimes(postTimes.filter((t) => t !== time));
                          } else if (postTimes.length < 3) {
                            setPostTimes([...postTimes, time].sort());
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                          selected
                            ? "bg-[#25D366] text-black font-bold"
                            : "bg-white/[0.04] text-[#8b8b9a] hover:bg-white/[0.08]"
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(5)}
                  className="flex items-center gap-2 text-sm text-[#8b8b9a] hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleStep6}
                  disabled={loading}
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Continue <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 7: WhatsApp */}
          {step === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#25D366]/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-[#25D366]" />
                </div>
                <h2 className="text-2xl font-bold mb-1">
                  Connect WhatsApp Business
                </h2>
                <p className="text-[#8b8b9a] text-sm">
                  Link your WhatsApp Business account to auto-post your daily
                  statuses
                </p>
              </div>

              <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-xl p-4 mb-6">
                <p className="text-sm font-medium text-[#25D366] mb-2">
                  What you get with WhatsApp connected:
                </p>
                <ul className="space-y-1">
                  {[
                    "Auto-post your AI-generated statuses",
                    "Track views, replies, and screenshots",
                    "Reply analytics to learn what works",
                    "Schedule posts at the perfect time",
                  ].map((item) => (
                    <li
                      key={item}
                      className="text-xs text-[#8b8b9a] flex items-center gap-2"
                    >
                      <Check className="w-3 h-3 text-[#25D366] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleStep7(true)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" /> Connect WhatsApp
                      Business
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleStep7(false)}
                  className="w-full py-3 text-sm text-[#8b8b9a] hover:text-white transition-colors"
                >
                  Skip for now — I&apos;ll connect later
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
