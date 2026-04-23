"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Loader2, UploadCloud, FileAudio, RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface VoicePost {
  id: string;
  headline: string;
  bodyText: string;
  ctaText: string;
  style: string;
}

interface VoicePostResult {
  transcription: string;
  language: string;
  posts: VoicePost[];
}

type State =
  | { phase: "idle" }
  | { phase: "processing"; message: string }
  | { phase: "result"; data: VoicePostResult }
  | { phase: "error"; message: string };

const STYLE_VARIANTS: Record<string, "gold" | "blue" | "green" | "outline"> = {
  "Bold and attention-grabbing": "gold",
  "Elegant and premium": "blue",
  "Fun and casual": "green",
};

function styleVariant(style: string): "gold" | "blue" | "green" | "outline" {
  for (const key of Object.keys(STYLE_VARIANTS)) {
    if (style.toLowerCase().includes(key.toLowerCase().split(" ")[0])) {
      return STYLE_VARIANTS[key];
    }
  }
  return "outline";
}

interface Props {
  brandId: string;
}

export default function VoiceClient({ brandId }: Props) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (processingMsgTimerRef.current) clearTimeout(processingMsgTimerRef.current);
    };
  }, []);

  function handleFileSelect(selected: File) {
    if (!selected.type.startsWith("audio/") && !selected.name.match(/\.(mp3|m4a|ogg|wav|webm|aac|flac)$/i)) {
      setState({ phase: "error", message: "Please upload an audio file (mp3, m4a, ogg, wav, webm)." });
      return;
    }
    setFile(selected);
    setState({ phase: "idle" });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  async function handleSubmit() {
    if (!file) return;

    setState({ phase: "processing", message: "Transcribing your voice note…" });

    // Switch message after 3 seconds
    processingMsgTimerRef.current = setTimeout(() => {
      setState((prev) => prev.phase === "processing" ? { phase: "processing", message: "Generating posts…" } : prev);
    }, 3000);

    try {
      const form = new FormData();
      form.append("audio", file);
      form.append("brandId", brandId);

      const res = await fetch("/api/voice-to-post", {
        method: "POST",
        body: form,
      });

      if (processingMsgTimerRef.current) {
        clearTimeout(processingMsgTimerRef.current);
        processingMsgTimerRef.current = null;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setState({ phase: "error", message: err.error ?? "Something went wrong. Please try again." });
        return;
      }

      const data: VoicePostResult = await res.json();
      setState({ phase: "result", data });
    } catch {
      if (processingMsgTimerRef.current) {
        clearTimeout(processingMsgTimerRef.current);
        processingMsgTimerRef.current = null;
      }
      setState({ phase: "error", message: "Network error. Please check your connection and try again." });
    }
  }

  function handleReset() {
    setFile(null);
    setState({ phase: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🎙️</span>
          <h1 className="text-2xl font-bold">Voice to Post</h1>
        </div>
        <p className="text-[#8b8b9a] text-sm">
          Record a voice note on your phone and upload it here, or record directly in your browser.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* IDLE / FILE SELECTED */}
        {(state.phase === "idle" || state.phase === "error") && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={[
                "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
                dragging
                  ? "border-[#25D366]/60 bg-[#25D366]/[0.04]"
                  : file
                  ? "border-[#25D366]/40 bg-[#25D366]/[0.03] hover:border-[#25D366]/60"
                  : "border-white/[0.10] bg-[#141416] hover:border-white/[0.20] hover:bg-white/[0.02]",
              ].join(" ")}
            >
              <input
                ref={inputRef}
                type="file"
                accept="audio/*,.mp3,.m4a,.ogg,.wav,.webm,.aac,.flac"
                className="hidden"
                onChange={handleInputChange}
              />
              {file ? (
                <>
                  <FileAudio className="w-10 h-10 text-[#25D366] mb-3" />
                  <p className="font-semibold text-white text-sm">{file.name}</p>
                  <p className="text-xs text-[#555562] mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB — click to change
                  </p>
                </>
              ) : (
                <>
                  <UploadCloud className="w-10 h-10 text-[#555562] mb-3" />
                  <p className="font-semibold text-white text-sm">Drop your audio file here</p>
                  <p className="text-xs text-[#8b8b9a] mt-1">or click to browse</p>
                  <p className="text-xs text-[#555562] mt-3">Supports mp3, m4a, ogg, wav, webm</p>
                </>
              )}
            </div>

            {/* Error message */}
            {state.phase === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{state.message}</p>
              </motion.div>
            )}

            {/* Submit button */}
            <div className="mt-5 flex justify-center">
              <Button
                variant="primary"
                size="lg"
                disabled={!file}
                onClick={handleSubmit}
                className="gap-2 px-8"
              >
                ✨ Create Posts
              </Button>
            </div>
          </motion.div>
        )}

        {/* PROCESSING */}
        {state.phase === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
            <AnimatePresence mode="wait">
              <motion.p
                key={state.message}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-sm text-[#8b8b9a]"
              >
                {state.message}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}

        {/* RESULT */}
        {state.phase === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Transcription */}
            <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📝</span>
                <span className="text-sm font-semibold text-[#8b8b9a]">We heard:</span>
                <Badge variant="outline" className="ml-auto">
                  {state.data.language}
                </Badge>
              </div>
              <p className="text-sm italic text-[#c8c8d4] leading-relaxed">
                "{state.data.transcription}"
              </p>
            </div>

            {/* Post cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {state.data.posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 flex flex-col hover:border-white/[0.12] transition-colors"
                >
                  <Badge variant={styleVariant(post.style)} className="self-start mb-3">
                    {post.style}
                  </Badge>
                  <h3 className="font-bold text-base leading-snug mb-2">{post.headline}</h3>
                  <p className="text-sm text-[#8b8b9a] leading-relaxed flex-1 mb-3">{post.bodyText}</p>
                  {post.ctaText && (
                    <p className="text-xs font-semibold text-[#25D366] mb-4">👉 {post.ctaText}</p>
                  )}
                  <Link
                    href={`/post/${post.id}`}
                    className="inline-flex items-center gap-1 text-xs text-[#8b8b9a] hover:text-white transition-colors border border-white/[0.08] hover:border-white/[0.18] rounded-xl px-3 py-2 justify-center"
                  >
                    View in Dashboard →
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Create another */}
            <div className="flex justify-center">
              <Button variant="secondary" size="md" onClick={handleReset} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Create Another
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
