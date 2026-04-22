"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Zap, Phone, Mail, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"options" | "phone" | "otp">("options");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function sendOtp() {
    setLoading(true);
    setError("");
    const formatted = phone.startsWith("+") ? phone : `+91${phone}`;
    const { error } = await supabase.auth.signInWithOtp({
      phone: formatted,
    });
    if (error) {
      setError(error.message);
    } else {
      setMode("otp");
    }
    setLoading(false);
  }

  async function verifyOtp() {
    setLoading(true);
    setError("");
    const formatted = phone.startsWith("+") ? phone : `+91${phone}`;
    const { error } = await supabase.auth.verifyOtp({
      phone: formatted,
      token: otp,
      type: "sms",
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#25D366]/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center">
              <Zap className="w-5 h-5 text-black fill-black" />
            </div>
            <span className="text-xl font-bold tracking-tight">StatusCraft</span>
          </div>
          <p className="text-[#8b8b9a] text-sm">
            Your AI-powered WhatsApp marketing engine
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6">
          {mode === "options" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <h2 className="text-lg font-semibold mb-4">Sign in to continue</h2>

              <button
                onClick={signInWithGoogle}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Continue with Google"
                )}
              </button>

              <div className="relative flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-xs text-[#555562]">or</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              <button
                onClick={() => setMode("phone")}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-sm font-medium transition-colors"
              >
                <Phone className="w-5 h-5 text-[#25D366]" />
                Continue with Phone (WhatsApp OTP)
              </button>
            </motion.div>
          )}

          {mode === "phone" && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <button
                  onClick={() => setMode("options")}
                  className="text-xs text-[#8b8b9a] hover:text-white mb-3 flex items-center gap-1 transition-colors"
                >
                  ← Back
                </button>
                <h2 className="text-lg font-semibold">Enter your number</h2>
                <p className="text-xs text-[#8b8b9a] mt-1">
                  We&apos;ll send you a one-time code
                </p>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-white/[0.04] border border-white/[0.06] rounded-xl text-sm text-[#8b8b9a]">
                  +91
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98765 43210"
                  className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#25D366]/50 transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                onClick={sendOtp}
                disabled={loading || phone.length < 10}
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Send OTP <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.div>
          )}

          {mode === "otp" && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <button
                  onClick={() => setMode("phone")}
                  className="text-xs text-[#8b8b9a] hover:text-white mb-3 flex items-center gap-1 transition-colors"
                >
                  ← Back
                </button>
                <h2 className="text-lg font-semibold">Enter OTP</h2>
                <p className="text-xs text-[#8b8b9a] mt-1">
                  Sent to +91 {phone}
                </p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#25D366]/50 transition-colors text-center tracking-widest text-lg font-mono"
                onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
              />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                onClick={verifyOtp}
                disabled={loading || otp.length < 6}
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Verify & Sign In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>

        <p className="text-center text-xs text-[#555562] mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
