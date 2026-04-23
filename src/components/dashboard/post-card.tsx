"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  Edit3,
  Clock,
  Send,
  AlertCircle,
  Eye,
  MessageSquare,
  TrendingUp,
  Image as ImageIcon,
  Loader2,
  BarChart2,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";

interface PostCardProps {
  post: {
    id: string;
    type: string;
    status: string;
    tonality: string;
    headline: string | null;
    bodyText: string | null;
    ctaText: string | null;
    imageUrl: string | null;
    scheduledAt: Date | null;
    aiReasoning: string | null;
    analytics: {
      views: number;
      replies: number;
      engagementRate: number;
      aiScore: number;
    } | null;
  };
  onAction?: () => void;
  index?: number;
}

const TYPE_COLORS: Record<string, string> = {
  PRODUCT: "blue",
  TREND: "gold",
  QUIZ: "green",
  POLL: "green",
  MEME: "gold",
  EVENT: "blue",
  EDUCATIONAL: "outline",
  STORY: "outline",
};

const STATUS_ICONS = {
  DRAFT: Clock,
  SCHEDULED: Clock,
  SENT: Send,
  FAILED: AlertCircle,
};

const STATUS_BADGES: Record<string, "default" | "green" | "gold" | "red" | "blue" | "outline"> = {
  DRAFT: "outline",
  SCHEDULED: "blue",
  SENT: "green",
  FAILED: "red",
};

export function PostCard({ post, onAction, index = 0 }: PostCardProps) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showLogViews, setShowLogViews] = useState(false);
  const [viewsInput, setViewsInput] = useState(
    String(post.analytics?.views ?? "")
  );
  const [repliesInput, setRepliesInput] = useState(
    String(post.analytics?.replies ?? "")
  );
  const [localAnalytics, setLocalAnalytics] = useState(post.analytics);

  const approve = trpc.post.approve.useMutation({ onSuccess: onAction });
  const reject = trpc.post.reject.useMutation({ onSuccess: onAction });
  const logAnalytics = trpc.post.logAnalytics.useMutation({
    onSuccess: (data) => {
      setLocalAnalytics({
        views: data.views,
        replies: data.replies,
        engagementRate: data.engagementRate,
        aiScore: (localAnalytics?.aiScore ?? 0),
      });
      setShowLogViews(false);
    },
  });

  async function handleApprove() {
    setApproving(true);
    await approve.mutateAsync({ id: post.id });
    setApproving(false);
  }

  async function handleReject() {
    setRejecting(true);
    await reject.mutateAsync({ id: post.id });
    setRejecting(false);
  }

  async function handleGenerateImage() {
    setGeneratingImage(true);
    await fetch("/api/media/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id }),
    });
    setGeneratingImage(false);
    onAction?.();
  }

  function handleLogSubmit() {
    const views = parseInt(viewsInput) || 0;
    const replies = parseInt(repliesInput) || 0;
    logAnalytics.mutate({ id: post.id, views, replies });
  }

  const StatusIcon = STATUS_ICONS[post.status as keyof typeof STATUS_ICONS] ?? Clock;
  const hasAnalytics = localAnalytics && (localAnalytics.views > 0 || localAnalytics.replies > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="bg-[#141416] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.10] transition-colors"
    >
      <div className="flex gap-0">
        {/* Image preview */}
        <div className="w-[100px] flex-shrink-0 bg-[#1a1a1d] relative">
          {post.imageUrl ? (
            <img
              src={post.imageUrl}
              alt={post.headline ?? "Post"}
              className="w-full h-full object-cover"
              style={{ aspectRatio: "9/16", maxHeight: "178px" }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[178px] gap-2">
              <ImageIcon className="w-6 h-6 text-[#555562]" />
              {post.status === "DRAFT" && (
                <button
                  onClick={handleGenerateImage}
                  disabled={generatingImage}
                  className="text-[10px] text-[#25D366] hover:underline"
                >
                  {generatingImage ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "Generate"
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={TYPE_COLORS[post.type] as any ?? "outline"}>
                {post.type}
              </Badge>
              <Badge variant={STATUS_BADGES[post.status] ?? "outline"}>
                <StatusIcon className="w-3 h-3" />
                {post.status}
              </Badge>
              {post.scheduledAt && (
                <span className="text-[11px] text-[#555562] font-mono">
                  {new Date(post.scheduledAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <Link
              href={`/post/${post.id}`}
              className="text-[#555562] hover:text-white transition-colors flex-shrink-0"
            >
              <Eye className="w-4 h-4" />
            </Link>
          </div>

          {/* Text */}
          <h3 className="font-semibold text-sm leading-snug mb-1 line-clamp-2">
            {post.headline ?? "Untitled post"}
          </h3>
          {post.bodyText && (
            <p className="text-xs text-[#8b8b9a] line-clamp-2 mb-3">
              {post.bodyText}
            </p>
          )}

          {/* Analytics row for sent posts */}
          {post.status === "SENT" && (
            <div className="mt-2">
              {hasAnalytics ? (
                <div className="flex items-center gap-4 mb-2">
                  <span className="flex items-center gap-1 text-xs text-[#8b8b9a]">
                    <Eye className="w-3 h-3" />
                    <span className="font-mono font-semibold text-white">
                      {localAnalytics!.views.toLocaleString()}
                    </span>
                    views
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[#8b8b9a]">
                    <MessageSquare className="w-3 h-3" />
                    <span className="font-mono font-semibold text-white">
                      {localAnalytics!.replies}
                    </span>
                    replies
                  </span>
                  {localAnalytics!.engagementRate > 0 && (
                    <span className="flex items-center gap-1 text-xs text-[#25D366]">
                      <TrendingUp className="w-3 h-3" />
                      {localAnalytics!.engagementRate}%
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setViewsInput(String(localAnalytics!.views));
                      setRepliesInput(String(localAnalytics!.replies));
                      setShowLogViews(true);
                    }}
                    className="text-[10px] text-[#555562] hover:text-[#25D366] transition-colors ml-auto"
                  >
                    Update
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLogViews(true)}
                  className="flex items-center gap-1.5 text-xs text-[#F4A100] hover:text-[#F4A100]/80 transition-colors mb-2"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  Log views from WhatsApp
                </button>
              )}

              {/* Inline log form */}
              <AnimatePresence>
                {showLogViews && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 mt-1">
                      <p className="text-[10px] text-[#8b8b9a] mb-2.5">
                        Open WhatsApp → your Status → swipe up to see viewers
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-[#555562] block mb-1">
                            Views
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={viewsInput}
                            onChange={(e) => setViewsInput(e.target.value)}
                            placeholder="e.g. 247"
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-sm font-mono outline-none focus:border-[#25D366]/50 text-white"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-[#555562] block mb-1">
                            Replies
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={repliesInput}
                            onChange={(e) => setRepliesInput(e.target.value)}
                            placeholder="e.g. 12"
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-sm font-mono outline-none focus:border-[#25D366]/50 text-white"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 pt-4">
                          <button
                            onClick={handleLogSubmit}
                            disabled={logAnalytics.isPending}
                            className="bg-[#25D366] hover:bg-[#1aab52] text-black rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {logAnalytics.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Save
                          </button>
                          <button
                            onClick={() => setShowLogViews(false)}
                            className="text-[#555562] hover:text-white text-xs text-center py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Actions for draft posts */}
          {post.status === "DRAFT" && (
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                variant="primary"
                onClick={handleApprove}
                disabled={approving}
              >
                {approving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Approve
              </Button>
              <Link
                href={`/post/${post.id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg hover:bg-white/[0.06] text-[#8b8b9a] hover:text-[#f0f0f2] transition-colors"
              >
                <Edit3 className="w-3 h-3" /> Edit
              </Link>
              <Button
                size="sm"
                variant="danger"
                onClick={handleReject}
                disabled={rejecting}
              >
                {rejecting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <X className="w-3 h-3" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
