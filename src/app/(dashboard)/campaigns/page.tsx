"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
  Plus,
  Loader2,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { CAMPAIGN_TYPES, FREQUENCIES, TONALITIES } from "@/lib/constants";

const CAMPAIGN_TYPE_OPTIONS = [
  { id: "QUIZ", label: "Quiz Monday", desc: "Weekly trivia to engage your audience" },
  { id: "MEME", label: "Meme Friday", desc: "Trending memes relevant to your brand" },
  { id: "POLL", label: "This or That", desc: "Let customers vote on your products" },
  { id: "PRODUCT_SPOTLIGHT", label: "Product Spotlight", desc: "Showcase one product per post" },
  { id: "THIS_OR_THAT", label: "This vs That", desc: "Head-to-head product comparisons" },
  { id: "BTS", label: "Behind the Scenes", desc: "Show your process and team" },
  { id: "EDUCATIONAL_SERIES", label: "Edu Series", desc: "Teach something valuable each week" },
];

export default function CampaignsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  // Get first brand
  const { data: brands } = trpc.brand.list.useQuery();
  const brandId = selectedBrandId ?? brands?.[0]?.id ?? "";

  const { data: campaigns, refetch, isLoading } = trpc.campaign.list.useQuery(
    { brandId },
    { enabled: !!brandId }
  );

  const toggle = trpc.campaign.toggle.useMutation({ onSuccess: () => refetch() });

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-8"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="w-5 h-5 text-[#25D366]" />
            <h1 className="text-2xl font-bold">Campaigns</h1>
          </div>
          <p className="text-[#8b8b9a] text-sm">
            Recurring content series that run on autopilot
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Campaign
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#25D366]" />
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="grid gap-4">
          {(campaigns as any[]).map((campaign: any, i: number) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{campaign.name}</h3>
                    <Badge variant={campaign.isActive ? "green" : "outline"}>
                      {campaign.isActive ? "Active" : "Paused"}
                    </Badge>
                    <Badge variant="outline">{campaign.type}</Badge>
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-[#8b8b9a] mb-2">{campaign.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-[#555562] font-mono">
                    <span>{campaign.frequency}</span>
                    <span>·</span>
                    <span>{campaign.tonality}</span>
                    <span>·</span>
                    <span>{(campaign as any)._count?.posts ?? 0} posts generated</span>
                  </div>
                </div>
                <button
                  onClick={() =>
                    toggle.mutate({ id: campaign.id, isActive: !campaign.isActive })
                  }
                  className="flex-shrink-0"
                >
                  {campaign.isActive ? (
                    <ToggleRight className="w-8 h-8 text-[#25D366]" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-[#555562]" />
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <Megaphone className="w-10 h-10 text-[#555562] mb-3" />
          <p className="text-[#8b8b9a] mb-1">No campaigns yet</p>
          <p className="text-xs text-[#555562]">
            Create recurring content series like Quiz Monday or Meme Friday
          </p>
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && brandId && (
          <CreateCampaignModal
            brandId={brandId}
            onClose={() => setShowCreate(false)}
            onCreated={() => { setShowCreate(false); refetch(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateCampaignModal({
  brandId,
  onClose,
  onCreated,
}: {
  brandId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("QUIZ");
  const [frequency, setFrequency] = useState("WEEKLY");
  const [tonality, setTonality] = useState("WITTY");
  const [description, setDescription] = useState("");

  const create = trpc.campaign.create.useMutation({ onSuccess: onCreated });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">New Campaign</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-[#555562] hover:text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Campaign Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Meme Friday"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#25D366]/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {CAMPAIGN_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setType(opt.id)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    type === opt.id
                      ? "border-[#25D366] bg-[#25D366]/10"
                      : "border-white/[0.06] hover:border-white/[0.10]"
                  }`}
                >
                  <p className="font-semibold">{opt.label}</p>
                  <p className="text-[#8b8b9a] mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full bg-[#1a1a1d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm outline-none"
              >
                {["DAILY", "WEEKLY", "BIWEEKLY", "CUSTOM"].map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tonality</label>
              <select
                value={tonality}
                onChange={(e) => setTonality(e.target.value)}
                className="w-full bg-[#1a1a1d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm outline-none"
              >
                {["WITTY", "PREMIUM", "INFORMATIVE", "EMOTIONAL", "URGENT", "PLAYFUL"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              disabled={!name || create.isPending}
              onClick={() =>
                create.mutate({
                  brandId,
                  name,
                  type: type as any,
                  frequency: frequency as any,
                  tonality: tonality as any,
                  description: description || undefined,
                })
              }
            >
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Campaign"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
