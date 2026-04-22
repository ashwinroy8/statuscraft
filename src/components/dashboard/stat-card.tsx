"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  icon: LucideIcon;
  accent?: "green" | "gold" | "blue";
  index?: number;
}

const accents = {
  green: {
    icon: "text-[#25D366]",
    bg: "bg-[#25D366]/10",
    change: "text-[#25D366]",
  },
  gold: {
    icon: "text-[#F4A100]",
    bg: "bg-[#F4A100]/10",
    change: "text-[#F4A100]",
  },
  blue: {
    icon: "text-blue-400",
    bg: "bg-blue-400/10",
    change: "text-blue-400",
  },
};

export function StatCard({
  label,
  value,
  change,
  positive,
  icon: Icon,
  accent = "green",
  index = 0,
}: StatCardProps) {
  const colors = accents[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.bg)}>
          <Icon className={cn("w-5 h-5", colors.icon)} />
        </div>
        {change && (
          <span
            className={cn(
              "text-xs font-mono font-semibold",
              positive ? colors.change : "text-red-400"
            )}
          >
            {positive ? "+" : ""}{change}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-[#8b8b9a] mt-0.5">{label}</div>
    </motion.div>
  );
}
