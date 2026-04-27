"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import Link from "next/link";
import {
  Zap, ArrowRight, Check, Star, Mic, Sparkles,
  Globe, ChevronDown, Play, Bot, ShoppingCart, BarChart2, Camera,
} from "lucide-react";
import QuickSignup from "@/components/signup/QuickSignup";

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED NUMBER
// ─────────────────────────────────────────────────────────────────────────────

function Count({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(to / 60);
    const id = setInterval(() => {
      start = Math.min(start + step, to);
      setVal(start);
      if (start >= to) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [inView, to]);

  return <span ref={ref}>{val.toLocaleString("en-IN")}{suffix}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHONE DEMO
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_POSTS = [
  {
    label: "Hindi",
    bg: "from-orange-500/10 to-transparent",
    border: "border-orange-500/20",
    dot: "#f97316",
    headline: "आज स्पेशल थाली — सिर्फ ₹120!",
    body: "गरमागरम खाना, घर जैसा स्वाद 🍛 आज ही आएं और मुँह में पानी लाने वाली थाली का आनंद लें!",
    cta: "अभी ऑर्डर करें",
  },
  {
    label: "Hinglish",
    bg: "from-green-500/10 to-transparent",
    border: "border-green-500/20",
    dot: "#25D366",
    headline: "Today's Special — Only ₹120!",
    body: "Ghar jaisa khaana, restaurant jaisi feeling ✨ Aaj hi try karo hamari special thali!",
    cta: "Order Now",
  },
  {
    label: "English",
    bg: "from-purple-500/10 to-transparent",
    border: "border-purple-500/20",
    dot: "#a855f7",
    headline: "Lunch Special — Just ₹120!",
    body: "Fresh, home-style cooking served hot 🔥 Join us today for our famous thali — limited seats!",
    cta: "Book a Table",
  },
];

function PhoneDemo() {
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState<"voice" | "generating" | "done">("voice");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("generating"), 1800);
    const t2 = setTimeout(() => setPhase("done"), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setInterval(() => setActive((a) => (a + 1) % DEMO_POSTS.length), 2800);
    return () => clearInterval(t);
  }, [phase]);

  const post = DEMO_POSTS[active];

  return (
    <div className="relative select-none" style={{ width: 280 }}>
      {/* Glow */}
      <div className="absolute inset-0 -z-10" style={{
        background: "radial-gradient(ellipse at 50% 50%, rgba(37,211,102,0.15) 0%, transparent 70%)",
        filter: "blur(40px)",
        transform: "scale(1.4)",
      }} />

      {/* Phone */}
      <div className="rounded-[2.8rem] border border-white/10 overflow-hidden shadow-2xl" style={{
        background: "#0c0c0e",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.7)",
      }}>
        {/* Notch */}
        <div className="flex justify-center py-3">
          <div className="w-24 h-5 rounded-full bg-black" />
        </div>

        <div className="px-4 pb-7 space-y-3" style={{ minHeight: 460 }}>

          {/* WhatsApp top bar */}
          <div className="flex items-center gap-2 py-1">
            <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center text-black font-bold text-[10px]">SC</div>
            <div>
              <p className="text-[11px] font-semibold text-white leading-none">StatusCraft AI</p>
              <p className="text-[9px] text-[#25D366] mt-0.5">● online</p>
            </div>
          </div>

          {/* Incoming voice bubble */}
          <div className="flex justify-end">
            <div className="bg-[#25D366]/15 border border-[#25D366]/25 rounded-2xl rounded-br-sm px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Mic className="w-3 h-3 text-[#25D366]" />
                {[3,5,4,6,3,5,4].map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-0.5 rounded-full bg-[#25D366]"
                    animate={{ height: phase === "voice" ? [`${h*2}px`, `${h*4}px`, `${h*2}px`] : `${h*2}px` }}
                    transition={{ duration: 0.7, repeat: phase === "voice" ? Infinity : 0, delay: i * 0.1 }}
                  />
                ))}
                <span className="text-[9px] text-[#8b8b9a]">0:09</span>
              </div>
            </div>
          </div>

          {/* AI response */}
          <AnimatePresence>
            {phase === "generating" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-white/[0.04] rounded-2xl rounded-bl-sm px-3 py-2.5"
              >
                <Loader />
                <span className="text-[10px] text-[#8b8b9a]">Creating 3 posts…</span>
              </motion.div>
            )}
          </AnimatePresence>

          {phase === "done" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/[0.03] rounded-2xl rounded-bl-sm px-3 py-2.5"
            >
              <p className="text-[10px] text-white font-medium mb-2">✅ 3 posts ready! Choose your language:</p>
              <div className="flex gap-1.5 mb-3">
                {DEMO_POSTS.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => setActive(i)}
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full transition-all"
                    style={{
                      background: i === active ? p.dot : "rgba(255,255,255,0.05)",
                      color: i === active ? "#000" : "#8b8b9a",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Post card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className={`rounded-xl border bg-gradient-to-b ${post.bg} ${post.border} p-3`}
                >
                  <p className="text-[11px] font-bold text-white mb-1">{post.headline}</p>
                  <p className="text-[9px] text-[#8b8b9a] leading-relaxed mb-2">{post.body}</p>
                  <span
                    className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full text-black"
                    style={{ background: post.dot }}
                  >
                    {post.cta}
                  </span>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* Reply from customer */}
          {phase === "done" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="space-y-2"
            >
              <div className="flex justify-end">
                <div className="bg-[#1a1a1f] rounded-xl rounded-tr-sm px-3 py-1.5 max-w-[80%]">
                  <p className="text-[9px] text-white">Bhai ek thali pack karke rakhna 🙏</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-[#25D366]/15 rounded-xl rounded-br-sm px-3 py-1.5">
                  <p className="text-[9px] text-white">Done! Aapka order confirm ✅</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Floating badges */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-8 top-20 bg-[#25D366] text-black text-[9px] font-bold px-2.5 py-1.5 rounded-xl shadow-lg whitespace-nowrap"
        style={{ boxShadow: "0 4px 20px rgba(37,211,102,0.45)" }}
      >
        ✅ Post approved!
      </motion.div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -left-10 bottom-28 bg-[#0f0f11] border border-white/10 text-[9px] px-2.5 py-1.5 rounded-xl shadow-lg whitespace-nowrap"
      >
        <span className="text-[#8b8b9a]">5 new replies </span>
        <span className="text-[#25D366] font-bold">→ orders</span>
      </motion.div>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1 h-1 rounded-full bg-[#25D366]"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGE SWITCHER DATA
// ─────────────────────────────────────────────────────────────────────────────

type Lang = "en" | "hi" | "ta" | "te" | "mr" | "bn" | "gu" | "kn" | "ml" | "pa";

const LANGS: Record<Lang, string> = {
  en: "English", hi: "हिंदी", ta: "தமிழ்", te: "తెలుగు",
  mr: "मराठी", bn: "বাংলা", gu: "ગુજરાતી", kn: "ಕನ್ನಡ", ml: "മലയാളം", pa: "ਪੰਜਾਬੀ",
};

const HERO: Record<Lang, { h1: string; h2: string; sub: string; cta: string }> = {
  en: {
    h1: "Your business, marketing itself.",
    h2: "On WhatsApp. In 30 seconds.",
    sub: "Send a voice note. Get 3 ready-to-post designs for your WhatsApp Status — written by AI, in Hindi, Hinglish, or English. No designer. No agency. Just results.",
    cta: "Start free — see posts in 90 seconds",
  },
  hi: {
    h1: "आपका व्यापार, खुद की मार्केटिंग।",
    h2: "WhatsApp पर। 30 सेकंड में।",
    sub: "Voice note भेजें। 3 posts तैयार मिलें — हिंदी, Hinglish, या अंग्रेजी में। कोई designer नहीं, कोई agency नहीं।",
    cta: "मुफ्त शुरू करें",
  },
  ta: {
    h1: "உங்கள் தொழில், தன்னை மார்க்கெட் செய்கிறது.",
    h2: "WhatsApp-ல். 30 நொடியில்.",
    sub: "Voice note அனுப்புங்கள். 3 posts தயாராகும் — தமிழ், Hinglish, ஆங்கிலத்தில்.",
    cta: "இலவசமாக தொடங்குங்கள்",
  },
  te: {
    h1: "మీ వ్యాపారం, స్వయంగా మార్కెటింగ్.",
    h2: "WhatsApp లో. 30 సెకన్లలో.",
    sub: "Voice note పంపండి. 3 posts రెడీగా వస్తాయి — తెలుగు, Hinglish, English లో.",
    cta: "ఉచితంగా ప్రారంభించండి",
  },
  mr: {
    h1: "तुमचा व्यवसाय, स्वतःचीच मार्केटिंग.",
    h2: "WhatsApp वर. 30 सेकंदात.",
    sub: "Voice note पाठवा. 3 posts तयार मिळतात — मराठी, Hinglish, इंग्रजीत.",
    cta: "मोफत सुरू करा",
  },
  bn: {
    h1: "আপনার ব্যবসা, নিজেই মার্কেটিং।",
    h2: "WhatsApp-এ। ৩০ সেকেন্ডে।",
    sub: "Voice note পাঠান। ৩টি পোস্ট রেডি — বাংলা, Hinglish, ইংরেজিতে।",
    cta: "বিনামূল্যে শুরু করুন",
  },
  gu: {
    h1: "તમારો ધંધો, પોતાની જ માર્કેટિંગ.",
    h2: "WhatsApp પર. 30 સેકન્ડમાં.",
    sub: "Voice note મોકલો. 3 posts તૈયાર — ગુજરાતી, Hinglish, અંગ્રેજીમાં.",
    cta: "મફતમાં શરૂ કરો",
  },
  kn: {
    h1: "ನಿಮ್ಮ ವ್ಯವಸಾಯ, ಸ್ವತಃ ಮಾರ್ಕೆಟಿಂಗ್.",
    h2: "WhatsApp ನಲ್ಲಿ. 30 ಸೆಕೆಂಡ್‌ನಲ್ಲಿ.",
    sub: "Voice note ಕಳುಹಿಸಿ. 3 posts ರೆಡಿ — ಕನ್ನಡ, Hinglish, ಇಂಗ್ಲೀಷ್‌ನಲ್ಲಿ.",
    cta: "ಉಚಿತವಾಗಿ ಪ್ರಾರಂಭಿಸಿ",
  },
  ml: {
    h1: "നിങ്ങളുടെ ബിസിനസ്, സ്വയം മാർക്കറ്റിംഗ്.",
    h2: "WhatsApp-ൽ. 30 സെക്കൻഡിൽ.",
    sub: "Voice note അയക്കൂ. 3 posts റെഡി — മലയാളം, Hinglish, ഇംഗ്ലീഷിൽ.",
    cta: "സൗജന്യമായി ആരംഭിക്കൂ",
  },
  pa: {
    h1: "ਤੁਹਾਡਾ ਕਾਰੋਬਾਰ, ਆਪਣੀ ਮਾਰਕੀਟਿੰਗ.",
    h2: "WhatsApp ਤੇ. 30 ਸਕਿੰਟਾਂ ਵਿੱਚ.",
    sub: "Voice note ਭੇਜੋ. 3 posts ਤਿਆਰ — ਪੰਜਾਬੀ, Hinglish, ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ.",
    cta: "ਮੁਫ਼ਤ ਸ਼ੁਰੂ ਕਰੋ",
  },
};

const REGION_LANG: Record<string, Lang> = {
  MH: "mr", TN: "ta", KA: "kn", KL: "ml", WB: "bn", AS: "bn",
  AP: "te", TS: "te", PB: "pa", GJ: "gu",
  UP: "hi", MP: "hi", RJ: "hi", BR: "hi", HR: "hi", DL: "hi",
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function Page() {
  const [lang, setLang] = useState<Lang>("en");
  const [langOpen, setLangOpen] = useState(false);
  const [signup, setSignup] = useState(false);
  const [langBanner, setLangBanner] = useState<Lang | null>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // ── Visitor tracking (fires once per session) ──────────────────────────────
  useEffect(() => {
    if (sessionStorage.getItem("sc_tracked")) return;
    sessionStorage.setItem("sc_tracked", "1");
    const params = new URLSearchParams(window.location.search);
    fetch("/api/track/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referrer:    document.referrer || null,
        utmSource:   params.get("utm_source"),
        utmMedium:   params.get("utm_medium"),
        utmCampaign: params.get("utm_campaign"),
      }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("sc_lang") as Lang | null;
    if (saved && LANGS[saved]) { setLang(saved); return; }
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(d => {
        const detected = REGION_LANG[d?.region_code] ?? null;
        if (detected) { setLang(detected); localStorage.setItem("sc_lang", detected); setLangBanner(detected); }
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const t = HERO[lang];

  return (
    <div className="min-h-screen bg-[#070709] text-white antialiased">
      <AnimatePresence>{signup && <QuickSignup onClose={() => setSignup(false)} />}</AnimatePresence>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#070709]/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#25D366] flex items-center justify-center">
              <Zap className="w-4 h-4 text-black fill-black" />
            </div>
            <span className="font-bold text-[15px] tracking-tight">StatusCraft</span>
          </div>

          <div className="hidden md:flex items-center gap-7 text-sm text-[#6b6b7a]">
            <a href="#works" className="hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Lang switcher */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(v => !v)}
                className="flex items-center gap-1.5 text-xs text-[#6b6b7a] hover:text-white border border-white/[0.07] px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{LANGS[lang]}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1 w-40 bg-[#111113] border border-white/[0.07] rounded-xl overflow-hidden shadow-2xl z-50"
                  >
                    {(Object.keys(LANGS) as Lang[]).map(l => (
                      <button
                        key={l}
                        onClick={() => { setLang(l); localStorage.setItem("sc_lang", l); setLangOpen(false); }}
                        className={`w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between hover:bg-white/[0.04] transition-colors ${lang === l ? "text-[#25D366]" : "text-[#6b6b7a]"}`}
                      >
                        {LANGS[l]}
                        {lang === l && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link href="/login" className="hidden sm:block text-sm text-[#6b6b7a] hover:text-white transition-colors">
              Log in
            </Link>
            <button
              onClick={() => setSignup(true)}
              className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1fbd5a] text-black font-semibold text-sm px-4 py-2 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(37,211,102,0.35)]"
            >
              Start free <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── LANGUAGE BANNER ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {langBanner && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm"
          >
            <div className="bg-[#111113] border border-white/[0.08] rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3">
              <Globe className="w-4 h-4 text-[#25D366] flex-shrink-0" />
              <p className="flex-1 text-sm">Showing in <span className="font-semibold text-white">{LANGS[langBanner]}</span></p>
              <button
                onClick={() => { setLang("en"); localStorage.setItem("sc_lang", "en"); setLangBanner(null); }}
                className="text-xs font-semibold text-[#25D366] bg-[#25D366]/10 px-3 py-1.5 rounded-lg"
              >
                Switch to English
              </button>
              <button onClick={() => setLangBanner(null)} className="text-[#555562] text-lg">×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 pt-20 pb-24 overflow-hidden">
        {/* background glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[700px] h-[500px]"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(37,211,102,0.12) 0%, transparent 65%)", filter: "blur(1px)" }} />

        <div className="grid lg:grid-cols-2 gap-14 items-center relative">
          {/* Left */}
          <div>
            {/* Product Hunt badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 border border-white/[0.07] bg-white/[0.03] text-xs text-[#6b6b7a] px-3 py-1.5 rounded-full mb-7"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
              Built for India's 63 million small businesses
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={lang}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-[2.75rem] sm:text-[3.25rem] font-extrabold leading-[1.08] tracking-tight mb-5">
                  <span className="text-white">{t.h1}</span>
                  <br />
                  <span style={{
                    background: "linear-gradient(95deg, #25D366 0%, #4ade80 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}>
                    {t.h2}
                  </span>
                </h1>

                <p className="text-[#6b6b7a] text-lg leading-relaxed mb-9 max-w-[440px]">
                  {t.sub}
                </p>

                <div className="flex flex-wrap gap-3 mb-8">
                  <button
                    onClick={() => setSignup(true)}
                    className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1fbd5a] text-black font-bold px-7 py-3.5 rounded-xl text-[15px] transition-all hover:shadow-[0_0_32px_rgba(37,211,102,0.4)]"
                  >
                    {t.cta} <ArrowRight className="w-4 h-4" />
                  </button>
                  <a
                    href="#works"
                    className="flex items-center gap-2 border border-white/[0.08] hover:border-white/[0.15] text-[#6b6b7a] hover:text-white font-semibold px-6 py-3.5 rounded-xl text-[15px] transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    See how it works
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#555562]">
                  {["No credit card", "Free forever plan", "11 Indian languages"].map((b, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#25D366]" /> {b}
                    </span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right — phone */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex justify-center lg:justify-end"
          >
            <PhoneDemo />
          </motion.div>
        </div>
      </section>

      {/* ── NUMBERS ─────────────────────────────────────────────────────── */}
      <div className="border-y border-white/[0.04] bg-[#0b0b0d]">
        <div className="max-w-5xl mx-auto px-5 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { n: 12000, s: "+", label: "businesses" },
            { n: 63, s: "M", label: "India SMB market" },
            { n: 40, s: "+", label: "festivals covered" },
            { n: 30, s: "s", label: "to create a post" },
          ].map(({ n, s, label }) => (
            <div key={label}>
              <p className="text-3xl font-extrabold text-white"><Count to={n} suffix={s} /></p>
              <p className="text-xs text-[#3d3d4a] mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── MARQUEE ─────────────────────────────────────────────────────── */}
      <div className="overflow-hidden border-b border-white/[0.04] py-4">
        <div className="flex">
          {[0, 1].map(c => (
            <motion.div
              key={c}
              className="flex gap-2.5 pr-2.5 flex-shrink-0"
              animate={{ x: ["0%", "-100%"] }}
              transition={{ duration: 28, ease: "linear", repeat: Infinity }}
            >
              {["Kirana Store","Restaurant","Boutique","Sweet Shop","Salon","Coaching Class","Bakery","Jeweller","Tailor","Pharmacy","Tea Stall","Printer"].map(b => (
                <span key={b+c} className="bg-white/[0.02] border border-white/[0.04] text-[#3d3d4a] text-xs px-3 py-1.5 rounded-full whitespace-nowrap">
                  {b}
                </span>
              ))}
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="works" className="max-w-5xl mx-auto px-5 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-bold tracking-widest text-[#25D366] uppercase mb-3">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
            Three steps. That's it.
          </h2>
          <p className="text-[#6b6b7a] max-w-xs mx-auto">
            No training, no setup, no design skills needed.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 relative">
          {/* connecting line */}
          <div className="hidden md:block absolute top-11 left-[calc(33%+12px)] right-[calc(33%+12px)] h-px"
            style={{ background: "linear-gradient(90deg, transparent, #25D366 50%, transparent)" }} />

          {[
            { icon: "🎙️", n: "01", color: "#f97316", title: "Speak your offer", desc: "Send a 10-second voice note on WhatsApp — in Hindi, Tamil, Gujarati, or English. Just talk naturally." },
            { icon: "✨", n: "02", color: "#25D366", title: "AI creates 3 posts", desc: "Claude AI writes the copy, generates the image, adds your logo and brand colours — all automatically." },
            { icon: "📲", n: "03", color: "#a855f7", title: "Approve & go live", desc: "Reply APPROVE on WhatsApp. Your Status goes live instantly. Customers start seeing it within seconds." },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="bg-[#0c0c0e] border border-white/[0.05] rounded-2xl p-7 text-center group hover:border-white/[0.1] transition-colors"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5 group-hover:scale-110 transition-transform"
                style={{ background: `${s.color}14`, border: `1px solid ${s.color}22` }}
              >
                {s.icon}
              </div>
              <span
                className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full inline-block mb-3"
                style={{ color: s.color, background: `${s.color}12`, border: `1px solid ${s.color}20` }}
              >
                STEP {s.n}
              </span>
              <h3 className="text-base font-bold mb-2">{s.title}</h3>
              <p className="text-sm text-[#555562] leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section id="features" className="bg-[#0b0b0d] border-y border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-5 py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-[#25D366] uppercase mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
              Everything you need to grow on WhatsApp
            </h2>
            <p className="text-[#6b6b7a] max-w-sm mx-auto">
              Built for how Indian small businesses actually work — not how Silicon Valley thinks they work.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { bg: "#25D366", icon: <Mic className="w-4 h-4 text-black" />, title: "Voice to Post", desc: "Speak in any language. Get 3 posts in 30 seconds. Works 100% inside WhatsApp." },
              { bg: "#f59e0b", icon: <span className="text-base">🎉</span>, title: "Festival Engine", desc: "Diwali, Eid, Pongal, IPL — 40+ events. Posts auto-create 3 days before so you never miss one." },
              { bg: "#7c3aed", icon: <Bot className="w-4 h-4 text-white" />, title: "WhatsApp Bot", desc: "Your AI marketing manager lives inside WhatsApp. Approve, edit, and post — without opening any app." },
              { bg: "#0ea5e9", icon: <Camera className="w-4 h-4 text-white" />, title: "AI Ad Studio", desc: "Photo your product. AI removes the background, creates a pro studio shot, and writes the caption." },
              { bg: "#f43f5e", icon: <ShoppingCart className="w-4 h-4 text-white" />, title: "Reply to Buy", desc: "Customer replies to your Status → bot collects order → sends Razorpay payment link. Automatic." },
              { bg: "#10b981", icon: <BarChart2 className="w-4 h-4 text-white" />, title: "Trend Posts", desc: "AI watches Bollywood, cricket, viral news — and creates posts linking your business to what's trending." },
            ].map(f => (
              <motion.div
                key={f.title}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.18 }}
                className="bg-[#0c0c0e] border border-white/[0.05] rounded-2xl p-6 hover:border-white/[0.09] transition-colors"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: f.bg }}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-[15px] mb-1.5">{f.title}</h3>
                <p className="text-sm text-[#555562] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-bold tracking-widest text-[#25D366] uppercase mb-3">Stories</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold">Real businesses. Real orders.</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { name: "Priya Sharma", biz: "Priya's Kitchen, Mumbai", quote: "Main bas bolti hoon 'aaj special thali ₹120' — aur 30 second mein 3 posts ready. Mujhe typing bhi nahi karni. Customers samajhte hain mera poora marketing team hai! 😄" },
            { name: "Ramesh Agarwal", biz: "Agarwal Sweets, Jaipur", quote: "Diwali posts automatically 3 din pehle ban gayi — logo, colours, sab kuch. I did nothing. 400+ orders that week from WhatsApp Status alone. Unbelievable." },
            { name: "Fatima Malik", biz: "Style Studio, Hyderabad", quote: "A customer replied to my Status. The bot collected her details and sent a payment link. By the time I woke up, the bridal booking was confirmed. I didn't even know!" },
          ].map(t => (
            <motion.div
              key={t.name}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.18 }}
              className="bg-[#0c0c0e] border border-white/[0.05] rounded-2xl p-6 hover:border-white/[0.09] transition-colors"
            >
              <div className="flex gap-0.5 mb-4">
                {[0,1,2,3,4].map(i => <Star key={i} className="w-3.5 h-3.5 text-[#f59e0b] fill-[#f59e0b]" />)}
              </div>
              <p className="text-[#8b8b9a] text-sm leading-relaxed mb-5">"{t.quote}"</p>
              <p className="font-semibold text-sm">{t.name}</p>
              <p className="text-xs text-[#3d3d4a] mt-0.5">{t.biz}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-[#0b0b0d] border-y border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-5 py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-[#25D366] uppercase mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">Start free. Grow at your own pace.</h2>
            <p className="text-[#6b6b7a]">No hidden fees. Cancel any time.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 items-start">
            {/* Starter */}
            <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-2xl p-6">
              <p className="text-sm text-[#6b6b7a] font-medium mb-1">Starter</p>
              <div className="flex items-end gap-1 mb-1"><span className="text-4xl font-extrabold">₹0</span></div>
              <p className="text-xs text-[#3d3d4a] mb-7">Free forever</p>
              <ul className="space-y-2.5 mb-8 text-sm">
                {["30 posts / month", "1 brand", "Voice to Post", "5 festival posts / month"].map(f => (
                  <li key={f} className="flex gap-2 text-[#6b6b7a]"><Check className="w-4 h-4 text-[#25D366] flex-shrink-0 mt-0.5" />{f}</li>
                ))}
                {["WhatsApp Bot", "Reply to Buy"].map(f => (
                  <li key={f} className="flex gap-2 text-[#2a2a32]"><span className="w-4 flex-shrink-0 text-center">—</span>{f}</li>
                ))}
              </ul>
              <button onClick={() => setSignup(true)} className="w-full py-2.5 text-sm font-semibold border border-white/[0.08] hover:border-white/[0.15] rounded-xl transition-colors">
                Start free
              </button>
            </div>

            {/* Pro */}
            <div className="bg-[#0c0c0e] border-2 border-[#25D366] rounded-2xl p-6 relative shadow-[0_0_40px_rgba(37,211,102,0.08)]">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#25D366] text-black text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most popular</span>
              <p className="text-sm text-[#25D366] font-medium mb-1">Pro</p>
              <div className="flex items-end gap-1 mb-1"><span className="text-4xl font-extrabold">₹999</span><span className="text-[#3d3d4a] text-sm mb-1.5">/mo</span></div>
              <p className="text-xs text-[#3d3d4a] mb-7">Cancel any time</p>
              <ul className="space-y-2.5 mb-8 text-sm">
                {["Unlimited posts", "1 brand", "Voice to Post", "All 40+ festivals", "WhatsApp Bot", "Reply to Buy", "AI Ad Studio", "Trend Intelligence"].map(f => (
                  <li key={f} className="flex gap-2 text-[#6b6b7a]"><Check className="w-4 h-4 text-[#25D366] flex-shrink-0 mt-0.5" />{f}</li>
                ))}
              </ul>
              <button onClick={() => setSignup(true)} className="w-full py-2.5 text-sm font-bold bg-[#25D366] hover:bg-[#1fbd5a] text-black rounded-xl transition-all hover:shadow-[0_0_20px_rgba(37,211,102,0.4)]">
                Start Pro trial
              </button>
            </div>

            {/* Agency */}
            <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-2xl p-6">
              <p className="text-sm text-[#6b6b7a] font-medium mb-1">Agency</p>
              <div className="flex items-end gap-1 mb-1"><span className="text-4xl font-extrabold">₹2,499</span><span className="text-[#3d3d4a] text-sm mb-1.5">/mo</span></div>
              <p className="text-xs text-[#3d3d4a] mb-7">For agencies & franchises</p>
              <ul className="space-y-2.5 mb-8 text-sm">
                {["Unlimited posts", "10 brands", "Everything in Pro", "Priority support", "Custom branding"].map(f => (
                  <li key={f} className="flex gap-2 text-[#6b6b7a]"><Check className="w-4 h-4 text-[#25D366] flex-shrink-0 mt-0.5" />{f}</li>
                ))}
              </ul>
              <Link href="/login" className="block w-full py-2.5 text-sm font-semibold border border-white/[0.08] hover:border-white/[0.15] rounded-xl transition-colors text-center">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-28 text-center relative">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(37,211,102,0.07) 0%, transparent 60%)" }} />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          <p className="text-xs font-bold tracking-widest text-[#25D366] uppercase mb-4">Get started today</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
            Your first 3 posts,{" "}
            <span style={{ background: "linear-gradient(95deg, #25D366, #4ade80)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              in 90 seconds.
            </span>
          </h2>
          <p className="text-[#6b6b7a] text-lg mb-10 max-w-md mx-auto">
            Sign up with your phone. See your posts. No designer, no agency, no waiting.
          </p>
          <button
            onClick={() => setSignup(true)}
            className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1fbd5a] text-black font-bold px-10 py-4 rounded-2xl text-lg transition-all hover:shadow-[0_0_48px_rgba(37,211,102,0.45)]"
          >
            Start free — no credit card <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-[#3d3d4a] text-sm mt-4">
            12,000+ Indian businesses already using StatusCraft
          </p>
        </motion.div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-5 py-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#25D366] flex items-center justify-center">
              <Zap className="w-3 h-3 text-black fill-black" />
            </div>
            <span className="text-sm font-bold">StatusCraft</span>
            <span className="text-[#2a2a32] text-xs ml-2">© 2025</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#3d3d4a]">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
            <span>Made with ❤️ in India</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
