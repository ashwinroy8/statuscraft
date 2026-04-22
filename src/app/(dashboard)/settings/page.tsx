"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, MessageCircle, Bell, Clock, Loader2, Check } from "lucide-react";
import { formatTime } from "@/lib/utils";

const POST_TIMES = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00",
];

export default function SettingsPage() {
  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const update = trpc.settings.update.useMutation();

  const [autoApprove, setAutoApprove] = useState(false);
  const [maxPosts, setMaxPosts] = useState(3);
  const [postTimes, setPostTimes] = useState<string[]>(["08:00", "12:00", "18:00"]);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setAutoApprove(settings.autoApprove);
      setMaxPosts(settings.maxPostsPerDay);
      setTimezone(settings.timezone);
      const times = settings.preferredPostTimes;
      if (Array.isArray(times)) setPostTimes(times as string[]);
    }
  }, [settings]);

  async function handleSave() {
    await update.mutateAsync({
      autoApprove,
      maxPostsPerDay: maxPosts,
      preferredPostTimes: postTimes,
      timezone,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-[#25D366]" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[700px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-[#25D366]" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <p className="text-[#8b8b9a] text-sm">Manage your posting schedule and preferences</p>
      </motion.div>

      <div className="space-y-5">
        {/* WhatsApp Connection */}
        <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-4 h-4 text-[#25D366]" />
            <h2 className="font-semibold">WhatsApp Business</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8b8b9a]">
                {settings?.whatsappConnected
                  ? `Connected · Phone ID: ${settings.whatsappBusinessPhoneId ?? "—"}`
                  : "Not connected"}
              </p>
            </div>
            <Badge variant={settings?.whatsappConnected ? "green" : "outline"}>
              {settings?.whatsappConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          {!settings?.whatsappConnected && (
            <Button variant="secondary" size="sm" className="mt-3">
              Connect WhatsApp Business API
            </Button>
          )}
        </div>

        {/* Posting Schedule */}
        <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[#25D366]" />
            <h2 className="font-semibold">Posting Schedule</h2>
          </div>

          <div className="mb-5">
            <p className="text-sm font-medium mb-2">
              Preferred Post Times{" "}
              <span className="text-[#555562] font-normal">(up to 3)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {POST_TIMES.map((time) => {
                const selected = postTimes.includes(time);
                return (
                  <button
                    key={time}
                    onClick={() => {
                      if (selected) {
                        setPostTimes(postTimes.filter((t) => t !== time));
                      } else if (postTimes.length < 3) {
                        setPostTimes([...postTimes, time].sort());
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      selected
                        ? "bg-[#25D366] text-black font-bold"
                        : "bg-white/[0.04] text-[#8b8b9a] hover:bg-white/[0.08]"
                    }`}
                  >
                    {formatTime(time)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Max Posts/Day</label>
              <select
                value={maxPosts}
                onChange={(e) => setMaxPosts(Number(e.target.value))}
                className="w-full bg-[#1a1a1d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm outline-none"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} post{n > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-[#1a1a1d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm outline-none"
              >
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="Asia/Dubai">Dubai (GST)</option>
                <option value="America/New_York">New York (EST)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Asia/Singapore">Singapore (SGT)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Auto-approve */}
        <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold mb-1">Auto-approve posts</h2>
              <p className="text-sm text-[#8b8b9a]">
                Automatically schedule AI-generated posts without manual review.
                Only enable if you trust the output.
              </p>
            </div>
            <button
              onClick={() => setAutoApprove(!autoApprove)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${
                autoApprove ? "bg-[#25D366]" : "bg-white/[0.10]"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  autoApprove ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Save */}
        <Button variant="primary" size="lg" onClick={handleSave} disabled={update.isPending} className="w-full">
          {update.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <>
              <Check className="w-4 h-4" /> Saved!
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>
    </div>
  );
}
