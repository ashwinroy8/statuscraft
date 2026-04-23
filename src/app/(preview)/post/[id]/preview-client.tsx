"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Check,
  X,
  Edit3,
  RefreshCw,
  Send,
  Eye,
  MessageSquare,
  Brain,
  Clock,
  Loader2,
  Image as ImageIcon,
  Zap,
  Download,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface Props {
  post: any;
}

export default function PostPreviewClient({ post: initialPost }: Props) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState(post.headline ?? "");
  const [bodyText, setBodyText] = useState(post.bodyText ?? "");
  const [ctaText, setCtaText] = useState(post.ctaText ?? "");
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const approve = trpc.post.approve.useMutation({
    onSuccess: () => router.push("/"),
  });
  const reject = trpc.post.reject.useMutation({
    onSuccess: () => router.push("/"),
  });
  const update = trpc.post.update.useMutation({
    onSuccess: (data) => {
      setPost((prev: any) => ({ ...prev, ...data }));
      setEditing(false);
    },
  });

  async function regenerateImage() {
    setRegeneratingImage(true);
    const res = await fetch("/api/media/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id }),
    });
    const data = await res.json();
    if (data.imageUrl) {
      setPost((prev: any) => ({ ...prev, imageUrl: data.imageUrl }));
    }
    setRegeneratingImage(false);
  }

  async function downloadImage() {
    if (!post.imageUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = post.imageUrl;

    await new Promise((resolve) => { img.onload = resolve; });

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d")!;

    // Draw background image
    ctx.drawImage(img, 0, 0, 1080, 1920);

    // Dark gradient at bottom
    const gradient = ctx.createLinearGradient(0, 1400, 0, 1920);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // Headline text
    if (post.headline) {
      ctx.font = "bold 72px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 10;
      // Word wrap
      const words = post.headline.split(" ");
      let line = "";
      let y = 1680;
      for (const word of words) {
        const test = line + word + " ";
        if (ctx.measureText(test).width > 960 && line) {
          ctx.fillText(line, 60, y);
          line = word + " ";
          y += 85;
        } else {
          line = test;
        }
      }
      ctx.fillText(line, 60, y);
    }

    // CTA text
    if (post.ctaText) {
      ctx.font = "bold 48px Arial";
      ctx.fillStyle = "#25D366";
      ctx.shadowBlur = 0;
      ctx.fillText(post.ctaText, 60, 1870);
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${post.headline?.slice(0, 40) ?? "status"}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/jpeg", 0.95);
  }

  async function saveEdits() {
    setSaving(true);
    await update.mutateAsync({ id: post.id, headline, bodyText, ctaText });
    setSaving(false);
  }

  const brand = post.brand;

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex">
      {/* Left — Phone Mockup */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0a0a0c]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          {/* Phone frame */}
          <div className="relative w-[280px] rounded-[40px] border-[6px] border-[#2a2a2d] bg-[#1a1a1d] shadow-2xl overflow-hidden">
            {/* Notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-[#0d0d0f] rounded-full z-10" />

            {/* Status bar */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 text-[10px] text-white/60 bg-[#1a1a1d]">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <span>5G</span>
                <span>🔋</span>
              </div>
            </div>

            {/* WhatsApp header */}
            <div className="bg-[#128C7E] px-4 py-3 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {brand.name?.[0] ?? "B"}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{brand.name}</p>
                <p className="text-[10px] text-white/70">Status</p>
              </div>
            </div>

            {/* Status image area */}
            <div
              className="relative bg-[#111] overflow-hidden"
              style={{ aspectRatio: "9/16", maxHeight: "450px" }}
            >
              {post.imageUrl ? (
                <img
                  src={post.imageUrl}
                  alt={post.headline ?? "Post"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
                  <ImageIcon className="w-12 h-12 text-white/20 mb-3" />
                  <p className="text-xs text-white/40">No image yet</p>
                </div>
              )}

              {/* Text overlay on top of image */}
              {post.imageUrl && post.headline && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                  <p className="text-white font-bold text-sm leading-tight mb-1 drop-shadow-lg">
                    {post.headline}
                  </p>
                  {post.ctaText && (
                    <p className="text-[#25D366] text-xs font-semibold mt-2">{post.ctaText}</p>
                  )}
                </div>
              )}

              {/* Overlay text (no image) */}
              {!post.imageUrl && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  {post.headline && (
                    <p className="text-white font-bold text-sm leading-tight mb-1">
                      {post.headline}
                    </p>
                  )}
                  {post.bodyText && (
                    <p className="text-white/80 text-xs leading-relaxed line-clamp-3">
                      {post.bodyText}
                    </p>
                  )}
                  {post.ctaText && (
                    <div className="mt-2 inline-block bg-[#25D366] px-3 py-1 rounded-full">
                      <p className="text-black text-[10px] font-bold">{post.ctaText}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Progress bar (like WhatsApp status) */}
              <div className="absolute top-2 left-2 right-2 h-0.5 bg-white/20 rounded-full">
                <div className="h-full bg-white rounded-full w-2/3" />
              </div>
            </div>

            {/* Bottom controls (like WhatsApp) */}
            <div className="bg-[#1a1a1d] px-4 py-3 flex items-center gap-2">
              <div className="flex-1 bg-white/10 rounded-full px-3 py-1.5 text-[10px] text-white/40">
                Reply…
              </div>
              <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center">
                <Send className="w-3 h-3 text-black fill-black" />
              </div>
            </div>
          </div>

          {/* Image action buttons */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <button
              onClick={regenerateImage}
              disabled={regeneratingImage}
              className="flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] rounded-full px-4 py-2 text-xs transition-colors"
            >
              {regeneratingImage ? (
                <Loader2 className="w-3 h-3 animate-spin text-[#25D366]" />
              ) : (
                <RefreshCw className="w-3 h-3 text-[#25D366]" />
              )}
              Regenerate
            </button>
            {post.imageUrl && (
              <button
                onClick={downloadImage}
                className="flex items-center gap-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-full px-4 py-2 text-xs text-[#25D366] transition-colors"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Right — Details & Actions */}
      <div className="w-[420px] flex-shrink-0 border-l border-white/[0.06] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-[#8b8b9a] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant={
              post.status === "SENT" ? "green" :
              post.status === "SCHEDULED" ? "blue" :
              post.status === "FAILED" ? "red" : "outline"
            }>
              {post.status}
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Post content */}
          {editing ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div>
                <label className="text-xs text-[#555562] mb-1 block">Headline</label>
                <textarea
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  rows={2}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#25D366]/50 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#555562] mb-1 block">Body Text</label>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={4}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#25D366]/50 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#555562] mb-1 block">CTA Text</label>
                <input
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#25D366]/50"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={saveEdits} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{post.type}</Badge>
                    <Badge variant="outline">{post.tonality}</Badge>
                  </div>
                  <h2 className="font-bold text-lg leading-snug mb-2">{post.headline}</h2>
                  {post.bodyText && (
                    <p className="text-sm text-[#8b8b9a] leading-relaxed">{post.bodyText}</p>
                  )}
                  {post.ctaText && (
                    <div className="mt-3 inline-block bg-[#25D366]/10 text-[#25D366] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#25D366]/20">
                      {post.ctaText}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="text-[#555562] hover:text-white transition-colors flex-shrink-0"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              {/* Schedule */}
              {post.scheduledAt && (
                <div className="flex items-center gap-2 text-sm text-[#8b8b9a]">
                  <Clock className="w-4 h-4" />
                  {format(new Date(post.scheduledAt), "EEEE, MMM d · h:mm a")}
                </div>
              )}

              {/* Signal */}
              {post.signal && (
                <div className="bg-[#F4A100]/5 border border-[#F4A100]/20 rounded-xl p-3">
                  <p className="text-xs text-[#F4A100] font-semibold mb-0.5">
                    Signal: {post.signal.type}
                  </p>
                  <p className="text-xs text-[#8b8b9a]">{post.signal.title}</p>
                </div>
              )}
            </div>
          )}

          {/* AI Reasoning */}
          {post.aiReasoning && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-3.5 h-3.5 text-[#25D366]" />
                <p className="text-xs font-semibold text-[#25D366]">Why this post?</p>
              </div>
              <p className="text-xs text-[#8b8b9a] leading-relaxed">{post.aiReasoning}</p>
            </div>
          )}

          {/* Analytics (if sent) */}
          {post.analytics && post.status === "SENT" && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <p className="text-xs font-semibold mb-3">Performance</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Views", value: post.analytics.views, icon: Eye, color: "text-blue-400" },
                  { label: "Replies", value: post.analytics.replies, icon: MessageSquare, color: "text-[#F4A100]" },
                  { label: "Score", value: post.analytics.aiScore, icon: Zap, color: "text-[#25D366]" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-[#555562]">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {post.status === "DRAFT" && (
          <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3">
            <Button
              variant="danger"
              onClick={() => reject.mutate({ id: post.id })}
              disabled={reject.isPending}
            >
              {reject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Reject
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => approve.mutate({ id: post.id })}
              disabled={approve.isPending}
            >
              {approve.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Approve & Schedule
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
