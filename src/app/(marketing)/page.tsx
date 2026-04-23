"use client";
import Link from "next/link";
import {
  Zap,
  Mic,
  Bot,
  ShoppingCart,
  Sparkles,
  BarChart2,
  Check,
  ArrowRight,
  Star,
} from "lucide-react";

export default function LandingPage() {

  return (
    <div
      className="min-h-screen bg-[#0d0d0f] text-white"
      style={{ scrollBehavior: "smooth" }}
    >
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-[#2a2a35] bg-[#0d0d0f]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-black fill-black" />
            </div>
            <span className="text-lg font-bold tracking-tight">StatusCraft</span>
          </div>

          {/* Right nav */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/login"
              className="text-sm text-[#8b8b9a] hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1aab52] text-black font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
            >
              Start Free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: copy */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#16161a] border border-[#2a2a35] text-sm text-[#8b8b9a] px-3 py-1.5 rounded-full mb-6">
              <span>🤖</span>
              <span>Powered by Claude AI</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-tight tracking-tight mb-5">
              Your business speaks.
              <br />
              We turn it into
              <br />
              <span className="text-[#25D366]">WhatsApp Status posts.</span>
            </h1>

            <p className="text-[#8b8b9a] text-lg leading-relaxed mb-8 max-w-md">
              Send a 10-second voice note. Get 3 stunning posts — in Hindi,
              Hinglish, or English — ready to go live. India&apos;s small
              businesses deserve marketing that works like they do.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-bold px-6 py-3.5 rounded-xl text-base transition-colors"
              >
                Start for free <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 border border-[#2a2a35] hover:border-[#3a3a45] text-white font-semibold px-6 py-3.5 rounded-xl text-base transition-colors"
              >
                Watch how it works
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#8b8b9a]">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#25D366]" /> No credit card
              </span>
              <span className="text-[#2a2a35]">·</span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#25D366]" /> Hindi &amp; English
              </span>
              <span className="text-[#2a2a35]">·</span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#25D366]" /> Free forever plan
              </span>
            </div>
          </div>

          {/* Right: Mock WhatsApp chat UI */}
          <div className="lg:flex justify-center hidden">
            <div className="w-72 bg-[#16161a] border border-[#2a2a35] rounded-2xl overflow-hidden shadow-2xl">
              {/* Chat header */}
              <div className="bg-[#1e1e24] px-4 py-3 flex items-center gap-3 border-b border-[#2a2a35]">
                <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center text-black font-bold text-xs">
                  SC
                </div>
                <div>
                  <p className="text-sm font-semibold">StatusCraft Bot</p>
                  <p className="text-xs text-[#25D366]">online</p>
                </div>
              </div>

              {/* Chat messages */}
              <div className="p-4 space-y-3 min-h-[260px]">
                {/* User voice note */}
                <div className="flex justify-end">
                  <div className="bg-[#25D366]/20 border border-[#25D366]/30 rounded-xl rounded-br-sm px-3 py-2 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-[#25D366]" />
                      <div className="flex items-end gap-0.5">
                        {[3, 5, 4, 6, 3, 5, 4].map((h, i) => (
                          <div
                            key={i}
                            className="w-0.5 bg-[#25D366] rounded-full"
                            style={{ height: `${h * 3}px` }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[#8b8b9a]">0:08</span>
                    </div>
                  </div>
                </div>

                {/* Bot reply */}
                <div className="flex justify-start">
                  <div className="bg-[#1e1e24] border border-[#2a2a35] rounded-xl rounded-bl-sm px-3 py-2 max-w-[90%]">
                    <p className="text-xs text-white">
                      ✨ 3 posts created! Mango Pickle Launch — ready to approve
                    </p>
                    <p className="text-[10px] text-[#8b8b9a] mt-1">Reply APPROVE to go live</p>
                  </div>
                </div>

                {/* Post preview cards */}
                <div className="space-y-2">
                  {[
                    { label: "Hindi", color: "#ff6b35" },
                    { label: "Hinglish", color: "#25D366" },
                    { label: "English", color: "#7c3aed" },
                  ].map((p) => (
                    <div
                      key={p.label}
                      className="bg-[#0d0d0f] border border-[#2a2a35] rounded-lg px-3 py-2 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: p.color }}
                        />
                        <span className="text-xs text-[#8b8b9a]">{p.label} variant</span>
                      </div>
                      <span className="text-[10px] bg-[#16161a] border border-[#2a2a35] px-1.5 py-0.5 rounded text-[#8b8b9a]">
                        Preview
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ── */}
      <section className="border-y border-[#2a2a35] bg-[#16161a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <p className="text-center text-sm text-[#8b8b9a] mb-5">
            Trusted by{" "}
            <span className="text-white font-semibold">12,000+ Indian businesses</span>
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {[
              "Kirana Stores",
              "Restaurants",
              "Boutiques",
              "Sweet Shops",
              "Salons",
              "Coaching Classes",
            ].map((biz) => (
              <span
                key={biz}
                className="bg-[#0d0d0f] border border-[#2a2a35] text-[#8b8b9a] text-xs sm:text-sm px-3 py-1.5 rounded-full"
              >
                {biz}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28"
      >
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
            From voice to viral in{" "}
            <span className="text-[#25D366]">30 seconds</span>
          </h2>
          <p className="text-[#8b8b9a] text-base max-w-md mx-auto">
            The simplest marketing workflow ever built for Indian businesses.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-10 left-[calc(33%+1rem)] right-[calc(33%+1rem)] h-px bg-gradient-to-r from-[#2a2a35] via-[#25D366]/40 to-[#2a2a35]" />

          {[
            {
              icon: "🎙️",
              step: "01",
              title: "Speak your offer",
              desc: "Record a 10-second voice note on WhatsApp. Hindi, Hinglish, Tamil — whatever feels natural.",
            },
            {
              icon: "✨",
              step: "02",
              title: "AI creates 3 posts",
              desc: "Claude AI writes the copy, generates the image, adds your logo and brand colours automatically.",
            },
            {
              icon: "📲",
              step: "03",
              title: "Approve & go live",
              desc: "Reply APPROVE on WhatsApp. Your status goes live. Customers start replying.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="relative bg-[#16161a] border border-[#2a2a35] rounded-2xl p-6 text-center"
            >
              <div className="text-3xl mb-4">{s.icon}</div>
              <span className="inline-block text-[10px] font-bold tracking-widest text-[#25D366] bg-[#25D366]/10 border border-[#25D366]/20 px-2 py-0.5 rounded-full mb-3">
                STEP {s.step}
              </span>
              <h3 className="text-lg font-bold mb-2">{s.title}</h3>
              <p className="text-[#8b8b9a] text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section
        id="features"
        className="bg-[#16161a] border-y border-[#2a2a35]"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
              Everything you need to{" "}
              <span className="text-[#25D366]">market on WhatsApp</span>
            </h2>
            <p className="text-[#8b8b9a] text-base max-w-md mx-auto">
              Built specifically for how Indian small businesses actually work.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <Mic className="w-5 h-5 text-[#25D366]" />,
                title: "Voice to Post",
                desc: "Speak in any language. Get posts in 30 seconds. No typing, no designing.",
              },
              {
                icon: <span className="text-xl">🎉</span>,
                title: "Festival Engine",
                desc: "Never miss Diwali, Eid, Pongal, or 40+ festivals. Posts auto-generate 3 days before.",
              },
              {
                icon: <Bot className="w-5 h-5 text-[#25D366]" />,
                title: "WhatsApp Bot",
                desc: "Your AI marketing manager lives in WhatsApp. Approve, edit, regenerate — all by chat.",
              },
              {
                icon: <ShoppingCart className="w-5 h-5 text-[#25D366]" />,
                title: "Reply to Buy",
                desc: "Customers reply to your status → bot collects order → Razorpay payment link sent automatically.",
              },
              {
                icon: <Sparkles className="w-5 h-5 text-[#25D366]" />,
                title: "Brand Watermark",
                desc: "Your logo, your colours, your CTA baked into every image. statuscraft.in drives new signups.",
              },
              {
                icon: <BarChart2 className="w-5 h-5 text-[#25D366]" />,
                title: "Analytics",
                desc: "Track views, replies, and conversion rate. Know which posts drive orders.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-[#0d0d0f] border border-[#2a2a35] rounded-2xl p-5 hover:border-[#3a3a45] transition-colors"
              >
                <div className="w-10 h-10 bg-[#16161a] border border-[#2a2a35] rounded-xl flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-base mb-2">{f.title}</h3>
                <p className="text-[#8b8b9a] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
            Simple, honest{" "}
            <span className="text-[#25D366]">pricing</span>
          </h2>
          <p className="text-[#8b8b9a] text-base max-w-md mx-auto">
            Start free. Upgrade only when you&apos;re growing.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5 lg:gap-6 items-start">
          {/* Free */}
          <div className="bg-[#16161a] border border-[#2a2a35] rounded-2xl p-6">
            <p className="text-sm font-semibold text-[#8b8b9a] mb-1">Free</p>
            <p className="text-3xl font-extrabold mb-1">₹0</p>
            <p className="text-xs text-[#8b8b9a] mb-6">forever</p>
            <ul className="space-y-3 mb-8 text-sm">
              {[
                "30 posts / month",
                "1 brand",
                "Voice to Post",
                "5 festival posts / month",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-[#8b8b9a]">
                  <Check className="w-4 h-4 text-[#25D366] flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
              {["WhatsApp Bot", "Reply to Buy"].map((f) => (
                <li key={f} className="flex items-start gap-2 text-[#555562]">
                  <span className="w-4 h-4 flex-shrink-0 text-center leading-none mt-0.5 text-lg">—</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="block text-center border border-[#2a2a35] hover:border-[#3a3a45] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              Start Free
            </Link>
          </div>

          {/* Pro — highlighted */}
          <div className="bg-[#16161a] border-2 border-[#25D366] rounded-2xl p-6 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#25D366] text-black text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Most Popular
            </span>
            <p className="text-sm font-semibold text-[#25D366] mb-1">Pro</p>
            <p className="text-3xl font-extrabold mb-1">₹999</p>
            <p className="text-xs text-[#8b8b9a] mb-6">per month</p>
            <ul className="space-y-3 mb-8 text-sm">
              {[
                "Unlimited posts",
                "1 brand",
                "Voice to Post",
                "Festival Engine (all)",
                "WhatsApp Bot",
                "Reply to Buy",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-[#8b8b9a]">
                  <Check className="w-4 h-4 text-[#25D366] flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="block text-center bg-[#25D366] hover:bg-[#1aab52] text-black font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              Start Pro Trial
            </Link>
          </div>

          {/* Agency */}
          <div className="bg-[#16161a] border border-[#2a2a35] rounded-2xl p-6">
            <p className="text-sm font-semibold text-[#8b8b9a] mb-1">Agency</p>
            <p className="text-3xl font-extrabold mb-1">₹2,499</p>
            <p className="text-xs text-[#8b8b9a] mb-6">per month</p>
            <ul className="space-y-3 mb-8 text-sm">
              {[
                "Unlimited posts",
                "10 brands",
                "Voice to Post",
                "Festival Engine (all)",
                "WhatsApp Bot",
                "Reply to Buy",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-[#8b8b9a]">
                  <Check className="w-4 h-4 text-[#25D366] flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="block text-center border border-[#2a2a35] hover:border-[#3a3a45] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="bg-[#16161a] border-y border-[#2a2a35]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
              Real businesses,{" "}
              <span className="text-[#25D366]">real results</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 lg:gap-6">
            {[
              {
                name: "Priya Sharma",
                biz: "Priya's Kitchen",
                location: "Mumbai",
                quote:
                  "Main bas apni awaaz mein bol deti hoon 'aaj special thali 120 rupaye' — aur 30 second mein 3 posts ready. Mujhe typing bhi nahi karni! Mere customers ko lagta hai mera poora marketing team hai.",
                stars: 5,
              },
              {
                name: "Ramesh Agarwal",
                biz: "Agarwal Sweets",
                location: "Jaipur",
                quote:
                  "Diwali ke liye posts automatically 3 din pehle ban gayi — with our logo, our colours, everything. Maine kuch nahi kiya. 400+ orders came in just from WhatsApp Status that week. Incredible.",
                stars: 5,
              },
              {
                name: "Fatima Malik",
                biz: "Style Studio",
                location: "Hyderabad",
                quote:
                  "A customer replied to my status about a bridal package. The bot collected her details and sent a payment link. By the time I woke up, the booking was confirmed. I didn't even know about it!",
                stars: 5,
              },
            ].map((t) => (
              <div
                key={t.name}
                className="bg-[#0d0d0f] border border-[#2a2a35] rounded-2xl p-6 flex flex-col"
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-[#f59e0b] fill-[#f59e0b]" />
                  ))}
                </div>
                <p className="text-[#8b8b9a] text-sm leading-relaxed flex-1 mb-5">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-[#8b8b9a]">
                    {t.biz} · {t.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-[#0a1f0f] border-y border-[#1a3a1f]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
            Ready to grow on{" "}
            <span className="text-[#25D366]">WhatsApp?</span>
          </h2>
          <p className="text-[#8b8b9a] text-base mb-8">
            Join 12,000+ businesses already using StatusCraft
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1aab52] text-black font-bold px-8 py-4 rounded-2xl text-lg transition-colors"
          >
            Start free — no credit card needed{" "}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#2a2a35]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid sm:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#25D366] flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3.5 h-3.5 text-black fill-black" />
                </div>
                <span className="font-bold">StatusCraft</span>
              </div>
              <p className="text-xs text-[#8b8b9a] leading-relaxed">
                AI marketing for Indian businesses
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                Product
              </p>
              <ul className="space-y-2">
                {[
                  { label: "Features", href: "#features" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "How it works", href: "#how-it-works" },
                ].map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-[#8b8b9a] hover:text-white transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                Company
              </p>
              <ul className="space-y-2">
                {[
                  { label: "About", href: "#" },
                  { label: "Contact", href: "#" },
                ].map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-[#8b8b9a] hover:text-white transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                Legal
              </p>
              <ul className="space-y-2">
                {[
                  { label: "Privacy", href: "#" },
                  { label: "Terms", href: "#" },
                ].map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-[#8b8b9a] hover:text-white transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-[#2a2a35] pt-6 text-center">
            <p className="text-xs text-[#555562]">
              © 2025 StatusCraft. Made with ❤️ in India
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

