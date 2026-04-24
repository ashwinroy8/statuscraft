"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, RotateCcw, ChevronLeft, Video, Circle } from "lucide-react";

// Canvas dimensions
const W = 540;
const H = 960;

interface ScriptData {
  headline: string;
  subtext: string;
  cta: string;
  tagline: string;
  words: string[];
  colors: { bg1: string; bg2: string; text: string; accent: string };
}

interface Particle {
  x: number;
  y: number;
  vy: number;
  color: string;
  r: number;
}

// ─── Animation helpers ───────────────────────────────────────────────────────

function easeOut(t: number) {
  return 1 - Math.pow(1 - Math.min(t, 1), 3);
}

function easeInOut(t: number) {
  t = Math.min(t, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function progress(t: number, start: number, end: number) {
  return clamp((t - start) / (end - start), 0, 1);
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[i] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
}

// ─── Drawing functions ────────────────────────────────────────────────────────

function drawBackground(
  ctx: CanvasRenderingContext2D,
  bg1: string,
  bg2: string,
  t: number
) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, bg1);
  grad.addColorStop(1, bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Animated overlay circle
  const pulse = Math.sin(t * 0.8) * 0.5 + 0.5;
  const overlayGrad = ctx.createRadialGradient(
    W * 0.7,
    H * 0.2 + pulse * 30,
    0,
    W * 0.7,
    H * 0.2 + pulse * 30,
    W * 0.7
  );
  overlayGrad.addColorStop(0, "rgba(255,255,255,0.06)");
  overlayGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, W, H);
}

function drawKinetic(
  ctx: CanvasRenderingContext2D,
  script: ScriptData,
  t: number
) {
  drawBackground(ctx, script.colors.bg1, script.colors.bg2, t);

  const words = script.words ?? [];

  for (let i = 0; i < words.length; i++) {
    const wordStart = 0.3 + i * 1.5;
    const wordProgress = progress(t, wordStart, wordStart + 0.6);
    if (wordProgress <= 0) continue;

    const ep = easeOut(wordProgress);
    const targetY = H * 0.35 - i * 60;
    const startY = H * 0.8;
    const y = lerp(startY, targetY, ep);

    // Fade out older words slightly
    const fadeStart = wordStart + 1.2;
    const fadeP = progress(t, fadeStart, fadeStart + 0.4);
    const alpha = i < words.length - 1 ? lerp(1, 0.25, easeOut(fadeP)) : 1;

    ctx.save();
    ctx.globalAlpha = alpha * Math.min(wordProgress * 3, 1);
    const fontSize = Math.max(40, 90 - i * 8);
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = i % 2 === 0 ? script.colors.text : script.colors.accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(words[i].toUpperCase(), W / 2, y);
    ctx.restore();
  }

  // Subtext fades in at t=8
  if (t > 8) {
    const alpha = easeOut(progress(t, 8, 8.8));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "400 28px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    wrapText(ctx, script.subtext, W / 2, H * 0.72, W - 80, 38);
    ctx.restore();
  }

  // CTA at bottom at t=9
  if (t > 9) {
    const alpha = easeOut(progress(t, 9, 9.6));
    ctx.save();
    ctx.globalAlpha = alpha;

    // CTA box
    const boxH = 56;
    const boxW = 320;
    const boxX = (W - boxW) / 2;
    const boxY = H * 0.87;
    ctx.fillStyle = script.colors.accent;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 28);
    ctx.fill();

    ctx.font = "bold 22px Arial, sans-serif";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(script.cta, W / 2, boxY + boxH / 2);
    ctx.restore();
  }
}

function drawProduct(
  ctx: CanvasRenderingContext2D,
  script: ScriptData,
  t: number
) {
  drawBackground(ctx, script.colors.bg1, script.colors.bg2, t);

  // t=0-1: tagline fades in at top
  if (t > 0) {
    const alpha = easeOut(progress(t, 0, 1));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "600 24px Arial, sans-serif";
    ctx.fillStyle = script.colors.accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(script.tagline.toUpperCase(), W / 2, H * 0.12);
    // Decorative line
    ctx.strokeStyle = script.colors.accent;
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha * 0.4;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 60, H * 0.12 + 20);
    ctx.lineTo(W / 2 + 60, H * 0.12 + 20);
    ctx.stroke();
    ctx.restore();
  }

  // t=1-2.5: headline slides in from left
  if (t > 1) {
    const p = easeOut(progress(t, 1, 2.5));
    const x = lerp(-W, W * 0.08, p);
    ctx.save();
    ctx.globalAlpha = p;
    ctx.font = "bold 72px Arial, sans-serif";
    ctx.fillStyle = script.colors.text;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    wrapText(ctx, script.headline.toUpperCase(), x, H * 0.35, W - x - 40, 84);
    ctx.restore();
  }

  // t=2.5-4.5: accent box slides up from bottom with subtext
  if (t > 2.5) {
    const p = easeOut(progress(t, 2.5, 4.5));
    const boxH = 120;
    const targetY = H * 0.52;
    const startY = H + 20;
    const boxY = lerp(startY, targetY, p);

    ctx.save();
    ctx.globalAlpha = p;
    ctx.fillStyle = script.colors.accent + "22";
    ctx.strokeStyle = script.colors.accent + "66";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(40, boxY, W - 80, boxH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.font = "400 28px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    wrapText(ctx, script.subtext, W / 2, boxY + boxH / 2, W - 120, 38);
    ctx.restore();
  }

  // t=4.5-6: offer text scales in
  if (t > 4.5) {
    const p = progress(t, 4.5, 6);
    let scale: number;
    if (p < 0.5) {
      scale = lerp(0, 1.15, easeOut(p * 2));
    } else {
      scale = lerp(1.15, 1.0, easeOut((p - 0.5) * 2));
    }

    ctx.save();
    ctx.globalAlpha = Math.min(p * 2, 1);
    ctx.translate(W / 2, H * 0.72);
    ctx.scale(scale, scale);
    ctx.font = "bold 52px Arial, sans-serif";
    ctx.fillStyle = script.colors.accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(script.headline, 0, 0);
    ctx.restore();
  }

  // t=6-10: CTA pulsing
  if (t > 6) {
    const alpha = easeOut(progress(t, 6, 7));
    const pulse = 0.75 + Math.sin((t - 6) * 3) * 0.25;

    ctx.save();
    ctx.globalAlpha = alpha * pulse;
    const boxH = 60;
    const boxW = 340;
    const boxX = (W - boxW) / 2;
    const boxY = H * 0.86;
    ctx.fillStyle = script.colors.accent;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 30);
    ctx.fill();

    ctx.globalAlpha = alpha;
    ctx.font = "bold 24px Arial, sans-serif";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(script.cta, W / 2, boxY + boxH / 2);
    ctx.restore();
  }
}

function drawCountdown(
  ctx: CanvasRenderingContext2D,
  script: ScriptData,
  t: number
) {
  drawBackground(ctx, script.colors.bg1, script.colors.bg2, t);

  // Top headline
  ctx.save();
  ctx.font = "bold 36px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  wrapText(ctx, script.subtext, W / 2, H * 0.14, W - 80, 46);
  ctx.restore();

  // Center glow circle (pulsing)
  const numbers = ["5", "4", "3", "2", "1", "GO!"];
  const currentIdx = Math.min(Math.floor(t / 1.5), 5);
  const withinSegment = (t % 1.5) / 1.5;

  // Pulsing background circle
  const glowRadius = 160 + Math.sin(t * 4) * 20;
  const glowGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, glowRadius);
  glowGrad.addColorStop(0, script.colors.accent + "55");
  glowGrad.addColorStop(0.6, script.colors.accent + "22");
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  // Countdown numbers
  if (t < 9) {
    const enterP = progress(withinSegment, 0, 0.2);
    const exitP = progress(withinSegment, 0.8, 1.0);
    let scale = lerp(2.0, 1.0, easeOut(enterP));
    if (exitP > 0) scale = lerp(1.0, 0.0, easeOut(exitP));

    const alpha = enterP > 0 && exitP < 1 ? clamp(enterP * 5, 0, 1) * (1 - exitP) : 0;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);
    ctx.font = `bold 200px Arial, sans-serif`;
    ctx.fillStyle = script.colors.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(numbers[currentIdx], 0, 0);
    ctx.restore();
  }

  // After GO! (t>9): headline large
  if (t > 9) {
    const alpha = easeOut(progress(t, 9, 9.6));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "bold 80px Arial, sans-serif";
    ctx.fillStyle = script.colors.accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    wrapText(ctx, script.headline.toUpperCase(), W / 2, H / 2 - 40, W - 80, 90);

    // CTA
    const boxH = 60;
    const boxW = 340;
    ctx.fillStyle = script.colors.accent;
    ctx.beginPath();
    ctx.roundRect((W - boxW) / 2, H * 0.72, boxW, boxH, 30);
    ctx.fill();
    ctx.font = "bold 24px Arial, sans-serif";
    ctx.fillStyle = "#000";
    ctx.fillText(script.cta, W / 2, H * 0.72 + boxH / 2);
    ctx.restore();
  }
}

function drawFestival(
  ctx: CanvasRenderingContext2D,
  script: ScriptData,
  t: number,
  particles: Particle[]
) {
  // Festival gradient: saffron/orange/yellow
  const festBg1 = script.colors.bg1 || "#FF6B00";
  const festBg2 = script.colors.bg2 || "#FFD700";
  drawBackground(ctx, festBg1, festBg2, t);

  // Move and draw particles
  for (const p of particles) {
    p.y += p.vy;
    if (p.y > H + 10) p.y = -10;

    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // t=0-2: tagline slides down from top
  if (t >= 0) {
    const p = easeOut(progress(t, 0, 2));
    const startY = -80;
    const targetY = H * 0.1;
    const y = lerp(startY, targetY, p);

    ctx.save();
    ctx.globalAlpha = p;
    ctx.font = "bold 32px Arial, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`✨ ${script.tagline} ✨`, W / 2, y);
    ctx.restore();
  }

  // t=2-5: headline large, slides up from below
  if (t > 2) {
    const p = easeOut(progress(t, 2, 5));
    const startY = H * 0.8;
    const targetY = H * 0.4;
    const y = lerp(startY, targetY, p);

    ctx.save();
    ctx.globalAlpha = p;
    ctx.font = "bold 88px Arial, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    wrapText(ctx, script.headline.toUpperCase(), W / 2, y, W - 60, 100);
    ctx.restore();
  }

  // t=5-8: subtext fades in
  if (t > 5) {
    const alpha = easeInOut(progress(t, 5, 8));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "400 30px Arial, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    wrapText(ctx, script.subtext, W / 2, H * 0.62, W - 80, 42);
    ctx.restore();
  }

  // t=8-10: CTA box at bottom
  if (t > 8) {
    const alpha = easeOut(progress(t, 8, 9));
    ctx.save();
    ctx.globalAlpha = alpha;

    const boxH = 64;
    const boxW = 340;
    const boxX = (W - boxW) / 2;
    const boxY = H * 0.83;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 32);
    ctx.fill();

    ctx.font = "bold 24px Arial, sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(script.cta, W / 2, boxY + boxH / 2);
    ctx.restore();
  }
}

function drawSlideshow(
  ctx: CanvasRenderingContext2D,
  script: ScriptData,
  t: number
) {
  const slideDuration = 10 / 3; // ~3.33s each
  const fadeDuration = 0.4;

  // Which slide are we on?
  const slideIdx = Math.min(Math.floor(t / slideDuration), 2);
  const slideT = t - slideIdx * slideDuration;
  const entering = easeInOut(progress(slideT, 0, fadeDuration));
  const exiting = easeInOut(progress(slideT, slideDuration - fadeDuration, slideDuration));

  const slide1Alpha = slideIdx === 0
    ? entering
    : slideIdx === 1
    ? 1 - easeInOut(progress(t, slideDuration - fadeDuration, slideDuration))
    : 0;

  const slide2Alpha = slideIdx === 1
    ? entering
    : slideIdx === 2
    ? 1 - easeInOut(progress(t, slideDuration * 2 - fadeDuration, slideDuration * 2))
    : 0;

  const slide3Alpha = slideIdx === 2 ? entering : 0;

  // Slide 1: brand name + tagline
  if (slide1Alpha > 0) {
    ctx.save();
    ctx.globalAlpha = slide1Alpha;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, script.colors.bg1);
    grad.addColorStop(1, script.colors.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Decorative circles
    ctx.fillStyle = script.colors.accent + "22";
    ctx.beginPath();
    ctx.arc(W * 0.8, H * 0.15, 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = script.colors.accent + "11";
    ctx.beginPath();
    ctx.arc(W * 0.1, H * 0.9, 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "bold 80px Arial, sans-serif";
    ctx.fillStyle = script.colors.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(script.tagline, W / 2, H / 2 - 30);

    ctx.font = "300 28px Arial, sans-serif";
    ctx.fillStyle = script.colors.accent;
    ctx.fillText(script.subtext, W / 2, H / 2 + 55);
    ctx.restore();
  }

  // Slide 2: headline + subtext
  if (slide2Alpha > 0) {
    ctx.save();
    ctx.globalAlpha = slide2Alpha;
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, script.colors.bg2);
    grad.addColorStop(1, script.colors.accent + "88");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Horizontal accent line
    ctx.strokeStyle = script.colors.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, H * 0.35);
    ctx.lineTo(W - 60, H * 0.35);
    ctx.stroke();

    ctx.font = "bold 72px Arial, sans-serif";
    ctx.fillStyle = script.colors.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    wrapText(ctx, script.headline.toUpperCase(), W / 2, H * 0.46, W - 80, 84);

    ctx.font = "400 30px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    wrapText(ctx, script.subtext, W / 2, H * 0.66, W - 80, 42);
    ctx.restore();
  }

  // Slide 3: CTA large + decorative
  if (slide3Alpha > 0) {
    ctx.save();
    ctx.globalAlpha = slide3Alpha;
    const grad = ctx.createLinearGradient(0, H, 0, 0);
    grad.addColorStop(0, script.colors.bg1);
    grad.addColorStop(1, "#0a0a0a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Decorative top bar
    ctx.fillStyle = script.colors.accent;
    ctx.fillRect(0, 0, W, 6);

    // Big CTA
    ctx.font = "bold 60px Arial, sans-serif";
    ctx.fillStyle = script.colors.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    wrapText(ctx, script.cta.toUpperCase(), W / 2, H * 0.38, W - 80, 72);

    // Accent box
    const boxH = 70;
    const boxW = 360;
    const boxX = (W - boxW) / 2;
    const boxY = H * 0.55;
    ctx.fillStyle = script.colors.accent;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 35);
    ctx.fill();

    ctx.font = "bold 26px Arial, sans-serif";
    ctx.fillStyle = "#000";
    ctx.fillText(script.tagline, W / 2, boxY + boxH / 2);

    // Decorative dots
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(W / 2 - 40 + i * 20, H * 0.74, 4, 0, Math.PI * 2);
      ctx.fillStyle = i === 2 ? script.colors.accent : "rgba(255,255,255,0.3)";
      ctx.fill();
    }

    ctx.restore();
  }
}

// ─── Style metadata ───────────────────────────────────────────────────────────

const STYLES = [
  {
    id: "kinetic",
    emoji: "⚡",
    name: "Kinetic Text",
    desc: "Words fly in one-by-one for maximum impact",
  },
  {
    id: "product",
    emoji: "🛍️",
    name: "Product Launch",
    desc: "Elegant reveal of your offer with CTA",
  },
  {
    id: "countdown",
    emoji: "⏱️",
    name: "Countdown",
    desc: "Urgency countdown 5-4-3-2-1 then reveal",
  },
  {
    id: "festival",
    emoji: "🎉",
    name: "Festival Vibes",
    desc: "Festive particles, warm colours, celebration",
  },
  {
    id: "slideshow",
    emoji: "🖼️",
    name: "Slideshow",
    desc: "3 elegant slides with smooth crossfade",
  },
] as const;

type StyleId = (typeof STYLES)[number]["id"];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VideoClient() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedStyle, setSelectedStyle] = useState<StyleId>("kinetic");
  const [description, setDescription] = useState("");
  const [script, setScript] = useState<ScriptData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [recordCountdown, setRecordCountdown] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || !script) return;

    const t = ((Date.now() - startTimeRef.current) / 1000) % 10;

    ctx.clearRect(0, 0, W, H);

    switch (selectedStyle) {
      case "kinetic":
        drawKinetic(ctx, script, t);
        break;
      case "product":
        drawProduct(ctx, script, t);
        break;
      case "countdown":
        drawCountdown(ctx, script, t);
        break;
      case "festival":
        drawFestival(ctx, script, t, particlesRef.current);
        break;
      case "slideshow":
        drawSlideshow(ctx, script, t);
        break;
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }, [script, selectedStyle]);

  useEffect(() => {
    if (script && step === 3) {
      startTimeRef.current = Date.now();
      // Init particles for festival
      particlesRef.current = Array.from({ length: 60 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vy: 1 + Math.random() * 3,
        color: ["#FF6B35", "#FFD700", "#FF4500", "#FF8C00", "#FFF"][
          Math.floor(Math.random() * 5)
        ],
        r: 3 + Math.random() * 5,
      }));
      animFrameRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animFrameRef.current);
    }
  }, [script, step, animate]);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/video/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, style: selectedStyle }),
      });
      const data = await res.json() as ScriptData;
      setScript(data);
      setDownloadUrl(null);
      setStep(3);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRecord() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 3 second countdown
    for (let i = 3; i > 0; i--) {
      setRecordCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setRecordCountdown(0);

    chunksRef.current = [];
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "video/mp4";

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setDownloadUrl(URL.createObjectURL(blob));
      setIsRecording(false);
    };

    // Restart animation from t=0
    startTimeRef.current = Date.now();
    setIsRecording(true);
    recorder.start(100);

    // Stop after 10.2 seconds
    setTimeout(() => recorder.stop(), 10200);
  }

  const selectedStyleMeta = STYLES.find((s) => s.id === selectedStyle)!;

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold mb-1">🎬 Video Creator</h1>
        <p className="text-[#8b8b9a] text-sm">
          Create 10-second WhatsApp Status videos
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ── Step 1: Style Picker ── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.22 }}
          >
            <p className="text-sm font-semibold text-[#555562] uppercase tracking-wider mb-4">
              Choose a style
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {STYLES.map((style, idx) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    idx === STYLES.length - 1 ? "col-span-2" : ""
                  } ${
                    selectedStyle === style.id
                      ? "border-[#25D366] bg-[#25D366]/[0.07]"
                      : "border-white/[0.06] bg-[#141416] hover:border-white/[0.14] hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="text-2xl mb-2">{style.emoji}</div>
                  <div className="font-semibold text-sm mb-0.5">{style.name}</div>
                  <div className="text-[#555562] text-xs">{style.desc}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-xl bg-[#25D366] text-black font-bold text-sm hover:bg-[#20c05c] transition-colors"
            >
              Next →
            </button>
          </motion.div>
        )}

        {/* ── Step 2: Content Input ── */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.22 }}
          >
            {/* Style badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 mb-5">
              <span className="text-base">{selectedStyleMeta.emoji}</span>
              <span className="text-[#25D366] text-sm font-semibold">
                {selectedStyleMeta.name}
              </span>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-[#8b8b9a] mb-2">
                Describe your video post
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 'New chai offer, ₹50 large cup, today only'"
                rows={5}
                className="w-full bg-[#141416] border border-white/[0.06] rounded-2xl px-4 py-3 text-sm text-white placeholder-[#555562] resize-none outline-none focus:border-[#25D366]/40 transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.06] text-[#8b8b9a] text-sm hover:text-white hover:border-white/[0.14] transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={!description.trim() || isGenerating}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#25D366] text-black font-bold text-sm hover:bg-[#20c05c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI is crafting your video...
                  </>
                ) : (
                  "✨ Generate Video"
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Preview + Record ── */}
        {step === 3 && script && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.22 }}
            className="flex gap-6 items-start"
          >
            {/* Phone mockup with canvas */}
            <div className="flex-shrink-0">
              <div
                style={{
                  background: "#000",
                  borderRadius: "24px",
                  border: "2px solid rgba(255,255,255,0.1)",
                  padding: "8px",
                  boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={540}
                  height={960}
                  style={{
                    width: 270,
                    height: 480,
                    borderRadius: "16px",
                    display: "block",
                  }}
                />
              </div>
              {/* Style label below phone */}
              <div className="mt-2 text-center text-[#555562] text-xs">
                {selectedStyleMeta.emoji} {selectedStyleMeta.name} · 10s loop
              </div>
            </div>

            {/* Controls */}
            <div className="flex-1 space-y-4">
              {/* Script preview */}
              <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <p className="text-xs font-semibold text-[#555562] uppercase tracking-wider">
                  Generated Script
                </p>
                <div className="space-y-2">
                  <div className="bg-white/[0.03] rounded-xl p-3">
                    <p className="text-[10px] text-[#555562] mb-0.5">HEADLINE</p>
                    <p className="text-sm font-bold text-white">{script.headline}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3">
                    <p className="text-[10px] text-[#555562] mb-0.5">SUBTEXT</p>
                    <p className="text-sm text-[#8b8b9a]">{script.subtext}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3">
                    <p className="text-[10px] text-[#555562] mb-0.5">CTA</p>
                    <p className="text-sm font-semibold text-[#25D366]">{script.cta}</p>
                  </div>
                </div>
                {/* Color swatches */}
                <div className="flex items-center gap-2 pt-1">
                  {Object.values(script.colors).map((c, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border border-white/10"
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <button
                onClick={async () => {
                  setDownloadUrl(null);
                  await handleGenerate();
                }}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.06] text-[#8b8b9a] text-sm hover:text-white hover:border-white/[0.14] transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Regenerate
              </button>

              {/* Record button */}
              {!isRecording && recordCountdown === 0 ? (
                <button
                  onClick={handleRecord}
                  disabled={isRecording}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-semibold hover:bg-red-500/20 transition-colors"
                >
                  <Circle className="w-3.5 h-3.5 fill-red-400" />
                  Record Video
                </button>
              ) : recordCountdown > 0 ? (
                <div className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                  <span className="text-red-400 font-bold text-lg">
                    Recording in {recordCountdown}...
                  </span>
                </div>
              ) : (
                <div className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-red-400 font-semibold text-sm">
                    Recording 10s...
                  </span>
                </div>
              )}

              {/* Download */}
              {downloadUrl && (
                <motion.a
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  href={downloadUrl}
                  download="statuscraft-video.webm"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] text-black font-bold text-sm hover:bg-[#20c05c] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Video
                </motion.a>
              )}

              {/* Make another */}
              <button
                onClick={() => {
                  cancelAnimationFrame(animFrameRef.current);
                  setScript(null);
                  setDownloadUrl(null);
                  setDescription("");
                  setStep(1);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[#555562] text-sm hover:text-[#8b8b9a] transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Make Another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
