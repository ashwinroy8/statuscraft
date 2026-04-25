"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Wand2,
  Upload,
  Loader2,
  Sparkles,
  Check,
  ImageIcon,
  ArrowRight,
  Copy,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface AdResult {
  postId: string;
  originalImageUrl: string;
  enhancedImageUrl: string;
  headline: string;
  bodyText: string;
  ctaText: string;
  hashtags: string[];
  productName: string;
}

const STEPS = [
  { label: "Analysing your photo", icon: "🔍" },
  { label: "Checking current trends", icon: "📡" },
  { label: "Enhancing to ad quality", icon: "✨" },
  { label: "Writing copy & tagline", icon: "✍️" },
];

export default function StudioClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<AdResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleFileSelect(f: File) {
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, WEBP)");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  }

  async function generate() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setStep(0);

    // Simulate step progression while API runs
    const stepInterval = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 8000);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/media/ad-studio", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Failed to generate ad");
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  }

  function copyContent() {
    if (!result) return;
    const text = `${result.headline}\n\n${result.bodyText}\n\n${result.ctaText}\n\n${result.hashtags.join(" ")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className="w-5 h-5 text-[#25D366]" />
          <h1 className="text-2xl font-bold">Ad Studio</h1>
          <span className="text-[9px] font-bold font-mono bg-[#25D366]/15 text-[#25D366] px-1.5 py-0.5 rounded-full ml-1">AI</span>
        </div>
        <p className="text-[#8b8b9a] text-sm">
          Upload a product photo → AI makes it ad-quality and writes the perfect caption based on today's trends
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — upload + result */}
        <div className="space-y-4">
          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileSelect(f);
            }}
            onClick={() => !preview && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl overflow-hidden transition-colors cursor-pointer ${
              dragOver ? "border-[#25D366] bg-[#25D366]/5" : preview ? "border-white/[0.10]" : "border-white/[0.08] hover:border-white/[0.18]"
            }`}
            style={{ aspectRatio: "9/16", maxHeight: 420 }}
          >
            {preview ? (
              <>
                <img src={preview} alt="Product" className="w-full h-full object-cover" />
                {!loading && (
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="absolute top-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-black/80 transition-colors"
                  >
                    Change photo
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                  <ImageIcon className="w-7 h-7 text-[#555562]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">Drop your product photo here</p>
                  <p className="text-xs text-[#555562]">JPG, PNG, or WEBP — a clear photo works best</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#25D366]">
                  <Upload className="w-3.5 h-3.5" />
                  Click to browse
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
              e.target.value = "";
            }}
          />

          {/* Generate button */}
          {preview && !loading && !result && (
            <Button variant="primary" onClick={generate} className="w-full">
              <Sparkles className="w-4 h-4" />
              Generate Professional Ad
            </Button>
          )}

          {/* Loading steps */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 space-y-3"
            >
              {STEPS.map((s, i) => (
                <div key={i} className={`flex items-center gap-3 transition-opacity ${i > step ? "opacity-30" : "opacity-100"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    i < step ? "bg-[#25D366] text-black" : i === step ? "bg-white/[0.08]" : "bg-white/[0.04]"
                  }`}>
                    {i < step ? <Check className="w-3.5 h-3.5" /> : i === step ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>{i + 1}</span>}
                  </div>
                  <span className={`text-sm ${i === step ? "text-white font-medium" : "text-[#8b8b9a]"}`}>
                    {s.icon} {s.label}
                  </span>
                </div>
              ))}
              <p className="text-xs text-[#555562] pt-1">Takes about 30-40 seconds…</p>
            </motion.div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Right — enhanced image + content */}
        <div className="space-y-4">
          {!result && !loading && (
            <div className="border border-white/[0.06] rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight: 300 }}>
              <Wand2 className="w-8 h-8 text-[#555562]" />
              <p className="text-[#8b8b9a] text-sm">Your professional ad will appear here</p>
              <p className="text-xs text-[#555562] max-w-xs">
                Upload a product photo on the left and click Generate
              </p>
            </div>
          )}

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Enhanced image */}
                <div className="relative rounded-2xl overflow-hidden border border-white/[0.08]" style={{ aspectRatio: "9/16", maxHeight: 420 }}>
                  <img
                    src={result.enhancedImageUrl}
                    alt="Enhanced ad"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-[#25D366] text-black text-xs font-bold px-2.5 py-1 rounded-full">
                    ✨ AI Enhanced
                  </div>
                </div>

                {/* Before/after toggle - just show both small */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center">
                    <div className="rounded-xl overflow-hidden border border-white/[0.06] mb-1.5" style={{ aspectRatio: "9/16", maxHeight: 100 }}>
                      <img src={result.originalImageUrl} alt="Original" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-[#555562]">Original</span>
                  </div>
                  <div className="text-center">
                    <div className="rounded-xl overflow-hidden border border-[#25D366]/30 mb-1.5" style={{ aspectRatio: "9/16", maxHeight: 100 }}>
                      <img src={result.enhancedImageUrl} alt="Enhanced" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-[#25D366]">Enhanced</span>
                  </div>
                </div>

                {/* Ad copy */}
                <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-[#555562] uppercase tracking-wide">Generated Content</h3>
                  <div>
                    <p className="text-[10px] text-[#555562] mb-0.5">Headline</p>
                    <p className="font-bold text-white">{result.headline}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#555562] mb-0.5">Caption</p>
                    <p className="text-sm text-[#f0f0f2] leading-relaxed">{result.bodyText}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#555562] mb-0.5">CTA</p>
                    <p className="text-sm font-semibold text-[#25D366]">{result.ctaText}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {result.hashtags.map((h) => (
                      <span key={h} className="text-xs bg-white/[0.04] text-[#8b8b9a] px-2 py-0.5 rounded-full">{h}</span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button variant="primary" onClick={copyContent} className="flex-1">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy Caption"}
                  </Button>
                  <Link href={`/post/${result.postId}`}>
                    <Button variant="secondary">
                      <ExternalLink className="w-4 h-4" />
                      View Post
                    </Button>
                  </Link>
                  <Button variant="ghost" onClick={() => { setResult(null); setPreview(null); setFile(null); }}>
                    New
                  </Button>
                </div>

                <p className="text-xs text-[#555562] text-center">
                  Post saved as Draft — approve it from your{" "}
                  <Link href="/dashboard" className="text-[#25D366] hover:underline">Dashboard</Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
