"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Zap,
  LayoutDashboard,
  Calendar,
  Radio,
  Megaphone,
  BarChart2,
  Layers,
  Settings,
  Building2,
  LogOut,
  Shield,
  Package,
  Mic,
  Sparkles,
  Video,
  Wand2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const ADMIN_EMAIL = "ashwin@mobcast.in";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/signals", icon: Radio, label: "Signals", badge: "LIVE" },
  { href: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/brand", icon: Building2, label: "Brand" },
  { href: "/templates", icon: Layers, label: "Templates" },
  { href: "/products", icon: Package, label: "Products" },
  { href: "/studio", icon: Wand2, label: "Ad Studio", badge: "AI" },
  { href: "/voice", icon: Mic, label: "Voice to Post" },
  { href: "/festivals", icon: Sparkles, label: "Festivals" },
  { href: "/video", icon: Video, label: "Video Creator", badge: "NEW" },
];

const BOTTOM_ITEMS = [
  { href: "/settings", icon: Settings, label: "Settings" },
];

interface SidebarProps {
  userEmail?: string;
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const isAdmin = userEmail === ADMIN_EMAIL;

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-[220px] flex-shrink-0 border-r border-white/[0.04] bg-[#0d0d0f] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-black fill-black" />
          </div>
          <span className="font-bold text-sm tracking-tight">StatusCraft</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors relative group",
                isActive
                  ? "bg-white/[0.07] text-white"
                  : "text-[#8b8b9a] hover:text-white hover:bg-white/[0.04]"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-white/[0.07]"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-[#25D366]" : "text-[#555562] group-hover:text-[#8b8b9a]"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-bold font-mono bg-[#25D366]/15 text-[#25D366] px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-white/[0.04] pt-3">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                isActive
                  ? "bg-white/[0.07] text-white"
                  : "text-[#8b8b9a] hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0 text-[#555562]" />
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
              pathname === "/admin"
                ? "bg-[#F4A100]/10 text-[#F4A100]"
                : "text-[#8b8b9a] hover:text-[#F4A100] hover:bg-[#F4A100]/[0.06]"
            )}
          >
            <Shield className="w-4 h-4 flex-shrink-0 text-[#F4A100]" />
            Admin
          </Link>
        )}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#8b8b9a] hover:text-red-400 hover:bg-red-500/[0.06] transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
