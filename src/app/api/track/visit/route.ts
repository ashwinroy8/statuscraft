import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Map referrer hostname → clean source label
function parseSource(referrer: string | null, utmSource: string | null): string {
  if (utmSource) {
    const u = utmSource.toLowerCase();
    if (u.includes("producthunt") || u.includes("product_hunt") || u.includes("product-hunt")) return "product-hunt";
    if (u.includes("google"))    return "google";
    if (u.includes("twitter") || u.includes("x.com")) return "twitter";
    if (u.includes("facebook") || u.includes("fb"))   return "facebook";
    if (u.includes("instagram")) return "instagram";
    if (u.includes("whatsapp"))  return "whatsapp";
    if (u.includes("linkedin"))  return "linkedin";
    return utmSource.toLowerCase().slice(0, 40);
  }
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer.startsWith("http") ? referrer : `https://${referrer}`).hostname.replace("www.", "");
    if (host.includes("producthunt.com")) return "product-hunt";
    if (host.includes("google."))         return "google";
    if (host.includes("twitter.com") || host.includes("x.com")) return "twitter";
    if (host.includes("facebook.com") || host.includes("fb.com")) return "facebook";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("whatsapp.com"))  return "whatsapp";
    if (host.includes("linkedin.com"))  return "linkedin";
    if (host.includes("youtube.com"))   return "youtube";
    if (host.includes("reddit.com"))    return "reddit";
    if (host === "") return "direct";
    return host.slice(0, 40);
  } catch {
    return "direct";
  }
}

function parseDevice(ua: string | null): string {
  if (!ua) return "unknown";
  const u = ua.toLowerCase();
  if (/(iphone|android|mobile|phone)/.test(u))  return "mobile";
  if (/(ipad|tablet)/.test(u))                   return "tablet";
  return "desktop";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { referrer, utmSource, utmMedium, utmCampaign } = body;

    // Get real IP (Railway passes X-Forwarded-For)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;

    const ua = req.headers.get("user-agent");
    const device = parseDevice(ua);
    const source = parseSource(referrer ?? null, utmSource ?? null);

    // Geo lookup (server-side — no CORS issues)
    let country: string | null = null;
    let city: string | null = null;
    if (ip && ip !== "127.0.0.1" && ip !== "::1") {
      try {
        const geo = await fetch(`https://ipapi.co/${ip}/json/`, {
          headers: { "User-Agent": "statuscraft/1.0" },
          signal: AbortSignal.timeout(2500),
        }).then(r => r.json());
        country = geo.country_name ?? null;
        city    = geo.city ?? null;
      } catch {
        // geo lookup failed — continue without it
      }
    }

    const visitor = await prisma.visitor.create({
      data: {
        source,
        referrer: referrer ? String(referrer).slice(0, 120) : null,
        utmSource:   utmSource   ? String(utmSource).slice(0, 80)   : null,
        utmMedium:   utmMedium   ? String(utmMedium).slice(0, 80)   : null,
        utmCampaign: utmCampaign ? String(utmCampaign).slice(0, 80) : null,
        country,
        city,
        device,
      },
    });

    return NextResponse.json({ ok: true, id: visitor.id });
  } catch (err) {
    console.error("[track/visit]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
