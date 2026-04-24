import { prisma } from "@/lib/prisma";
import { CELEBRITY_BIRTHDAYS } from "@/data/celebrity-birthdays";

// ─── Helper functions ─────────────────────────────────────────────────────────

function generateMovieHashtags(title: string, cast: string[]): string[] {
  const tags: string[] = [];
  const titleTag = "#" + title.replace(/[^a-zA-Z0-9]/g, "");
  if (titleTag.length > 1) tags.push(titleTag);
  tags.push("#Bollywood", "#NewMovie", "#BoxOffice");
  for (const name of cast.slice(0, 3)) {
    const nameTag = "#" + name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
    if (nameTag.length > 1) tags.push(nameTag);
  }
  return tags;
}

function generateSeriesHashtags(title: string, season: number): string[] {
  const tags: string[] = [];
  const titleTag = "#" + title.replace(/[^a-zA-Z0-9]/g, "");
  if (titleTag.length > 1) tags.push(titleTag);
  if (season > 1) tags.push(`#Season${season}`);
  tags.push("#WebSeries", "#Streaming", "#MustWatch");
  return tags;
}

function calculateAge(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

function endOfDay(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function detectPhase(daysSince: number): string {
  if (daysSince === 0) return "RELEASE_DAY";
  if (daysSince <= 3) return "OPENING_WEEKEND";
  if (daysSince <= 7) return "FIRST_WEEK";
  if (daysSince <= 14) return "SECOND_WEEK";
  return "ONGOING";
}

// ─── TMDB ─────────────────────────────────────────────────────────────────────

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  popularity: number;
}

interface TmdbTv {
  id: number;
  name: string;
  overview: string;
  first_air_date: string;
  vote_average: number;
  popularity: number;
  number_of_seasons?: number;
}

interface TmdbCredit {
  name: string;
}

interface TmdbMovieDetails extends TmdbMovie {
  credits?: { cast?: TmdbCredit[] };
}

interface TmdbTvDetails extends TmdbTv {
  credits?: { cast?: TmdbCredit[] };
}

interface TmdbListResponse<T> {
  results?: T[];
}

async function fetchTmdbSignals(): Promise<Array<{
  title: string;
  description: string;
  sourceUrl: string;
  metadata: Record<string, unknown>;
  expiresAt: Date;
  relevanceScore: number;
}>> {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    console.log("[entertainment] TMDB_API_KEY not set, skipping TMDB");
    return [];
  }

  const results: Array<{
    title: string;
    description: string;
    sourceUrl: string;
    metadata: Record<string, unknown>;
    expiresAt: Date;
    relevanceScore: number;
  }> = [];

  const base = "https://api.themoviedb.org/3";

  // Fetch all lists in parallel
  const [nowPlaying, upcoming, trendingMovies, trendingTv] = await Promise.all([
    fetch(`${base}/movie/now_playing?region=IN&language=en-IN&api_key=${key}`)
      .then((r) => r.json() as Promise<TmdbListResponse<TmdbMovie>>)
      .catch(() => ({ results: [] as TmdbMovie[] })),
    fetch(`${base}/movie/upcoming?region=IN&language=en-IN&api_key=${key}`)
      .then((r) => r.json() as Promise<TmdbListResponse<TmdbMovie>>)
      .catch(() => ({ results: [] as TmdbMovie[] })),
    fetch(`${base}/trending/movie/day?api_key=${key}`)
      .then((r) => r.json() as Promise<TmdbListResponse<TmdbMovie>>)
      .catch(() => ({ results: [] as TmdbMovie[] })),
    fetch(`${base}/trending/tv/day?api_key=${key}&language=en-IN`)
      .then((r) => r.json() as Promise<TmdbListResponse<TmdbTv>>)
      .catch(() => ({ results: [] as TmdbTv[] })),
  ]);

  // Process now-playing movies (top 5)
  for (const movie of (nowPlaying.results ?? []).slice(0, 5)) {
    try {
      const details = await fetch(
        `${base}/movie/${movie.id}?api_key=${key}&append_to_response=credits`
      )
        .then((r) => r.json() as Promise<TmdbMovieDetails>)
        .catch(() => movie as TmdbMovieDetails);

      const cast = (details.credits?.cast ?? []).slice(0, 5).map((c) => c.name);
      const releaseDate = new Date(movie.release_date);
      const daysSince = Math.floor(
        (Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const phase = detectPhase(daysSince);
      const hashtags = generateMovieHashtags(movie.title, cast);
      const relevanceScore = Math.min(
        100,
        Math.round(movie.popularity / 5) + (phase === "RELEASE_DAY" ? 30 : 0)
      );

      results.push({
        title: `🎬 Now Playing: ${movie.title}`,
        description: `${movie.overview?.slice(0, 200) ?? ""}. Phase: ${phase}. Stars: ${cast.slice(0, 3).join(", ") || "N/A"}.`,
        sourceUrl: `https://www.themoviedb.org/movie/${movie.id}`,
        metadata: {
          source: "TMDB",
          type: "NOW_PLAYING",
          movieId: movie.id,
          releaseDate: movie.release_date,
          voteAverage: movie.vote_average,
          phase,
          cast,
          hashtags,
          popularity: movie.popularity,
        },
        expiresAt: new Date(Date.now() + (phase === "RELEASE_DAY" ? 48 : 7 * 24) * 60 * 60 * 1000),
        relevanceScore,
      });
    } catch (e) {
      console.error(`[entertainment] TMDB movie details error for ${movie.id}:`, e);
    }
  }

  // Process upcoming movies (top 3)
  for (const movie of (upcoming.results ?? []).slice(0, 3)) {
    const releaseDate = new Date(movie.release_date);
    const daysUntil = Math.ceil(
      (releaseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil > 30) continue; // only next 30 days
    results.push({
      title: `📅 Upcoming: ${movie.title} (in ${daysUntil} days)`,
      description: `${movie.overview?.slice(0, 200) ?? ""}. Releasing on ${movie.release_date}.`,
      sourceUrl: `https://www.themoviedb.org/movie/${movie.id}`,
      metadata: {
        source: "TMDB",
        type: "UPCOMING",
        movieId: movie.id,
        releaseDate: movie.release_date,
        daysUntil,
      },
      expiresAt: releaseDate,
      relevanceScore: Math.min(80, Math.round(movie.popularity / 5)),
    });
  }

  // Process trending movies (top 3, skip already covered)
  const nowPlayingIds = new Set((nowPlaying.results ?? []).map((m) => m.id));
  for (const movie of (trendingMovies.results ?? []).slice(0, 3)) {
    if (nowPlayingIds.has(movie.id)) continue;
    results.push({
      title: `🔥 Trending Movie: ${movie.title}`,
      description: `${movie.overview?.slice(0, 200) ?? ""}. Rating: ${movie.vote_average}/10.`,
      sourceUrl: `https://www.themoviedb.org/movie/${movie.id}`,
      metadata: {
        source: "TMDB",
        type: "TRENDING_MOVIE",
        movieId: movie.id,
        popularity: movie.popularity,
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      relevanceScore: Math.min(75, Math.round(movie.popularity / 5)),
    });
  }

  // Process trending TV (top 3)
  for (const show of (trendingTv.results ?? []).slice(0, 3)) {
    try {
      const details = await fetch(
        `${base}/tv/${show.id}?api_key=${key}&append_to_response=credits,watch/providers`
      )
        .then((r) => r.json() as Promise<TmdbTvDetails>)
        .catch(() => show as TmdbTvDetails);

      const cast = (details.credits?.cast ?? []).slice(0, 5).map((c) => c.name);
      const season = details.number_of_seasons ?? 1;
      const hashtags = generateSeriesHashtags(show.name, season);

      results.push({
        title: `📺 Trending Series: ${show.name}`,
        description: `${show.overview?.slice(0, 200) ?? ""}. Season ${season}. Stars: ${cast.slice(0, 3).join(", ") || "N/A"}.`,
        sourceUrl: `https://www.themoviedb.org/tv/${show.id}`,
        metadata: {
          source: "TMDB",
          type: "TRENDING_TV",
          showId: show.id,
          season,
          cast,
          hashtags,
          popularity: show.popularity,
        },
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        relevanceScore: Math.min(70, Math.round(show.popularity / 5)),
      });
    } catch (e) {
      console.error(`[entertainment] TMDB TV details error for ${show.id}:`, e);
    }
  }

  return results;
}

// ─── YouTube Trending ─────────────────────────────────────────────────────────

interface YouTubeSnippet {
  title: string;
  description: string;
  publishedAt: string;
  channelTitle: string;
  tags?: string[];
}

interface YouTubeStatistics {
  viewCount: string;
  likeCount?: string;
}

interface YouTubeVideo {
  id: string;
  snippet: YouTubeSnippet;
  statistics: YouTubeStatistics;
}

interface YouTubeResponse {
  items?: YouTubeVideo[];
}

async function fetchYouTubeSignals(): Promise<Array<{
  title: string;
  description: string;
  sourceUrl: string;
  metadata: Record<string, unknown>;
  expiresAt: Date;
  relevanceScore: number;
}>> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    console.log("[entertainment] YOUTUBE_API_KEY not set, skipping YouTube");
    return [];
  }

  const results: Array<{
    title: string;
    description: string;
    sourceUrl: string;
    metadata: Record<string, unknown>;
    expiresAt: Date;
    relevanceScore: number;
  }> = [];

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?chart=mostPopular&regionCode=IN&videoCategoryId=24&maxResults=10&part=snippet,statistics&key=${key}`
    );
    const data = (await res.json()) as YouTubeResponse;

    for (const video of data.items ?? []) {
      const views = parseInt(video.statistics.viewCount ?? "0", 10);
      const publishedAt = new Date(video.snippet.publishedAt);
      const hoursOld = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
      const viewVelocity = hoursOld > 0 ? views / hoursOld : 0;

      const isTrailerWithHighViews =
        video.snippet.title.toLowerCase().includes("trailer") && views >= 5_000_000 && hoursOld <= 48;
      const isHighVelocity = viewVelocity > 300_000;

      if (!isTrailerWithHighViews && !isHighVelocity) continue;

      const relevanceScore = Math.min(
        95,
        Math.round(Math.log10(views + 1) * 15) + (isTrailerWithHighViews ? 20 : 0)
      );

      results.push({
        title: `▶️ Viral: ${video.snippet.title}`,
        description: `${video.snippet.description?.slice(0, 200) ?? ""}. ${views.toLocaleString()} views by ${video.snippet.channelTitle}.`,
        sourceUrl: `https://www.youtube.com/watch?v=${video.id}`,
        metadata: {
          source: "YouTube",
          videoId: video.id,
          views,
          viewVelocity: Math.round(viewVelocity),
          hoursOld: Math.round(hoursOld),
          channelTitle: video.snippet.channelTitle,
          tags: video.snippet.tags?.slice(0, 10) ?? [],
          isTrailer: isTrailerWithHighViews,
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        relevanceScore,
      });
    }
  } catch (e) {
    console.error("[entertainment] YouTube API error:", e);
  }

  return results;
}

// ─── Celebrity Birthdays ──────────────────────────────────────────────────────

function fetchBirthdaySignals(): Array<{
  title: string;
  description: string;
  sourceUrl: string;
  metadata: Record<string, unknown>;
  expiresAt: Date;
  relevanceScore: number;
}> {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayKey = `${mm}-${dd}`;

  return CELEBRITY_BIRTHDAYS
    .filter((c) => c.date === todayKey)
    .map((celebrity) => {
      const age = calculateAge(celebrity.birthYear);
      const relevanceScore =
        celebrity.fanBase === "massive" ? 90 :
        celebrity.fanBase === "large" ? 70 : 50;

      return {
        title: `🎂 Birthday: ${celebrity.name} turns ${age} today!`,
        description: `${celebrity.name} (${celebrity.category}) celebrates their ${age}th birthday today. Known for: ${celebrity.knownFor}. Iconic: ${celebrity.iconicRoles.slice(0, 2).join(", ")}.`,
        sourceUrl: `https://www.google.com/search?q=${encodeURIComponent(celebrity.name + " birthday")}`,
        metadata: {
          source: "CELEBRITY_BIRTHDAYS",
          celebrity: celebrity.name,
          category: celebrity.category,
          age,
          birthYear: celebrity.birthYear,
          knownFor: celebrity.knownFor,
          iconicRoles: celebrity.iconicRoles,
          fanBase: celebrity.fanBase,
          hashtags: [
            `#Happy${age}thBirthday`,
            `#${celebrity.name.replace(/\s+/g, "")}`,
            `#HappyBirthday${celebrity.name.split(" ")[0]}`,
            `#${celebrity.category}`,
          ],
        },
        expiresAt: endOfDay(),
        relevanceScore,
      };
    });
}

// ─── RSS Feeds ────────────────────────────────────────────────────────────────

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

function parseRssXml(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const extract = (tag: string): string => {
      // Try CDATA first
      const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
      const cdataMatch = cdataRe.exec(block);
      if (cdataMatch) return cdataMatch[1].trim();
      // Plain text
      const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
      const plainMatch = plainRe.exec(block);
      return plainMatch ? plainMatch[1].trim() : "";
    };

    const title = extract("title");
    const link = extract("link") || extract("guid");
    const pubDate = extract("pubDate");
    const description = extract("description");

    if (title && link) {
      items.push({ title, link, pubDate, description });
    }
  }

  return items;
}

async function fetchRssSignals(): Promise<Array<{
  title: string;
  description: string;
  sourceUrl: string;
  metadata: Record<string, unknown>;
  expiresAt: Date;
  relevanceScore: number;
}>> {
  const feeds = [
    { url: "https://www.bollywoodhungama.com/rss/", source: "Bollywood Hungama" },
    { url: "https://feeds.feedburner.com/ndtvmovies-latest", source: "NDTV Movies" },
  ];

  const results: Array<{
    title: string;
    description: string;
    sourceUrl: string;
    metadata: Record<string, unknown>;
    expiresAt: Date;
    relevanceScore: number;
  }> = [];

  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24h ago

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "StatusCraft/1.0 (RSS Reader)" },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        console.error(`[entertainment] RSS fetch failed for ${feed.source}: ${res.status}`);
        continue;
      }

      const xml = await res.text();
      const items = parseRssXml(xml);

      for (const item of items.slice(0, 10)) {
        const pubTime = item.pubDate ? new Date(item.pubDate).getTime() : 0;
        if (pubTime > 0 && pubTime < cutoff) continue; // older than 24h

        const cleanDesc = item.description
          .replace(/<[^>]+>/g, "") // strip HTML
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 200);

        results.push({
          title: `📰 ${item.title.replace(/<[^>]+>/g, "").trim()}`,
          description: `${cleanDesc} — via ${feed.source}`,
          sourceUrl: item.link,
          metadata: {
            source: feed.source,
            type: "RSS",
            pubDate: item.pubDate,
          },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          relevanceScore: 40,
        });
      }
    } catch (e) {
      console.error(`[entertainment] RSS error for ${feed.source}:`, e);
    }
  }

  return results;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function fetchEntertainmentSignals(): Promise<void> {
  console.log("[entertainment] Starting entertainment signal fetch...");

  const today = new Date().toISOString().split("T")[0];

  // Fetch all sources — each handles its own errors
  const [tmdbSignals, youtubeSignals, rssSignals] = await Promise.all([
    fetchTmdbSignals(),
    fetchYouTubeSignals(),
    fetchRssSignals(),
  ]);

  const birthdaySignals = fetchBirthdaySignals();

  const allSignals = [...tmdbSignals, ...youtubeSignals, ...birthdaySignals, ...rssSignals];

  // Deduplicate by title
  const seen = new Set<string>();
  const deduped = allSignals.filter((s) => {
    const key = s.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[entertainment] Storing ${deduped.length} signals (${tmdbSignals.length} TMDB, ${youtubeSignals.length} YouTube, ${birthdaySignals.length} birthdays, ${rssSignals.length} RSS)`);

  for (const signal of deduped) {
    const id = `ENTERTAINMENT-${signal.title}-${today}`;
    try {
      await prisma.signal.upsert({
        where: { id },
        create: {
          id,
          type: "TRENDING",
          title: signal.title,
          description: signal.description,
          sourceUrl: signal.sourceUrl,
          relevanceScore: signal.relevanceScore,
          metadata: signal.metadata as never,
          expiresAt: signal.expiresAt,
        },
        update: {
          description: signal.description,
          relevanceScore: signal.relevanceScore,
          metadata: signal.metadata as never,
          expiresAt: signal.expiresAt,
        },
      });
    } catch (e) {
      console.error(`[entertainment] Failed to upsert signal "${signal.title}":`, e);
    }
  }

  console.log("[entertainment] Done.");
}
