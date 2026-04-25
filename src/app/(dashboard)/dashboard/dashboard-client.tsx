"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PostCard } from "@/components/dashboard/post-card";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Send,
  Eye,
  MessageSquare,
  Zap,
  Radio,
  Loader2,
  TrendingUp,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface DayGroup {
  dateStr: string;
  label: string;
  posts: any[];
}

interface Props {
  brand: any;
  postsByDay: DayGroup[];
  todayDateStr: string;
  stats: {
    totalPosts: number;
    sentPosts: number;
    totalViews: number;
    totalReplies: number;
    avgEngagement: number;
  };
  signals: any[];
}

const SIGNAL_TYPE_COLORS: Record<string, string> = {
  TRENDING: "text-[#F4A100]",
  EVENT: "text-blue-400",
  HOLIDAY: "text-[#25D366]",
  CULTURAL: "text-purple-400",
  NEWS: "text-[#8b8b9a]",
  WEATHER: "text-blue-300",
  SPORTS: "text-orange-400",
};

export default function DashboardClient({ brand, postsByDay: initialPostsByDay, todayDateStr, stats, signals }: Props) {
  const [postsByDay, setPostsByDay] = useState(initialPostsByDay);
  const [generating, setGenerating] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const todayGroup = postsByDay.find((g) => g.dateStr === todayDateStr);
  const todayDrafts = todayGroup?.posts.filter((p) => p.status === "DRAFT") ?? [];

  async function generateContent() {
    setGenerating(true);
    try {
      await fetch("/api/cron/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer local-dev-secret`,
        },
        body: JSON.stringify({ brandId: brand.id }),
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  }

  async function tryDifferentPosts() {
    setDiscarding(true);
    try {
      // Delete today's drafts
      await fetch("/api/posts/discard-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: brand.id, dateStr: todayDateStr }),
      });
      // Generate a fresh set
      await fetch("/api/cron/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer local-dev-secret`,
        },
        body: JSON.stringify({ brandId: brand.id }),
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
    setDiscarding(false);
  }

  const hasTodayContent = (todayGroup?.posts.length ?? 0) > 0;

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-8"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{brand.name}</h1>
            <Badge variant="outline">{brand.category}</Badge>
          </div>
          <p className="text-[#8b8b9a] text-sm flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasTodayContent && todayDrafts.length > 0 && (
            <Button
              variant="ghost"
              onClick={tryDifferentPosts}
              disabled={discarding || generating}
              title="Discard today's drafts and generate a fresh set"
            >
              {discarding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Try Different Posts
            </Button>
          )}
          <Button
            variant="primary"
            onClick={generateContent}
            disabled={generating || discarding}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Generate Today&apos;s Posts
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Posts this month"
          value={stats.totalPosts}
          icon={Send}
          accent="green"
          index={0}
        />
        <StatCard
          label="Total views"
          value={stats.totalViews.toLocaleString()}
          icon={Eye}
          accent="blue"
          index={1}
        />
        <StatCard
          label="Total replies"
          value={stats.totalReplies}
          icon={MessageSquare}
          accent="gold"
          index={2}
        />
        <StatCard
          label="Avg engagement"
          value={`${stats.avgEngagement.toFixed(1)}%`}
          icon={TrendingUp}
          accent="green"
          index={3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts Column */}
        <div className="lg:col-span-2">
          {postsByDay.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-[#25D366]/10 flex items-center justify-center mb-4">
                <Zap className="w-8 h-8 text-[#25D366]" />
              </div>
              <h3 className="font-semibold mb-1">No posts yet</h3>
              <p className="text-sm text-[#8b8b9a] mb-6 max-w-xs">
                Hit Generate to let your AI marketing team create today&apos;s
                WhatsApp Status content
              </p>
              <Button variant="primary" onClick={generateContent} disabled={generating}>
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Generate Posts
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-8">
              {postsByDay.map((group) => (
                <DaySection
                  key={group.dateStr}
                  group={group}
                  isToday={group.dateStr === todayDateStr}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Signal Radar */}
          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#F4A100]" />
                <h3 className="text-sm font-semibold">Signal Radar</h3>
              </div>
              <Badge variant="gold">LIVE</Badge>
            </div>
            {signals.length > 0 ? (
              <div className="space-y-3">
                {signals.map((signal) => (
                  <div
                    key={signal.id}
                    className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-xl"
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        signal.relevanceScore >= 80
                          ? "bg-[#25D366]"
                          : signal.relevanceScore >= 60
                          ? "bg-[#F4A100]"
                          : "bg-[#555562]"
                      }`}
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold ${
                          SIGNAL_TYPE_COLORS[signal.type] ?? "text-[#8b8b9a]"
                        }`}
                      >
                        {signal.type}
                      </p>
                      <p className="text-xs text-[#f0f0f2] leading-snug">
                        {signal.title}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#555562] flex-shrink-0 mt-0.5">
                      {signal.relevanceScore}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#555562]">
                No active signals. Scan runs every 6 hours.
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4">This month</h3>
            <div className="space-y-3">
              {[
                {
                  label: "Posts sent",
                  value: stats.sentPosts,
                  color: "text-[#25D366]",
                },
                {
                  label: "Total reach",
                  value: stats.totalViews.toLocaleString(),
                  color: "text-blue-400",
                },
                {
                  label: "Replies received",
                  value: stats.totalReplies,
                  color: "text-[#F4A100]",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs text-[#8b8b9a]">{item.label}</span>
                  <span className={`text-sm font-semibold font-mono ${item.color}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DaySection({ group, isToday }: { group: DayGroup; isToday: boolean }) {
  const draftPosts = group.posts.filter((p) => p.status === "DRAFT");
  const scheduledPosts = group.posts.filter((p) => p.status === "SCHEDULED");
  const sentPosts = group.posts.filter((p) => p.status === "SENT");

  return (
    <div>
      {/* Day header */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className={`text-base font-bold ${isToday ? "text-[#25D366]" : "text-[#f0f0f2]"}`}>
          {group.label}
        </h2>
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-[11px] text-[#555562]">{group.posts.length} post{group.posts.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="space-y-5">
        {/* Drafts */}
        {draftPosts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-[#8b8b9a] uppercase tracking-wide">Needs Approval</span>
              <Badge variant="gold">{draftPosts.length}</Badge>
            </div>
            <div className="space-y-3">
              {draftPosts.map((post, i) => (
                <PostCard
                  key={post.id}
                  post={post}
                  index={i}
                  onAction={() => window.location.reload()}
                />
              ))}
            </div>
          </div>
        )}

        {/* Scheduled */}
        {scheduledPosts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-[#8b8b9a] uppercase tracking-wide">Scheduled</span>
              <Badge variant="blue">{scheduledPosts.length}</Badge>
            </div>
            <div className="space-y-3">
              {scheduledPosts.map((post, i) => (
                <PostCard key={post.id} post={post} index={i} onAction={() => window.location.reload()} />
              ))}
            </div>
          </div>
        )}

        {/* Sent */}
        {sentPosts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-[#8b8b9a] uppercase tracking-wide">Sent</span>
              <Badge variant="green">{sentPosts.length}</Badge>
            </div>
            <div className="space-y-3">
              {sentPosts.map((post, i) => (
                <PostCard key={post.id} post={post} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
