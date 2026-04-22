"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
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

  const approve = trpc.post.approve.useMutation({
    onSuccess: onAction,
  });
  const reject = trpc.post.reject.useMutation({
    onSuccess: onAction,
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

  const StatusIcon = STATUS_ICONS[post.status as keyof typeof STATUS_ICONS] ?? Clock;

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

          {/* Analytics (for sent posts) */}
          {post.analytics && post.status === "SENT" && (
            <div className="flex items-center gap-4 mb-3">
              <span className="flex items-center gap-1 text-xs text-[#8b8b9a]">
                <Eye className="w-3 h-3" /> {post.analytics.views}
              </span>
              <span className="flex items-center gap-1 text-xs text-[#8b8b9a]">
                <MessageSquare className="w-3 h-3" /> {post.analytics.replies}
              </span>
              {post.analytics.aiScore > 0 && (
                <span className="flex items-center gap-1 text-xs text-[#25D366]">
                  <TrendingUp className="w-3 h-3" /> {post.analytics.aiScore}
                </span>
              )}
            </div>
          )}

          {/* Actions for draft posts */}
          {post.status === "DRAFT" && (
            <div className="flex items-center gap-2">
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
