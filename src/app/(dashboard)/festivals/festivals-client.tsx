"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc/client";
import { Loader2, Sparkles, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  brandId: string;
}

const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "All"];
const REGIONS = ["Pan India", "North India", "South India", "West India", "East India"];

const RELIGION_MAP: Record<string, string> = {
  Hindu: "HINDU",
  Muslim: "MUSLIM",
  Christian: "CHRISTIAN",
  Sikh: "SIKH",
  Jain: "JAIN",
  Buddhist: "BUDDHIST",
  All: "ALL",
};

const REGION_MAP: Record<string, string> = {
  "Pan India": "ALL",
  "North India": "NORTH",
  "South India": "SOUTH",
  "West India": "WEST",
  "East India": "EAST",
};

function getCountdownBadge(daysUntil: number) {
  if (daysUntil === 0) {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#25D366]/15 text-[#25D366]">
        Today
      </span>
    );
  }
  if (daysUntil === 1) {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">
        Tomorrow
      </span>
    );
  }
  if (daysUntil <= 7) {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500">
        In {daysUntil} days
      </span>
    );
  }
  const weeks = Math.floor(daysUntil / 7);
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8b8b9a]">
      In {weeks === 1 ? "1 week" : `${weeks} weeks`}
    </span>
  );
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function groupByMonth(
  festivals: Array<{ name: string; date: Date | string; daysUntil: number; [key: string]: any }>
) {
  const groups: Record<string, typeof festivals> = {};
  for (const f of festivals) {
    const d = new Date(f.date);
    const key = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  }
  return groups;
}

function SkeletonCard() {
  return (
    <div className="bg-[#16161a] border border-[#2a2a35] rounded-2xl p-4 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="h-4 bg-white/[0.06] rounded w-40 mb-2" />
          <div className="h-3 bg-white/[0.04] rounded w-24 mb-3" />
          <div className="flex gap-2">
            <div className="h-5 bg-white/[0.04] rounded-full w-16" />
            <div className="h-5 bg-white/[0.04] rounded-full w-12" />
          </div>
        </div>
        <div className="h-8 bg-white/[0.04] rounded-xl w-28" />
      </div>
    </div>
  );
}

function FestivalCard({
  festival,
  onGenerate,
}: {
  festival: any;
  onGenerate: (id: string) => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const generate = trpc.festival.generate.useMutation({
    onMutate: () => setState("loading"),
    onSuccess: (data) => {
      setState("success");
      setTimeout(() => setState("idle"), 3000);
      onGenerate(festival.name);
    },
    onError: (err) => {
      setState("error");
      setErrorMsg(err.message);
      setTimeout(() => setState("idle"), 4000);
    },
  });

  const isAutoSoon = festival.daysUntil <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#16161a] border border-[#2a2a35] rounded-2xl p-4 hover:border-white/[0.10] transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Name + auto badge */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-sm">
              {festival.name}
              {festival.nameLocal && (
                <span className="text-[#555562] font-normal ml-1.5 text-xs">
                  {festival.nameLocal}
                </span>
              )}
            </h3>
            {isAutoSoon && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-[#25D366] bg-[#25D366]/10 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse inline-block" />
                Auto-generating soon
              </span>
            )}
          </div>

          {/* Date + countdown */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs text-[#8b8b9a]">{formatDate(festival.date)}</span>
            {getCountdownBadge(festival.daysUntil)}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {festival.type && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8b8b9a]">
                {festival.type.charAt(0) + festival.type.slice(1).toLowerCase()}
              </span>
            )}
            {festival.religion && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8b8b9a]">
                {festival.religion.charAt(0) + festival.religion.slice(1).toLowerCase()}
              </span>
            )}
            {festival.tier && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  festival.tier === "MAJOR"
                    ? "bg-[#25D366]/10 text-[#25D366]"
                    : festival.tier === "MEDIUM"
                    ? "bg-[#F4A100]/10 text-[#F4A100]"
                    : "bg-white/[0.04] text-[#555562]"
                }`}
              >
                {festival.tier.charAt(0) + festival.tier.slice(1).toLowerCase()}
              </span>
            )}
            {festival.regions?.includes("ALL") ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8b8b9a]">
                Pan India
              </span>
            ) : (
              festival.regions?.slice(0, 2).map((r: string) => (
                <span
                  key={r}
                  className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8b8b9a]"
                >
                  {r.replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Generate button */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <button
            onClick={() => generate.mutate({ festivalId: festival.name })}
            disabled={state === "loading" || state === "success"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              state === "success"
                ? "bg-[#25D366]/15 text-[#25D366] cursor-default"
                : state === "error"
                ? "bg-red-500/10 text-red-400 cursor-default"
                : state === "loading"
                ? "bg-[#25D366]/10 text-[#25D366]/60 cursor-not-allowed"
                : "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 hover:text-white"
            }`}
          >
            {state === "loading" ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating…
              </>
            ) : state === "success" ? (
              <>
                <Check className="w-3 h-3" />
                3 posts created!
              </>
            ) : state === "error" ? (
              <>Error</>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                Generate Posts
              </>
            )}
          </button>
          {state === "error" && (
            <p className="text-[10px] text-red-400 max-w-[140px] text-right">{errorMsg}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function FestivalsClient({ brandId }: Props) {
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [localReligions, setLocalReligions] = useState<string[]>([]);
  const [localRegions, setLocalRegions] = useState<string[]>([]);
  const [autoPost, setAutoPost] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  const { data: festivals, isLoading } = trpc.festival.upcoming.useQuery();
  const { data: prefs } = trpc.festival.getPreferences.useQuery();

  // Populate local state once prefs load
  useEffect(() => {
    if (prefs) {
      setLocalReligions(prefs.religions ?? []);
      setLocalRegions(prefs.regions ?? []);
      setAutoPost(prefs.autoPost ?? false);
    }
  }, [prefs]);

  const updatePrefs = trpc.festival.updatePreferences.useMutation({
    onSuccess: () => {
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2000);
    },
  });

  function toggleReligion(label: string) {
    const val = RELIGION_MAP[label];
    setLocalReligions((prev) =>
      prev.includes(val) ? prev.filter((r) => r !== val) : [...prev, val]
    );
  }

  function toggleRegion(label: string) {
    const val = REGION_MAP[label];
    setLocalRegions((prev) =>
      prev.includes(val) ? prev.filter((r) => r !== val) : [...prev, val]
    );
  }

  function savePreferences() {
    updatePrefs.mutate({
      religions: localReligions,
      regions: localRegions,
      autoPost,
    });
  }

  const grouped = festivals ? groupByMonth(festivals) : {};
  const monthKeys = Object.keys(grouped);

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold mb-1">🎉 Festival Engine</h1>
          <p className="text-[#8b8b9a] text-sm">
            Auto-generates posts before every Indian festival. Toggle what&apos;s relevant to your brand.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setPrefsOpen((v) => !v)}
          className="flex items-center gap-1.5"
        >
          Preferences
          {prefsOpen ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </Button>
      </motion.div>

      {/* Preferences Panel */}
      <AnimatePresence>
        {prefsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-[#16161a] border border-[#2a2a35] rounded-2xl p-5">
              {/* Religion filter */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-[#555562] uppercase tracking-wider mb-2.5">
                  Religion Filter
                </p>
                <div className="flex flex-wrap gap-2">
                  {RELIGIONS.map((r) => {
                    const val = RELIGION_MAP[r];
                    const active = localReligions.includes(val);
                    return (
                      <button
                        key={r}
                        onClick={() => toggleReligion(r)}
                        className={`text-xs px-3 py-1 rounded-full border transition-all ${
                          active
                            ? "bg-[#25D366]/15 border-[#25D366]/40 text-[#25D366]"
                            : "bg-white/[0.03] border-[#2a2a35] text-[#8b8b9a] hover:border-white/20"
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Region filter */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-[#555562] uppercase tracking-wider mb-2.5">
                  Region Filter
                </p>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map((r) => {
                    const val = REGION_MAP[r];
                    const active = localRegions.includes(val);
                    return (
                      <button
                        key={r}
                        onClick={() => toggleRegion(r)}
                        className={`text-xs px-3 py-1 rounded-full border transition-all ${
                          active
                            ? "bg-[#25D366]/15 border-[#25D366]/40 text-[#25D366]"
                            : "bg-white/[0.03] border-[#2a2a35] text-[#8b8b9a] hover:border-white/20"
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-generate toggle */}
              <div className="flex items-center justify-between py-3 border-t border-[#2a2a35] mb-4">
                <div>
                  <p className="text-sm font-medium">Auto-generate posts 3 days before festival</p>
                  <p className="text-xs text-[#555562] mt-0.5">
                    Automatically creates draft posts for upcoming festivals
                  </p>
                </div>
                <button
                  onClick={() => setAutoPost((v) => !v)}
                  className={`w-10 h-5.5 rounded-full transition-colors relative flex-shrink-0 ${
                    autoPost ? "bg-[#25D366]" : "bg-[#2a2a35]"
                  }`}
                  style={{ width: 40, height: 22 }}
                >
                  <span
                    className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                      autoPost ? "translate-x-[19px]" : "translate-x-[2px]"
                    }`}
                    style={{ width: 18, height: 18 }}
                  />
                </button>
              </div>

              {/* Save */}
              <button
                onClick={savePreferences}
                disabled={updatePrefs.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] text-black text-sm font-semibold hover:bg-[#20c05c] transition-colors disabled:opacity-60"
              >
                {updatePrefs.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving…
                  </>
                ) : prefsSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Saved!
                  </>
                ) : (
                  "Save Preferences"
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Festival list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !festivals || festivals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-[#8b8b9a]">No upcoming festivals in the next 60 days</p>
          <p className="text-xs text-[#555562] mt-1">
            Try adjusting your preferences to see more festivals
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {monthKeys.map((month) => (
            <div key={month}>
              <p className="text-xs font-semibold text-[#555562] uppercase tracking-wider mb-3">
                {month}
              </p>
              <div className="space-y-3">
                {grouped[month].map((festival, i) => (
                  <FestivalCard
                    key={`${festival.name}-${i}`}
                    festival={festival}
                    onGenerate={() => {}}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
