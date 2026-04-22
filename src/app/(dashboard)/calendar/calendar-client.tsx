"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Props {
  brand: any;
  posts: any[];
}

const TYPE_DOT: Record<string, string> = {
  PRODUCT: "bg-blue-400",
  TREND: "bg-[#F4A100]",
  QUIZ: "bg-[#25D366]",
  POLL: "bg-[#25D366]",
  MEME: "bg-purple-400",
  EVENT: "bg-blue-300",
  EDUCATIONAL: "bg-[#8b8b9a]",
  STORY: "bg-pink-400",
};

const STATUS_RING: Record<string, string> = {
  DRAFT: "border-[#F4A100]/40",
  SCHEDULED: "border-blue-400/40",
  SENT: "border-[#25D366]/40",
  FAILED: "border-red-400/40",
};

export default function CalendarClient({ brand, posts }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad to start of week
  const startPad = getDay(monthStart); // 0 = Sunday
  const paddingDays = Array(startPad).fill(null);

  function getPostsForDay(day: Date) {
    return posts.filter((p) => p.scheduledAt && isSameDay(new Date(p.scheduledAt), day));
  }

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-5 h-5 text-[#25D366]" />
              <h1 className="text-2xl font-bold">Content Calendar</h1>
            </div>
            <p className="text-[#8b8b9a] text-sm">{brand.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs text-[#555562] font-mono py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map((_, i) => (
          <div key={`pad-${i}`} className="min-h-[90px] rounded-xl" />
        ))}
        {days.map((day, i) => {
          const dayPosts = getPostsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.01 }}
              className={`min-h-[90px] rounded-xl p-2 border transition-colors ${
                isToday
                  ? "border-[#25D366]/30 bg-[#25D366]/5"
                  : "border-white/[0.04] bg-[#141416] hover:border-white/[0.08]"
              }`}
            >
              <div
                className={`text-xs font-mono mb-2 w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday
                    ? "bg-[#25D366] text-black font-bold"
                    : "text-[#555562]"
                }`}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayPosts.slice(0, 3).map((post) => (
                  <Link key={post.id} href={`/post/${post.id}`}>
                    <div
                      className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md border ${
                        STATUS_RING[post.status] ?? "border-white/[0.06]"
                      } bg-white/[0.03] hover:bg-white/[0.06] transition-colors`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          TYPE_DOT[post.type] ?? "bg-[#555562]"
                        }`}
                      />
                      <span className="text-[10px] text-[#8b8b9a] truncate">
                        {post.headline ?? post.type}
                      </span>
                    </div>
                  </Link>
                ))}
                {dayPosts.length > 3 && (
                  <p className="text-[10px] text-[#555562] px-1">
                    +{dayPosts.length - 3} more
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 flex-wrap">
        {Object.entries(TYPE_DOT).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-xs text-[#555562]">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
