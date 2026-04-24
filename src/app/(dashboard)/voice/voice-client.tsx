"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Loader2, UploadCloud, FileAudio, RefreshCw, AlertCircle, Mic, Square, Play, Pause } from "lucide-react";
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

type RecordingState = "idle" | "recording" | "recorded";

function styleVariant(style: string): "gold" | "blue" | "green" | "outline" {
  const s = style.toLowerCase();
  if (s.includes("bold") || s.includes("attention")) return "gold";
  if (s.includes("elegant") || s.includes("premium")) return "blue";
  if (s.includes("fun") || s.includes("casual")) return "green";
  return "outline";
}

interface Props {
  brandId: string;
}

export default function VoiceClient({ brandId }: Props) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"record" | "upload">("record");

  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const processingMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (processingMsgTimerRef.current) clearTimeout(processingMsgTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // ── Recording ──────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const recordedFile = new File([blob], `recording.${ext}`, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setFile(recordedFile);
        setRecordingState("recorded");
        if (timerRef.current) clearInterval(timerRef.current);
      };

      mr.start(250);
      setRecordingState("recording");
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      setState({ phase: "error", message: "Microphone access denied. Please allow microphone access and try again." });
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const togglePlayback = useCallback(() => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  const discardRecording = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setFile(null);
    setRecordingState("idle");
    setRecordingSeconds(0);
    setIsPlaying(false);
    setState({ phase: "idle" });
  }, [audioUrl]);

  // ── Upload ─────────────────────────────────────────────────────────────────
  function handleFileSelect(selected: File) {
    if (!selected.type.startsWith("audio/") && !selected.name.match(/\.(mp3|m4a|ogg|wav|webm|aac|flac)$/i)) {
      setState({ phase: "error", message: "Please upload an audio file (mp3, m4a, ogg, wav, webm, aac)." });
      return;
    }
    setFile(selected);
    setState({ phase: "idle" });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!file) return;
    setState({ phase: "processing", message: "Transcribing your voice note…" });
    processingMsgTimerRef.current = setTimeout(() => {
      setState((prev) => prev.phase === "processing" ? { phase: "processing", message: "Generating posts…" } : prev);
    }, 3000);

    try {
      const form = new FormData();
      form.append("audio", file);
      form.append("brandId", brandId);

      const res = await fetch("/api/voice-to-post", { method: "POST", body: form });
      if (processingMsgTimerRef.current) { clearTimeout(processingMsgTimerRef.current); processingMsgTimerRef.current = null; }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setState({ phase: "error", message: err.error ?? "Something went wrong. Please try again." });
        return;
      }

      const data: VoicePostResult = await res.json();
      setState({ phase: "result", data });
    } catch {
      if (processingMsgTimerRef.current) { clearTimeout(processingMsgTimerRef.current); processingMsgTimerRef.current = null; }
      setState({ phase: "error", message: "Network error. Please check your connection and try again." });
    }
  }

  function handleReset() {
    discardRecording();
    setFile(null);
    setState({ phase: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🎙️</span>
          <h1 className="text-2xl font-bold">Voice to Post</h1>
        </div>
        <p className="text-[#8b8b9a] text-sm">
          Speak your offer in Hindi, Hinglish, or English — get 3 ready-to-post creatives in 30 seconds.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {(state.phase === "idle" || state.phase === "error") && (
          <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>

            {/* Tabs */}
            <div className="flex gap-1 bg-[#141416] border border-white/[0.06] rounded-xl p-1 mb-6 w-fit">
              {(["record", "upload"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); handleReset(); }}
                  className={[
                    "px-5 py-2 rounded-lg text-sm font-medium transition-all",
                    activeTab === tab
                      ? "bg-[#25D366] text-black"
                      : "text-[#8b8b9a] hover:text-white",
                  ].join(" ")}
                >
                  {tab === "record" ? "🎙️ Record" : "📁 Upload"}
                </button>
              ))}
            </div>

            {/* RECORD TAB */}
            {activeTab === "record" && (
              <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-8 flex flex-col items-center gap-6">
                {recordingState === "idle" && (
                  <>
                    <div className="w-20 h-20 rounded-full bg-[#25D366]/10 border-2 border-[#25D366]/20 flex items-center justify-center">
                      <Mic className="w-8 h-8 text-[#25D366]" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-white mb-1">Ready to record</p>
                      <p className="text-sm text-[#8b8b9a]">Click the button and speak your offer naturally</p>
                    </div>
                    <button
                      onClick={startRecording}
                      className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-bold px-8 py-3 rounded-2xl transition-colors"
                    >
                      <Mic className="w-4 h-4" /> Start Recording
                    </button>
                  </>
                )}

                {recordingState === "recording" && (
                  <>
                    {/* Pulsing mic */}
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                      <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center relative">
                        <Mic className="w-8 h-8 text-red-400" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-white text-2xl font-mono">{formatTime(recordingSeconds)}</p>
                      <p className="text-sm text-red-400 mt-1">Recording…</p>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-3 rounded-2xl transition-colors"
                    >
                      <Square className="w-4 h-4 fill-white" /> Stop
                    </button>
                  </>
                )}

                {recordingState === "recorded" && (
                  <>
                    <div className="w-20 h-20 rounded-full bg-[#25D366]/10 border-2 border-[#25D366]/30 flex items-center justify-center">
                      <Mic className="w-8 h-8 text-[#25D366]" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-white mb-1">Recording ready</p>
                      <p className="text-sm text-[#8b8b9a]">{formatTime(recordingSeconds)} recorded</p>
                    </div>
                    {/* Playback */}
                    <button
                      onClick={togglePlayback}
                      className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] px-5 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isPlaying ? "Pause" : "Play back"}
                    </button>
                    <div className="flex gap-3">
                      <button
                        onClick={discardRecording}
                        className="px-5 py-2 rounded-xl text-sm font-medium text-[#8b8b9a] hover:text-white border border-white/[0.08] hover:border-white/[0.18] transition-colors"
                      >
                        Discard
                      </button>
                      <button
                        onClick={handleSubmit}
                        className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-bold px-8 py-2.5 rounded-xl transition-colors"
                      >
                        ✨ Create Posts
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* UPLOAD TAB */}
            {activeTab === "upload" && (
              <>
                <div
                  onClick={() => inputRef.current?.click()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f); }}
                  onDragOver={(e) => e.preventDefault()}
                  className={[
                    "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
                    file
                      ? "border-[#25D366]/40 bg-[#25D366]/[0.03] hover:border-[#25D366]/60"
                      : "border-white/[0.10] bg-[#141416] hover:border-white/[0.20] hover:bg-white/[0.02]",
                  ].join(" ")}
                >
                  <input ref={inputRef} type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav,.webm,.aac,.flac" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                  {file ? (
                    <>
                      <FileAudio className="w-10 h-10 text-[#25D366] mb-3" />
                      <p className="font-semibold text-white text-sm">{file.name}</p>
                      <p className="text-xs text-[#555562] mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB — click to change</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-10 h-10 text-[#555562] mb-3" />
                      <p className="font-semibold text-white text-sm">Drop your audio file here</p>
                      <p className="text-xs text-[#8b8b9a] mt-1">or click to browse</p>
                      <p className="text-xs text-[#555562] mt-3">mp3, m4a, ogg, wav, webm, aac</p>
                    </>
                  )}
                </div>
                <div className="mt-5 flex justify-center">
                  <Button variant="primary" size="lg" disabled={!file} onClick={handleSubmit} className="gap-2 px-8">
                    ✨ Create Posts
                  </Button>
                </div>
              </>
            )}

            {/* Error */}
            {state.phase === "error" && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{state.message}</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* PROCESSING */}
        {state.phase === "processing" && (
          <motion.div key="processing" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
            <AnimatePresence mode="wait">
              <motion.p key={state.message} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-sm text-[#8b8b9a]">
                {state.message}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}

        {/* RESULT */}
        {state.phase === "result" && (
          <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📝</span>
                <span className="text-sm font-semibold text-[#8b8b9a]">We heard:</span>
                <Badge variant="outline" className="ml-auto">{state.data.language}</Badge>
              </div>
              <p className="text-sm italic text-[#c8c8d4] leading-relaxed">"{state.data.transcription}"</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {state.data.posts.map((post, i) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 flex flex-col hover:border-white/[0.12] transition-colors">
                  <Badge variant={styleVariant(post.style)} className="self-start mb-3">{post.style}</Badge>
                  <h3 className="font-bold text-base leading-snug mb-2">{post.headline}</h3>
                  <p className="text-sm text-[#8b8b9a] leading-relaxed flex-1 mb-3">{post.bodyText}</p>
                  {post.ctaText && <p className="text-xs font-semibold text-[#25D366] mb-4">👉 {post.ctaText}</p>}
                  <Link href={`/post/${post.id}`} className="inline-flex items-center gap-1 text-xs text-[#8b8b9a] hover:text-white transition-colors border border-white/[0.08] hover:border-white/[0.18] rounded-xl px-3 py-2 justify-center">
                    View in Dashboard →
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="flex justify-center">
              <Button variant="secondary" size="md" onClick={handleReset} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Create Another
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
