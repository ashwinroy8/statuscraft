"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Loader2, Check, Sparkles, ChevronDown } from "lucide-react";

const CATEGORIES = [
  "Restaurant / Food & Drinks",
  "Sweet Shop / Bakery",
  "Salon & Beauty",
  "Retail / Kirana Store",
  "Clothing & Fashion",
  "Coaching / Education",
  "Medical / Pharmacy",
  "Jewellery",
  "Electronics & Gadgets",
  "Real Estate",
  "Fitness / Gym",
  "Other",
];

type Step = "phone" | "otp" | "business" | "generating" | "done";

interface Post { id: string; headline: string; bodyText: string; ctaText: string; emoji: string; }

const GENERATING_LINES = [
  "Analysing your business type…",
  "Checking today's trending topics…",
  "Writing your first 3 posts…",
  "Almost ready…",
];

export default function QuickSignup({ onClose }: { onClose: () => void }) {
  const [step, setStep]               = useState<Step>("phone");
  const [phone, setPhone]             = useState("");
  const [otp, setOtp]                 = useState(["","","","","",""]);
  const [bizName, setBizName]         = useState("");
  const [category, setCategory]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [posts, setPosts]             = useState<Post[]>([]);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [genLine, setGenLine]         = useState(0);
  const [shown, setShown]             = useState(0);

  const phoneRef = useRef<HTMLInputElement>(null);
  const bizRef   = useRef<HTMLInputElement>(null);
  const otpRefs  = useRef<(HTMLInputElement | null)[]>([]);

  // auto-focus on mount
  useEffect(() => { setTimeout(() => phoneRef.current?.focus(), 80); }, []);

  // cycle generating lines
  useEffect(() => {
    if (step !== "generating") return;
    const t = setInterval(() => setGenLine(l => Math.min(l + 1, GENERATING_LINES.length - 1)), 2200);
    return () => clearInterval(t);
  }, [step]);

  // stagger post cards
  useEffect(() => {
    if (step !== "done" || !posts.length) return;
    setShown(0);
    posts.forEach((_, i) => setTimeout(() => setShown(v => Math.max(v, i + 1)), 400 + i * 550));
  }, [step, posts]);

  // ── helpers ──────────────────────────────────────────────────────────────────
  const digits = (v: string) => v.replace(/\D/g, "");

  async function sendOtp() {
    const d = digits(phone);
    if (d.length < 10) { setError("Enter a valid 10-digit number"); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/auth/signup/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: d }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Couldn't send code");
      setStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function handleOtpKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  }

  function handleOtpChange(i: number, val: string) {
    const v = digits(val);
    if (!v) { const n=[...otp]; n[i]=""; setOtp(n); return; }
    // paste full code
    if (v.length === 6) {
      const n = v.split(""); setOtp(n);
      otpRefs.current[5]?.focus();
      setTimeout(() => proceedToBusiness(n.join("")), 60);
      return;
    }
    const n=[...otp]; n[i]=v.slice(-1); setOtp(n);
    if (i < 5) otpRefs.current[i+1]?.focus();
    const full = [...n].join("");
    if (full.length === 6 && !n.includes("")) setTimeout(() => proceedToBusiness(full), 60);
  }

  function proceedToBusiness(_code?: string) {
    // OTP is verified server-side in the complete step — just proceed
    setStep("business");
    setTimeout(() => bizRef.current?.focus(), 80);
  }

  async function complete() {
    if (!bizName.trim()) { setError("Enter your business name"); return; }
    if (!category)       { setError("Pick a category");          return; }
    setLoading(true); setError(""); setStep("generating"); setGenLine(0);
    try {
      const r = await fetch("/api/auth/signup/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits(phone), code: otp.join(""), businessName: bizName.trim(), category }),
      });
      const j = await r.json();
      if (!r.ok) { setStep("business"); throw new Error(j.error ?? "Something went wrong"); }
      setPosts(j.posts ?? []);
      setRedirectUrl(j.redirectUrl ?? "");
      setStep("done");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const progress = { phone: 20, otp: 45, business: 70, generating: 88, done: 100 }[step];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
      onClick={e => e.target === e.currentTarget && step !== "generating" && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
        className="relative w-full sm:max-w-md bg-[#0e0e10] border border-white/[0.07] rounded-t-3xl sm:rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 -8px 60px rgba(0,0,0,0.5), 0 0 60px rgba(37,211,102,0.06)" }}
      >
        {/* progress bar */}
        <div className="h-[2px] bg-white/[0.04]">
          <motion.div className="h-full bg-[#25D366]" animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
        </div>

        <div className="px-6 pt-5 pb-7">
          {/* header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#25D366] flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="text-sm font-bold text-[#25D366]">StatusCraft</span>
            </div>
            {step !== "generating" && (
              <button onClick={onClose} className="text-[#444] hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">

            {/* ── STEP 1: PHONE ─────────────────────────────────────────── */}
            {step === "phone" && (
              <motion.div key="phone" {...slide} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-extrabold mb-1">Start for free</h2>
                  <p className="text-[#6b6b7a] text-sm">We'll send a one-time code to your WhatsApp.</p>
                </div>

                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-sm text-[#6b6b7a] font-medium flex-shrink-0">
                    🇮🇳 +91
                  </div>
                  <input
                    ref={phoneRef} type="tel" inputMode="numeric"
                    value={phone} onChange={e => { setPhone(digits(e.target.value).slice(0,10)); setError(""); }}
                    placeholder="98765 43210"
                    className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-base outline-none focus:border-[#25D366]/60 transition-colors"
                    onKeyDown={e => e.key === "Enter" && sendOtp()}
                  />
                </div>

                {error && <p className="text-red-400 text-xs">{error}</p>}

                <button onClick={sendOtp} disabled={loading || phone.length < 10}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fbd5a] disabled:opacity-40 text-black font-bold py-3.5 rounded-xl text-[15px] transition-all hover:shadow-[0_0_24px_rgba(37,211,102,0.35)]">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Get code on WhatsApp <ArrowRight className="w-4 h-4" /></>}
                </button>

                <p className="text-center text-xs text-[#3a3a42]">No credit card · Free forever plan</p>
              </motion.div>
            )}

            {/* ── STEP 2: OTP ───────────────────────────────────────────── */}
            {step === "otp" && (
              <motion.div key="otp" {...slide} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-extrabold mb-1">Enter the code</h2>
                  <p className="text-[#6b6b7a] text-sm">Sent to +91 <span className="text-white font-medium">{phone}</span> on WhatsApp</p>
                </div>

                {/* 6-box OTP */}
                <div className="flex gap-2.5 justify-center">
                  {otp.map((d, i) => (
                    <input key={i} ref={el => { otpRefs.current[i] = el; }}
                      type="text" inputMode="numeric" maxLength={6}
                      value={d}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKey(i, e)}
                      className={`w-11 text-center text-xl font-bold bg-white/[0.04] border rounded-xl outline-none transition-all ${d ? "border-[#25D366]/60 text-white" : "border-white/[0.07] text-[#6b6b7a]"} focus:border-[#25D366]`}
                      style={{ height: "3.25rem" }}
                    />
                  ))}
                </div>

                {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                <div className="flex justify-between text-xs text-[#3a3a42]">
                  <button onClick={() => setStep("phone")} className="hover:text-white transition-colors">← Change number</button>
                  <button onClick={sendOtp} className="hover:text-[#25D366] transition-colors">Resend code</button>
                </div>

                <button onClick={() => proceedToBusiness()} disabled={otp.join("").length < 6}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fbd5a] disabled:opacity-40 text-black font-bold py-3.5 rounded-xl text-[15px] transition-all">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* ── STEP 3: BUSINESS ──────────────────────────────────────── */}
            {step === "business" && (
              <motion.div key="business" {...slide} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-extrabold mb-1">Your business</h2>
                  <p className="text-[#6b6b7a] text-sm">Two fields — that's all we need.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6b6b7a] mb-1.5">Business name</label>
                  <input ref={bizRef} type="text" value={bizName}
                    onChange={e => { setBizName(e.target.value); setError(""); }}
                    placeholder="e.g. Sharma Sweet Shop"
                    className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-base outline-none focus:border-[#25D366]/60 transition-colors"
                    onKeyDown={e => e.key === "Enter" && category && complete()}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6b6b7a] mb-1.5">Category</label>
                  <div className="relative">
                    <select value={category} onChange={e => { setCategory(e.target.value); setError(""); }}
                      className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-base outline-none focus:border-[#25D366]/60 transition-colors appearance-none cursor-pointer">
                      <option value="">Select type of business</option>
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#16161a]">{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444] pointer-events-none" />
                  </div>
                </div>

                {error && <p className="text-red-400 text-xs">{error}</p>}

                <button onClick={complete} disabled={loading || !bizName.trim() || !category}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fbd5a] disabled:opacity-40 text-black font-bold py-3.5 rounded-xl text-[15px] transition-all hover:shadow-[0_0_24px_rgba(37,211,102,0.35)]">
                  <Sparkles className="w-4 h-4" /> Create my first posts
                </button>
              </motion.div>
            )}

            {/* ── STEP 4: GENERATING ────────────────────────────────────── */}
            {step === "generating" && (
              <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center space-y-7">
                {/* spinner ring */}
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-[3px] border-white/[0.06]" />
                  <motion.div
                    className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#25D366]"
                    animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-3xl">✨</div>
                </div>

                <div>
                  <p className="text-lg font-bold text-white mb-2">AI is creating your posts</p>
                  <AnimatePresence mode="wait">
                    <motion.p key={genLine} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className="text-sm text-[#6b6b7a]">
                      {GENERATING_LINES[genLine]}
                    </motion.p>
                  </AnimatePresence>
                </div>

                {/* mini progress dots */}
                <div className="flex justify-center gap-2">
                  {GENERATING_LINES.map((_, i) => (
                    <motion.div key={i}
                      animate={{ background: i <= genLine ? "#25D366" : "rgba(255,255,255,0.08)" }}
                      transition={{ duration: 0.3 }}
                      className="w-2 h-2 rounded-full"
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── STEP 5: DONE ──────────────────────────────────────────── */}
            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* success header */}
                <div className="flex items-center gap-3 mb-1">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.4, delay: 0.1 }}
                    className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0"
                  >
                    <Check className="w-5 h-5 text-black" strokeWidth={3} />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-extrabold leading-tight">Your posts are ready!</h2>
                    <p className="text-[#6b6b7a] text-xs">Approve the ones you like</p>
                  </div>
                </div>

                {/* post cards */}
                <div className="space-y-3 max-h-[44vh] overflow-y-auto pr-0.5">
                  {posts.map((p, i) => (
                    <AnimatePresence key={p.id}>
                      {i < shown && (
                        <motion.div
                          initial={{ opacity: 0, y: 14, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: "spring", bounce: 0.28, duration: 0.45 }}
                          className="bg-[#141416] border border-white/[0.06] rounded-2xl p-4 flex gap-3"
                        >
                          <span className="text-2xl flex-shrink-0 mt-0.5">{p.emoji ?? "✨"}</span>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-white mb-1 leading-snug">{p.headline}</p>
                            <p className="text-xs text-[#6b6b7a] leading-relaxed line-clamp-2">{p.bodyText}</p>
                            <span className="inline-block mt-2 text-[10px] bg-[#25D366]/12 text-[#25D366] border border-[#25D366]/20 px-2.5 py-0.5 rounded-full font-semibold">
                              {p.ctaText}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  ))}
                </div>

                {/* CTA — appears after all posts shown */}
                {shown >= posts.length && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    className="space-y-2.5 pt-1">
                    <button
                      onClick={() => { if (redirectUrl) window.location.href = redirectUrl; }}
                      className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fbd5a] text-black font-bold py-3.5 rounded-xl text-[15px] transition-all hover:shadow-[0_0_24px_rgba(37,211,102,0.35)]"
                    >
                      Go to dashboard <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-center text-xs text-[#3a3a42]">
                      Also on WhatsApp — reply <span className="text-white font-medium">today</span> to see your posts anytime
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// shared slide transition
const slide = {
  initial: { opacity: 0, x: 18 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -18 },
  transition: { duration: 0.22 },
};
