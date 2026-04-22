"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Loader2,
  Check,
  RefreshCw,
  Upload,
  FileText,
  Palette,
  Users,
  MessageSquare,
} from "lucide-react";

interface Props {
  brand: any;
}

export default function BrandClient({ brand: initialBrand }: Props) {
  const [brand, setBrand] = useState(initialBrand);
  const [regenerating, setRegenerating] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = trpc.brand.update.useMutation({
    onSuccess: (data) => {
      setBrand(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  async function regenerateProfile() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/onboarding/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: brand.id }),
      });
      const data = await res.json();
      if (data.profile) {
        setBrand((prev: any) => ({
          ...prev,
          targetAudience: data.profile.targetAudience,
          usp: data.profile.usp,
          description: data.profile.positioningStatement,
          voicePersonality: data.profile.voicePersonality,
          competitors: data.profile.competitors,
        }));
      }
    } catch (e) {
      console.error(e);
    }
    setRegenerating(false);
  }

  const audience = brand.targetAudience as any;
  const voice = brand.voicePersonality as any;
  const colors = brand.colors as any;

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-[#25D366]" />
              <h1 className="text-2xl font-bold">{brand.name}</h1>
              <Badge variant="outline">{brand.category}</Badge>
            </div>
            <p className="text-[#8b8b9a] text-sm">Your brand intelligence profile</p>
          </div>
          <Button variant="secondary" onClick={regenerateProfile} disabled={regenerating}>
            {regenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Regenerate AI Profile
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-5">
        {/* Positioning */}
        <Section title="Brand Positioning" icon={Building2}>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-[#555562] font-mono uppercase tracking-wider mb-1">Positioning Statement</p>
              <p className="text-sm">{brand.description ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-[#555562] font-mono uppercase tracking-wider mb-1">USP</p>
              <p className="text-sm">{brand.usp ?? "—"}</p>
            </div>
            {brand.tagline && (
              <div>
                <p className="text-xs text-[#555562] font-mono uppercase tracking-wider mb-1">Tagline</p>
                <p className="text-sm italic">"{brand.tagline}"</p>
              </div>
            )}
          </div>
        </Section>

        {/* Target Audience */}
        {audience && (
          <Section title="Target Audience" icon={Users}>
            <div className="space-y-3">
              <p className="text-sm">{audience.description}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Age Range", audience.ageRange],
                  ["Gender", audience.gender],
                  ["Location", audience.location],
                  ["Income", audience.income],
                ].map(([label, value]) =>
                  value ? (
                    <div key={label} className="bg-white/[0.02] rounded-xl p-3">
                      <p className="text-xs text-[#555562] mb-0.5">{label}</p>
                      <p className="text-sm font-medium">{value}</p>
                    </div>
                  ) : null
                )}
              </div>
              {audience.interests && (
                <div>
                  <p className="text-xs text-[#555562] mb-2">Interests</p>
                  <div className="flex flex-wrap gap-1.5">
                    {audience.interests.map((i: string) => (
                      <Badge key={i} variant="outline">{i}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Voice & Tone */}
        {voice && (
          <Section title="Voice & Personality" icon={MessageSquare}>
            <div className="space-y-3">
              {voice.adjectives && (
                <div>
                  <p className="text-xs text-[#555562] mb-2">Personality</p>
                  <div className="flex flex-wrap gap-1.5">
                    {voice.adjectives.map((a: string) => (
                      <Badge key={a} variant="green">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {voice.samplePhrases && (
                <div>
                  <p className="text-xs text-[#555562] mb-2">Sample Phrases</p>
                  <div className="space-y-1.5">
                    {voice.samplePhrases.map((p: string, i: number) => (
                      <p key={i} className="text-xs bg-white/[0.02] rounded-lg px-3 py-2 italic text-[#8b8b9a]">
                        "{p}"
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Colors */}
        {colors && (
          <Section title="Brand Colors" icon={Palette}>
            <div className="flex gap-3">
              {Object.entries(colors).map(([key, value]) => (
                <div key={key} className="flex flex-col items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-xl border border-white/10"
                    style={{ backgroundColor: value as string }}
                  />
                  <p className="text-xs text-[#555562] capitalize">{key}</p>
                  <p className="text-xs font-mono text-[#8b8b9a]">{value as string}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Competitors */}
        {brand.competitors && brand.competitors.length > 0 && (
          <Section title="Competitors" icon={Building2}>
            <div className="flex flex-wrap gap-2">
              {brand.competitors.map((c: string) => (
                <Badge key={c} variant="outline">{c}</Badge>
              ))}
            </div>
          </Section>
        )}

        {/* Brochures */}
        {brand.brochures && brand.brochures.length > 0 && (
          <Section title="Uploaded Documents" icon={FileText}>
            <div className="space-y-2">
              {brand.brochures.map((b: any) => (
                <div key={b.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl">
                  <FileText className="w-4 h-4 text-[#555562]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{b.fileName}</p>
                    {b.processedAt && (
                      <p className="text-xs text-[#555562]">
                        Processed {new Date(b.processedAt).toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </div>
                  <Badge variant={b.extractedText ? "green" : "outline"}>
                    {b.extractedText ? "Extracted" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-[#25D366]" />
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}
