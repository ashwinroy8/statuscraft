"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Layers, Image as ImageIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SYSTEM_TEMPLATES = [
  { id: "product-hero", name: "Product Hero", category: "PRODUCT", type: "IMAGE", desc: "Bold product spotlight with gradient background" },
  { id: "quote-elegant", name: "Elegant Quote", category: "QUOTE", type: "IMAGE", desc: "Premium text-forward design" },
  { id: "quiz-fun", name: "Quiz Card", category: "QUIZ", type: "IMAGE", desc: "Interactive quiz with options" },
  { id: "announcement", name: "Announcement", category: "ANNOUNCEMENT", type: "IMAGE", desc: "Big news banner with CTA" },
  { id: "meme-template", name: "Meme Template", category: "MEME", type: "IMAGE", desc: "Relatable content format" },
  { id: "testimonial", name: "Testimonial", category: "TESTIMONIAL", type: "IMAGE", desc: "Customer review showcase" },
  { id: "product-grid", name: "Product Grid", category: "PRODUCT", type: "CAROUSEL", desc: "4-up product showcase" },
  { id: "this-or-that", name: "This or That", category: "QUIZ", type: "IMAGE", desc: "Split screen comparison poll" },
];

const CATEGORY_COLORS: Record<string, any> = {
  PRODUCT: "blue",
  QUOTE: "outline",
  QUIZ: "green",
  ANNOUNCEMENT: "gold",
  MEME: "gold",
  TESTIMONIAL: "outline",
};

const TEMPLATE_PATTERNS: Record<string, string> = {
  "product-hero": "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  "quote-elegant": "linear-gradient(135deg, #0d0d0f 0%, #1a1a1d 100%)",
  "quiz-fun": "linear-gradient(135deg, #25D366 0%, #1aab52 100%)",
  "announcement": "linear-gradient(135deg, #F4A100 0%, #e08c00 100%)",
  "meme-template": "linear-gradient(135deg, #2d1b69 0%, #11998e 100%)",
  "testimonial": "linear-gradient(135deg, #1a1a1d 0%, #2a2a2d 100%)",
  "product-grid": "linear-gradient(135deg, #0d0d0f 0%, #1a1a2e 100%)",
  "this-or-that": "linear-gradient(90deg, #25D366 0%, #141416 50%, #F4A100 100%)",
};

interface Props {
  brandId: string;
}

export default function TemplatesClient({ brandId }: Props) {
  const router = useRouter();
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);

  async function handleUseTemplate(template: typeof SYSTEM_TEMPLATES[0]) {
    if (loadingTemplate) return; // prevent double-click
    setLoadingTemplate(template.id);

    try {
      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, postType: template.category }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Generate post failed:", err);
        setLoadingTemplate(null);
        return;
      }

      const { postId } = await res.json();
      if (postId) {
        router.push(`/post/${postId}`);
      }
    } catch (e) {
      console.error("Error generating from template:", e);
      setLoadingTemplate(null);
    }
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-5 h-5 text-[#25D366]" />
          <h1 className="text-2xl font-bold">Templates</h1>
        </div>
        <p className="text-[#8b8b9a] text-sm">
          Base templates for your AI-generated posts. Your brand colors and fonts
          are applied automatically.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {SYSTEM_TEMPLATES.map((template, i) => {
          const isLoading = loadingTemplate === template.id;

          return (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#141416] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.12] transition-colors group cursor-pointer"
              onClick={() => handleUseTemplate(template)}
            >
              {/* Preview */}
              <div
                className="relative overflow-hidden"
                style={{
                  background: TEMPLATE_PATTERNS[template.id],
                  aspectRatio: "9/16",
                  maxHeight: "200px",
                }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-3">
                    <ImageIcon className="w-6 h-6 text-white/60" />
                  </div>
                  <div className="w-3/4 h-2 bg-white/20 rounded-full mb-2" />
                  <div className="w-1/2 h-1.5 bg-white/10 rounded-full" />
                </div>

                {/* Hover / loading overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  {isLoading ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold bg-white text-black px-3 py-1.5 rounded-full">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating…
                    </span>
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold bg-white text-black px-3 py-1.5 rounded-full">
                      Use Template
                    </span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge variant={CATEGORY_COLORS[template.category] ?? "outline"} className="text-[10px]">
                    {template.category}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {template.type}
                  </Badge>
                </div>
                <p className="text-sm font-semibold">{template.name}</p>
                <p className="text-xs text-[#555562] mt-0.5">{template.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Global loading notice */}
      {loadingTemplate && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1d] border border-white/10 rounded-full px-5 py-2.5 flex items-center gap-2.5 text-sm shadow-xl z-50"
        >
          <Loader2 className="w-4 h-4 animate-spin text-[#25D366]" />
          <span className="text-white/80">
            AI is writing your post… takes ~15 seconds
          </span>
        </motion.div>
      )}
    </div>
  );
}
