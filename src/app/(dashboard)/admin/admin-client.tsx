"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Users, Building2, FileText, TrendingUp, ChevronDown, ChevronRight,
  Shield, CheckCircle2, Clock, Globe, Smartphone, Monitor, Tablet,
  MousePointer, ArrowUpRight,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Post   { id: string; headline: string | null; type: string; status: string; createdAt: string; }
interface Brand  { id: string; name: string; category: string; onboardingCompleted: boolean; createdAt: string; _count: { posts: number }; posts: Post[]; }
interface UserRow{ id: string; email: string; name: string | null; plan: string; createdAt: string; brands: Brand[]; }
interface Stats  { totalUsers: number; totalBrands: number; totalPosts: number; postsThisWeek: number; }

interface VisitorRow {
  id: string; createdAt: string; source: string; country: string | null;
  city: string | null; device: string | null; converted: boolean; utmCampaign: string | null;
}
interface VisitorStats {
  total: number; today: number; converted: number; conversionRate: number;
  bySource: { source: string; count: number }[];
  byCountry: { country: string; count: number }[];
  recent: VisitorRow[];
}

interface Props { users: UserRow[]; stats: Stats; visitorStats?: VisitorStats; }

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "text-[#F4A100] bg-[#F4A100]/10",
  SCHEDULED: "text-blue-400 bg-blue-400/10",
  SENT: "text-[#25D366] bg-[#25D366]/10",
  FAILED: "text-red-400 bg-red-400/10",
};

const TYPE_COLORS: Record<string, string> = {
  PRODUCT: "text-[#25D366]", TREND: "text-[#F4A100]", QUIZ: "text-purple-400",
  POLL: "text-blue-400", MEME: "text-orange-400", EVENT: "text-blue-300",
  EDUCATIONAL: "text-teal-400", STORY: "text-pink-400",
};

const SOURCE_EMOJI: Record<string, string> = {
  "product-hunt": "🦁", google: "🔍", twitter: "🐦", facebook: "📘",
  instagram: "📸", whatsapp: "💬", linkedin: "💼", youtube: "📺",
  reddit: "🔶", direct: "🔗",
};

function DeviceIcon({ d }: { d: string | null }) {
  if (d === "mobile")  return <Smartphone className="w-3.5 h-3.5 text-[#25D366]" />;
  if (d === "tablet")  return <Tablet      className="w-3.5 h-3.5 text-blue-400"  />;
  return                      <Monitor     className="w-3.5 h-3.5 text-[#8b8b9a]" />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminClient({ users, stats, visitorStats: rawVisitorStats }: Props) {
  const [tab, setTab] = useState<"users" | "visitors">("visitors");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Fallback so the component never crashes on missing visitor data
  const visitorStats: VisitorStats = rawVisitorStats ?? {
    total: 0, today: 0, converted: 0, conversionRate: 0,
    bySource: [], byCountry: [], recent: [],
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#F4A100]/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#F4A100]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Super Admin</h1>
          <p className="text-[#8b8b9a] text-sm">All activity across StatusCraft</p>
        </div>
      </motion.div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users"       value={stats.totalUsers}                    icon={Users}      accent="green" index={0} />
        <StatCard label="Total Brands"      value={stats.totalBrands}                   icon={Building2}  accent="gold"  index={1} />
        <StatCard label="Posts Generated"   value={stats.totalPosts.toLocaleString()}   icon={FileText}   accent="blue"  index={2} />
        <StatCard label="Website Visitors"  value={visitorStats.total.toLocaleString()} icon={Globe}      accent="green" index={3} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#141416] border border-white/[0.06] rounded-xl p-1 w-fit">
        {(["visitors", "users"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? "bg-white/[0.07] text-white" : "text-[#555562] hover:text-white"}`}>
            {t === "visitors" ? `🌐 Visitors` : `👥 Users (${stats.totalUsers})`}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── VISITORS TAB ─────────────────────────────────────────────────── */}
        {tab === "visitors" && (
          <motion.div key="visitors" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* Visitor stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Today", value: visitorStats.today,          color: "#25D366" },
                { label: "All time", value: visitorStats.total,       color: "#8b8b9a" },
                { label: "Signed up", value: visitorStats.converted,  color: "#F4A100" },
                { label: "Conversion", value: `${visitorStats.conversionRate}%`, color: "#7c3aed" },
              ].map(s => (
                <div key={s.label} className="bg-[#141416] border border-white/[0.06] rounded-2xl px-5 py-4">
                  <p className="text-xs text-[#555562] mb-1">{s.label}</p>
                  <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-5 mb-6">
              {/* By source */}
              <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5">
                <h3 className="text-sm font-semibold mb-4 text-[#8b8b9a] uppercase tracking-wide">Traffic sources (30 days)</h3>
                <div className="space-y-2.5">
                  {visitorStats.bySource.map(s => {
                    const pct = visitorStats.total > 0 ? Math.round((s.count / visitorStats.total) * 100) : 0;
                    return (
                      <div key={s.source}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-2">
                            <span>{SOURCE_EMOJI[s.source] ?? "🔗"}</span>
                            <span className="text-white capitalize">{s.source}</span>
                          </span>
                          <span className="text-[#8b8b9a] font-mono text-xs">{s.count} <span className="text-[#555562]">({pct}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.1 }}
                            className="h-full rounded-full bg-[#25D366]" />
                        </div>
                      </div>
                    );
                  })}
                  {visitorStats.bySource.length === 0 && <p className="text-[#555562] text-sm">No data yet.</p>}
                </div>
              </div>

              {/* By country */}
              <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5">
                <h3 className="text-sm font-semibold mb-4 text-[#8b8b9a] uppercase tracking-wide">Top countries (30 days)</h3>
                <div className="space-y-2.5">
                  {visitorStats.byCountry.map(c => {
                    const pct = visitorStats.total > 0 ? Math.round((c.count / visitorStats.total) * 100) : 0;
                    return (
                      <div key={c.country}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-white">{c.country}</span>
                          <span className="text-[#8b8b9a] font-mono text-xs">{c.count} <span className="text-[#555562]">({pct}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.1 }}
                            className="h-full rounded-full bg-blue-500" />
                        </div>
                      </div>
                    );
                  })}
                  {visitorStats.byCountry.length === 0 && <p className="text-[#555562] text-sm">No data yet.</p>}
                </div>
              </div>
            </div>

            {/* Recent visitors table */}
            <div className="bg-[#141416] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] text-xs font-semibold text-[#555562] uppercase tracking-wider
                grid grid-cols-[1fr_120px_120px_100px_80px_120px] gap-4">
                <div>Time</div><div>Source</div><div>Location</div><div>Device</div><div>Status</div><div>Campaign</div>
              </div>
              {visitorStats.recent.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-[#555562]">No visitors tracked yet. Deploy and visit the homepage!</div>
              )}
              {visitorStats.recent.map(v => (
                <div key={v.id}
                  className="grid grid-cols-[1fr_120px_120px_100px_80px_120px] gap-4 px-5 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors text-sm">
                  <div>
                    <p className="text-white text-xs">{format(new Date(v.createdAt), "MMM d · HH:mm")}</p>
                    <p className="text-[#555562] text-[10px]">{formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{SOURCE_EMOJI[v.source] ?? "🔗"}</span>
                    <span className="text-[#8b8b9a] capitalize truncate text-xs">{v.source}</span>
                  </div>
                  <div>
                    <p className="text-[#f0f0f2] text-xs truncate">{v.city ?? v.country ?? "—"}</p>
                    {v.city && v.country && <p className="text-[#555562] text-[10px]">{v.country}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DeviceIcon d={v.device} />
                    <span className="text-[#8b8b9a] text-xs capitalize">{v.device ?? "?"}</span>
                  </div>
                  <div>
                    {v.converted
                      ? <span className="text-[10px] font-bold bg-[#25D366]/15 text-[#25D366] px-2 py-0.5 rounded-full">Signed up</span>
                      : <span className="text-[10px] text-[#555562]">Browsed</span>}
                  </div>
                  <div>
                    <span className="text-[#555562] text-[10px] truncate">{v.utmCampaign ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Clarity tip */}
            <div className="mt-5 bg-[#0d0d0f] border border-white/[0.05] rounded-xl px-5 py-4 flex items-start gap-3">
              <MousePointer className="w-4 h-4 text-[#F4A100] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white mb-0.5">Add Microsoft Clarity for heatmaps &amp; session recordings</p>
                <p className="text-xs text-[#555562]">
                  Free tool. See exactly where visitors click, scroll, and drop off.{" "}
                  <a href="https://clarity.microsoft.com" target="_blank" rel="noopener noreferrer"
                    className="text-[#F4A100] hover:underline inline-flex items-center gap-0.5">
                    clarity.microsoft.com <ArrowUpRight className="w-3 h-3" />
                  </a>
                  {" "}→ Create project → Copy the snippet → Add it to{" "}
                  <code className="text-white bg-white/[0.06] px-1 rounded text-[10px]">src/app/layout.tsx</code>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── USERS TAB ────────────────────────────────────────────────────── */}
        {tab === "users" && (
          <motion.div key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-[#141416] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[1fr_180px_140px_100px_120px_120px] gap-4 px-5 py-3 border-b border-white/[0.06]
                text-xs font-semibold text-[#555562] uppercase tracking-wider">
                <div>User</div><div>Brand</div><div>Category</div><div>Posts</div><div>Onboarding</div><div>Joined</div>
              </div>

              {users.length === 0 && (
                <div className="px-5 py-12 text-center text-sm text-[#555562]">No users yet.</div>
              )}

              {users.map(user => {
                const brand = user.brands[0] ?? null;
                const totalUserPosts = user.brands.reduce((s, b) => s + b._count.posts, 0);
                const isExpanded = expandedUser === user.id;

                return (
                  <div key={user.id} className="border-b border-white/[0.04] last:border-0">
                    <button onClick={() => setExpandedUser(p => p === user.id ? null : user.id)}
                      className="w-full grid grid-cols-[1fr_180px_140px_100px_120px_120px] gap-4 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#25D366]">
                          {(user.name ?? user.email)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{user.email}</p>
                          {user.name && <p className="text-xs text-[#555562] truncate">{user.name}</p>}
                        </div>
                        {isExpanded
                          ? <ChevronDown  className="w-3.5 h-3.5 text-[#555562] flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                          : <ChevronRight className="w-3.5 h-3.5 text-[#555562] flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-[#f0f0f2] truncate">
                          {brand ? brand.name : <span className="text-[#555562] italic">No brand</span>}
                        </span>
                      </div>
                      <div className="flex items-center"><span className="text-sm text-[#8b8b9a] truncate">{brand?.category ?? "—"}</span></div>
                      <div className="flex items-center"><span className="text-sm font-mono font-semibold text-[#25D366]">{totalUserPosts}</span></div>
                      <div className="flex items-center">
                        {brand?.onboardingCompleted
                          ? <span className="flex items-center gap-1.5 text-xs text-[#25D366]"><CheckCircle2 className="w-3.5 h-3.5" />Complete</span>
                          : <span className="flex items-center gap-1.5 text-xs text-[#F4A100]"><Clock className="w-3.5 h-3.5" />Pending</span>}
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-[#555562]">{format(new Date(user.createdAt), "MMM d, yyyy")}</span>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <div className="px-5 pb-4">
                            {brand && brand.posts.length > 0 ? (
                              <div className="bg-[#0d0d0f] rounded-xl border border-white/[0.04] overflow-hidden">
                                <div className="grid grid-cols-[1fr_120px_100px_140px] gap-4 px-4 py-2.5 border-b border-white/[0.04]
                                  text-[10px] font-semibold text-[#555562] uppercase tracking-wider">
                                  <div>Post Title</div><div>Type</div><div>Status</div><div>Created</div>
                                </div>
                                {brand.posts.map(post => (
                                  <div key={post.id} className="grid grid-cols-[1fr_120px_100px_140px] gap-4 px-4 py-3 border-b border-white/[0.03] last:border-0">
                                    <p className="text-xs text-[#f0f0f2] truncate">{post.headline ?? "Untitled"}</p>
                                    <span className={`text-xs font-semibold ${TYPE_COLORS[post.type] ?? "text-[#8b8b9a]"}`}>{post.type}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${STATUS_COLORS[post.status] ?? "text-[#8b8b9a] bg-white/5"}`}>{post.status}</span>
                                    <span className="text-xs text-[#555562]">{format(new Date(post.createdAt), "MMM d · HH:mm")}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-[#555562] italic px-1">
                                {brand ? "No posts yet." : "No brand created yet."}
                              </p>
                            )}
                            {brand && brand._count.posts > 20 && (
                              <p className="text-xs text-[#555562] mt-2 pl-1">Showing 20 of {brand._count.posts} posts</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
