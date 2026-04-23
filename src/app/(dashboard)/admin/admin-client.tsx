"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Users,
  Building2,
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Shield,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

interface Post {
  id: string;
  headline: string | null;
  type: string;
  status: string;
  createdAt: string;
}

interface Brand {
  id: string;
  name: string;
  category: string;
  onboardingCompleted: boolean;
  createdAt: string;
  _count: { posts: number };
  posts: Post[];
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  createdAt: string;
  brands: Brand[];
}

interface Stats {
  totalUsers: number;
  totalBrands: number;
  totalPosts: number;
  postsThisWeek: number;
}

interface Props {
  users: UserRow[];
  stats: Stats;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "text-[#F4A100] bg-[#F4A100]/10",
  SCHEDULED: "text-blue-400 bg-blue-400/10",
  SENT: "text-[#25D366] bg-[#25D366]/10",
  FAILED: "text-red-400 bg-red-400/10",
};

const TYPE_COLORS: Record<string, string> = {
  PRODUCT: "text-[#25D366]",
  TREND: "text-[#F4A100]",
  QUIZ: "text-purple-400",
  POLL: "text-blue-400",
  MEME: "text-orange-400",
  EVENT: "text-blue-300",
  EDUCATIONAL: "text-teal-400",
  STORY: "text-pink-400",
};

export default function AdminClient({ users, stats }: Props) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  function toggleUser(userId: string) {
    setExpandedUser((prev) => (prev === userId ? null : userId));
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8"
      >
        <div className="w-10 h-10 rounded-xl bg-[#F4A100]/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#F4A100]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Super Admin</h1>
          <p className="text-[#8b8b9a] text-sm">All users and activity across StatusCraft</p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          icon={Users}
          accent="green"
          index={0}
        />
        <StatCard
          label="Total Brands"
          value={stats.totalBrands}
          icon={Building2}
          accent="gold"
          index={1}
        />
        <StatCard
          label="Total Posts Generated"
          value={stats.totalPosts.toLocaleString()}
          icon={FileText}
          accent="blue"
          index={2}
        />
        <StatCard
          label="Posts This Week"
          value={stats.postsThisWeek}
          icon={TrendingUp}
          accent="green"
          index={3}
        />
      </div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-[#141416] border border-white/[0.06] rounded-2xl overflow-hidden"
      >
        {/* Table header */}
        <div className="grid grid-cols-[1fr_180px_140px_100px_120px_120px] gap-4 px-5 py-3 border-b border-white/[0.06] text-xs font-semibold text-[#555562] uppercase tracking-wider">
          <div>User</div>
          <div>Brand</div>
          <div>Category</div>
          <div>Posts</div>
          <div>Onboarding</div>
          <div>Joined</div>
        </div>

        {users.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-[#555562]">
            No users found.
          </div>
        )}

        {users.map((user, i) => {
          const brand = user.brands[0] ?? null;
          const totalUserPosts = user.brands.reduce(
            (sum, b) => sum + b._count.posts,
            0
          );
          const isExpanded = expandedUser === user.id;

          return (
            <div key={user.id} className="border-b border-white/[0.04] last:border-0">
              {/* Main row */}
              <button
                onClick={() => toggleUser(user.id)}
                className="w-full grid grid-cols-[1fr_180px_140px_100px_120px_120px] gap-4 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors group"
              >
                {/* Email + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#25D366]">
                    {(user.name ?? user.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.email}
                    </p>
                    {user.name && (
                      <p className="text-xs text-[#555562] truncate">{user.name}</p>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#555562] flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#555562] flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>

                {/* Brand name */}
                <div className="flex items-center">
                  <span className="text-sm text-[#f0f0f2] truncate">
                    {brand ? brand.name : <span className="text-[#555562] italic">No brand</span>}
                  </span>
                </div>

                {/* Category */}
                <div className="flex items-center">
                  <span className="text-sm text-[#8b8b9a] truncate">
                    {brand ? brand.category : "—"}
                  </span>
                </div>

                {/* Posts count */}
                <div className="flex items-center">
                  <span className="text-sm font-mono font-semibold text-[#25D366]">
                    {totalUserPosts}
                  </span>
                </div>

                {/* Onboarding */}
                <div className="flex items-center">
                  {brand?.onboardingCompleted ? (
                    <span className="flex items-center gap-1.5 text-xs text-[#25D366]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Complete
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-[#F4A100]">
                      <Clock className="w-3.5 h-3.5" />
                      Pending
                    </span>
                  )}
                </div>

                {/* Joined */}
                <div className="flex items-center">
                  <span className="text-xs text-[#555562]">
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
              </button>

              {/* Expanded posts */}
              <AnimatePresence>
                {isExpanded && brand && brand.posts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4">
                      <div className="bg-[#0d0d0f] rounded-xl border border-white/[0.04] overflow-hidden">
                        {/* Posts sub-header */}
                        <div className="grid grid-cols-[1fr_120px_100px_140px] gap-4 px-4 py-2.5 border-b border-white/[0.04] text-[10px] font-semibold text-[#555562] uppercase tracking-wider">
                          <div>Post Title</div>
                          <div>Type</div>
                          <div>Status</div>
                          <div>Created</div>
                        </div>
                        {brand.posts.map((post) => (
                          <div
                            key={post.id}
                            className="grid grid-cols-[1fr_120px_100px_140px] gap-4 px-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                          >
                            <p className="text-xs text-[#f0f0f2] truncate">{post.headline ?? "Untitled"}</p>
                            <span className={`text-xs font-semibold ${TYPE_COLORS[post.type] ?? "text-[#8b8b9a]"}`}>
                              {post.type}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${STATUS_COLORS[post.status] ?? "text-[#8b8b9a] bg-white/5"}`}>
                              {post.status}
                            </span>
                            <span className="text-xs text-[#555562]">
                              {format(new Date(post.createdAt), "MMM d, yyyy · HH:mm")}
                            </span>
                          </div>
                        ))}
                      </div>
                      {brand._count.posts > 20 && (
                        <p className="text-xs text-[#555562] mt-2 pl-1">
                          Showing 20 of {brand._count.posts} posts
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
                {isExpanded && (!brand || brand.posts.length === 0) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4">
                      <p className="text-xs text-[#555562] italic px-1">
                        {brand ? "No posts generated yet." : "No brand created yet."}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
