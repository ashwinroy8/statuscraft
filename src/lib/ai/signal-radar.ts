import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { SIGNAL_SCORER_SYSTEM, buildSignalScorerPrompt } from "./prompts/signal-scorer";
import type { SignalType } from "@/generated/prisma/enums";

const client = new Anthropic();

// Static Indian holiday/event calendar
const INDIAN_CALENDAR: Array<{
  date: string; // MM-DD
  title: string;
  type: SignalType;
  description: string;
  categories?: string[];
}> = [
  { date: "01-01", title: "New Year's Day", type: "HOLIDAY", description: "New Year celebrations — perfect for new beginnings content" },
  { date: "01-14", title: "Makar Sankranti / Pongal", type: "CULTURAL", description: "Harvest festival — kites, sesame, community" },
  { date: "01-26", title: "Republic Day", type: "HOLIDAY", description: "India's Republic Day — patriotic content opportunity" },
  { date: "02-14", title: "Valentine's Day", type: "CULTURAL", description: "Love and gifting — ideal for retail, food, beauty" },
  { date: "03-08", title: "International Women's Day", type: "CULTURAL", description: "Celebrate women — strong for beauty, fashion, wellness" },
  { date: "03-25", title: "Holi", type: "CULTURAL", description: "Festival of colors — fun, vibrant, playful content" },
  { date: "04-14", title: "Ambedkar Jayanti", type: "HOLIDAY", description: "National holiday" },
  { date: "05-01", title: "Labour Day / May Day", type: "HOLIDAY", description: "Worker appreciation" },
  { date: "06-21", title: "World Yoga Day", type: "EVENT", description: "Health and wellness focus — great for gyms, wellness brands" },
  { date: "08-15", title: "Independence Day", type: "HOLIDAY", description: "India Independence Day — patriotic + offer content" },
  { date: "08-26", title: "Janmashtami", type: "CULTURAL", description: "Lord Krishna's birthday — fasting foods, devotional" },
  { date: "09-05", title: "Teachers Day", type: "CULTURAL", description: "Appreciation for educators" },
  { date: "10-02", title: "Gandhi Jayanti", type: "HOLIDAY", description: "Gandhiji's birthday — peace, simplicity messaging" },
  { date: "10-24", title: "Dussehra / Navratri ends", type: "CULTURAL", description: "Victory of good over evil — festive season begins" },
  { date: "11-01", title: "Diwali season", type: "CULTURAL", description: "The biggest Indian festival — gifting, lights, offers" },
  { date: "11-14", title: "Children's Day", type: "CULTURAL", description: "Kids-focused content — schools, bakeries, toy shops" },
  { date: "12-25", title: "Christmas", type: "HOLIDAY", description: "Christmas celebrations and gifting" },
  { date: "12-31", title: "New Year's Eve", type: "CULTURAL", description: "Year-end reflection and celebration content" },
];

export async function fetchSignals(): Promise<void> {
  const allSignals: Array<{
    type: SignalType;
    title: string;
    description: string;
    sourceUrl?: string;
    metadata?: any;
    expiresAt?: Date;
  }> = [];

  // 1. Check upcoming calendar events (next 7 days)
  const today = new Date();
  for (const event of INDIAN_CALENDAR) {
    const [month, day] = event.date.split("-").map(Number);
    const eventDate = new Date(today.getFullYear(), month - 1, day);
    const daysUntil = Math.ceil(
      (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil >= 0 && daysUntil <= 7) {
      allSignals.push({
        type: event.type,
        title: event.title,
        description: `${event.description}. ${daysUntil === 0 ? "TODAY!" : `${daysUntil} days away.`}`,
        metadata: { daysUntil, categories: event.categories },
        expiresAt: new Date(eventDate.getTime() + 24 * 60 * 60 * 1000),
      });
    }
  }

  // 2. Fetch news via NewsAPI
  if (process.env.NEWS_API_KEY) {
    try {
      const res = await fetch(
        `https://newsapi.org/v2/top-headlines?country=in&pageSize=10&apiKey=${process.env.NEWS_API_KEY}`
      );
      const data = await res.json();
      for (const article of (data.articles ?? []).slice(0, 5)) {
        allSignals.push({
          type: "NEWS",
          title: article.title,
          description: article.description ?? "",
          sourceUrl: article.url,
          metadata: {
            source: article.source?.name,
            publishedAt: article.publishedAt,
          },
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        });
      }
    } catch (e) {
      console.error("NewsAPI error:", e);
    }
  }

  // 3. Fetch weather signal (generic, for user's default city)
  if (process.env.OPENWEATHERMAP_API_KEY) {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=Mumbai&appid=${process.env.OPENWEATHERMAP_API_KEY}&units=metric`
      );
      const data = await res.json();
      if (data.weather?.[0]) {
        const weather = data.weather[0];
        const isExtreme =
          data.main?.temp > 38 ||
          data.main?.temp < 12 ||
          weather.main === "Rain" ||
          weather.main === "Thunderstorm";

        if (isExtreme) {
          allSignals.push({
            type: "WEATHER",
            title: `${weather.main} in Mumbai — ${Math.round(data.main.temp)}°C`,
            description: `${weather.description}. Weather-triggered content opportunity.`,
            metadata: { temp: data.main.temp, condition: weather.main, city: "Mumbai" },
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
          });
        }
      }
    } catch (e) {
      console.error("Weather API error:", e);
    }
  }

  // 4. IPL / Sports signals (static pattern for cricket season Apr-Jun)
  const month = today.getMonth() + 1;
  if (month >= 4 && month <= 6) {
    allSignals.push({
      type: "SPORTS",
      title: "IPL Season is ON!",
      description: "Indian Premier League cricket — massive engagement opportunity",
      metadata: { league: "IPL", sport: "cricket" },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  // Upsert signals to DB
  for (const signal of allSignals) {
    await prisma.signal.upsert({
      where: {
        // Use a composite we can match on — title + type from today
        id: `${signal.type}-${signal.title}-${today.toISOString().split("T")[0]}`,
      },
      create: {
        id: `${signal.type}-${signal.title}-${today.toISOString().split("T")[0]}`,
        ...signal,
      },
      update: {
        description: signal.description,
        metadata: signal.metadata,
        expiresAt: signal.expiresAt,
      },
    });
  }
}

export async function scoreSignalForBrand(
  signalId: string,
  brandId: string
): Promise<number> {
  const [signal, brand] = await Promise.all([
    prisma.signal.findUniqueOrThrow({ where: { id: signalId } }),
    prisma.brand.findUniqueOrThrow({ where: { id: brandId } }),
  ]);

  const prompt = buildSignalScorerPrompt(
    {
      type: signal.type,
      title: signal.title,
      description: signal.description ?? undefined,
      metadata: signal.metadata,
    },
    brand.category
  );

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: SIGNAL_SCORER_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return 0;

  const result = JSON.parse(jsonMatch[0]);
  return result.relevanceScore ?? 0;
}
