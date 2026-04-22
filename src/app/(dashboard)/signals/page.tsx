"use client";

import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Radio, RefreshCw, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const SIGNAL_COLORS: Record<string, { badge: any; dot: string }> = {
  TRENDING: { badge: "gold", dot: "bg-[#F4A100]" },
  EVENT: { badge: "blue", dot: "bg-blue-400" },
  HOLIDAY: { badge: "green", dot: "bg-[#25D366]" },
  CULTURAL: { badge: "default", dot: "bg-purple-400" },
  NEWS: { badge: "outline", dot: "bg-[#8b8b9a]" },
  WEATHER: { badge: "blue", dot: "bg-blue-300" },
  SPORTS: { badge: "gold", dot: "bg-orange-400" },
};

export default function SignalsPage() {
  const { data: signals, refetch, isLoading } = trpc.signal.list.useQuery({
    minRelevance: 0,
    limit: 50,
  });

  const [scanning, setScanning] = useState(false);

  async function rescan() {
    setScanning(true);
    await fetch("/api/cron/scan-signals", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_APP_URL}` },
    });
    await refetch();
    setScanning(false);
  }

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-8"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-5 h-5 text-[#F4A100]" />
            <h1 className="text-2xl font-bold">Signal Radar</h1>
            <Badge variant="gold">LIVE</Badge>
          </div>
          <p className="text-[#8b8b9a] text-sm">
            Current trends, events, and cultural moments to leverage in your
            content
          </p>
        </div>
        <Button variant="secondary" onClick={rescan} disabled={scanning}>
          {scanning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Scan Now
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#25D366]" />
        </div>
      ) : signals && signals.length > 0 ? (
        <div className="space-y-3">
          {(signals as any[]).map((signal: any, i: number) => {
            const colors = SIGNAL_COLORS[signal.type] ?? {
              badge: "outline",
              dot: "bg-[#555562]",
            };
            return (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.10] transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${colors.dot} ${
                      signal.relevanceScore >= 80 ? "animate-pulse" : ""
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <Badge variant={colors.badge}>{signal.type}</Badge>
                      <span className="text-xs font-mono text-[#555562]">
                        Relevance:{" "}
                        <span
                          className={
                            signal.relevanceScore >= 80
                              ? "text-[#25D366]"
                              : signal.relevanceScore >= 60
                              ? "text-[#F4A100]"
                              : "text-[#8b8b9a]"
                          }
                        >
                          {signal.relevanceScore}
                        </span>
                        /100
                      </span>
                      {signal.expiresAt && (
                        <span className="text-xs text-[#555562]">
                          Expires{" "}
                          {new Date(signal.expiresAt).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short" }
                          )}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm mb-1">
                      {signal.title}
                    </h3>
                    {signal.description && (
                      <p className="text-xs text-[#8b8b9a]">
                        {signal.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {signal.sourceUrl && (
                      <a
                        href={signal.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#555562] hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <Radio className="w-10 h-10 text-[#555562] mb-3" />
          <p className="text-[#8b8b9a]">No signals detected yet</p>
          <p className="text-xs text-[#555562] mt-1">
            Signals scan runs every 6 hours. Click Scan Now to run immediately.
          </p>
        </div>
      )}
    </div>
  );
}
