"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format } from "date-fns";
import { BarChart2, TrendingUp, Eye, MessageSquare } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";

interface Props {
  brand: any;
  timeSeries: Array<{ date: string; views: number; replies: number; posts: number }>;
  typeStats: Record<string, { views: number; replies: number; count: number }>;
  posts: any[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1d] border border-white/[0.08] rounded-xl p-3 shadow-xl">
      <p className="text-xs text-[#8b8b9a] mb-2">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsClient({ brand, timeSeries, typeStats, posts }: Props) {
  const totalViews = timeSeries.reduce((s, d) => s + d.views, 0);
  const totalReplies = timeSeries.reduce((s, d) => s + d.replies, 0);
  const totalPosts = timeSeries.reduce((s, d) => s + d.posts, 0);

  const typeChartData = Object.entries(typeStats)
    .map(([type, stats]) => ({
      type,
      avgViews: stats.count > 0 ? Math.round(stats.views / stats.count) : 0,
      avgReplies: stats.count > 0 ? Math.round(stats.replies / stats.count) : 0,
      count: stats.count,
    }))
    .sort((a, b) => b.avgViews - a.avgViews);

  const formattedSeries = timeSeries.map((d) => ({
    ...d,
    date: format(new Date(d.date), "MMM d"),
  }));

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Analytics</h1>
        <p className="text-[#8b8b9a] text-sm">Last 30 days · {brand.name}</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total posts" value={totalPosts} icon={BarChart2} accent="green" index={0} />
        <StatCard label="Total views" value={totalViews.toLocaleString()} icon={Eye} accent="blue" index={1} />
        <StatCard label="Total replies" value={totalReplies} icon={MessageSquare} accent="gold" index={2} />
        <StatCard
          label="Reply rate"
          value={`${totalViews > 0 ? ((totalReplies / totalViews) * 100).toFixed(1) : 0}%`}
          icon={TrendingUp}
          accent="green"
          index={3}
        />
      </div>

      {/* Views over time */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6 mb-6"
      >
        <h2 className="text-sm font-semibold mb-6">Views & Replies Over Time</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={formattedSeries} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="views-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#25D366" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#25D366" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="replies-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F4A100" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#F4A100" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#555562" }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis tick={{ fontSize: 11, fill: "#555562" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="views" stroke="#25D366" fill="url(#views-grad)" strokeWidth={1.5} name="Views" />
            <Area type="monotone" dataKey="replies" stroke="#F4A100" fill="url(#replies-grad)" strokeWidth={1.5} name="Replies" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Performance by type */}
      {typeChartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6"
        >
          <h2 className="text-sm font-semibold mb-6">Average Views by Post Type</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeChartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="type" tick={{ fontSize: 11, fill: "#555562" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#555562" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgViews" fill="#25D366" opacity={0.8} radius={[4, 4, 0, 0]} name="Avg Views" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}
