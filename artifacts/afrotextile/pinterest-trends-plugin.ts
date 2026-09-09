import type { Plugin } from "vite";

interface PinItem {
  title: string;
  image: string;
  link: string;
  date: string;
}

// Curated Nigerian fashion boards on Pinterest
const NIGERIAN_FEEDS = [
  "bukkysun/ankara-styles",
  "michelleogu4857/nigerian-fashion",
  "akosuagabriel/ankara-styles",
  "evylina/nigerian-fashion",
  "biskhid6/ankara-styles",
  "blesseddivas1/ankara-fashion",
];

// Broader pan-African fashion boards (prints, dresses, modern African style)
const AFRICAN_FEEDS = [
  "georginakquaye/african-dresses",
  "khozatina1/african-dress",
  "trini2hearttt/african-print-dresses",
  "newunderthesun/african-print-dresses",
  "ashantigoddess7/african-print",
];

const cache = new Map<string, { data: PinItem[]; at: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REFRESH_INTERVAL = 5 * 60 * 1000; // auto-pull every 5 minutes

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function parseRss(xml: string): PinItem[] {
  const items: PinItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = decodeEntities((block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim());
    const link = (block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim();
    const date = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "").trim();
    const desc = decodeEntities(block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "");
    const image = desc.match(/src="(https:\/\/i\.pinimg\.com[^"]+)"/)?.[1] ?? "";
    if (image) items.push({ title: title || "African fashion inspiration", image, link, date });
  }
  return items;
}

async function fetchFeed(feed: string): Promise<PinItem[]> {
  const safeFeed = feed.replace(/[^a-zA-Z0-9/_-]/g, "");
  const rssUrl = `https://www.pinterest.com/${safeFeed}.rss`;
  const r = await fetch(rssUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) return [];
  return parseRss(await r.text());
}

async function fetchNigerian(): Promise<PinItem[]> {
  const results = await Promise.all(NIGERIAN_FEEDS.map(fetchFeed));
  const seen = new Set<string>();
  return results.flat().filter((it) => {
    if (seen.has(it.image)) return false;
    seen.add(it.image);
    return true;
  });
}

async function fetchAfrican(): Promise<PinItem[]> {
  const results = await Promise.all(AFRICAN_FEEDS.map(fetchFeed));
  const seen = new Set<string>();
  return results.flat().filter((it) => {
    if (seen.has(it.image)) return false;
    seen.add(it.image);
    return true;
  });
}

export function pinterestTrendsPlugin(): Plugin {
  return {
    name: "pinterest-trends",
    configureServer(server) {
      // Automation: warm the Nigerian trends cache on startup and re-pull on a
      // schedule so product listings always reflect the latest inspiration.
      const warmCaches = async () => {
        try {
          const items = await fetchNigerian();
          cache.set("nigerian", { data: items, at: Date.now() });
        } catch {
          /* keep previous cache on failure */
        }
        try {
          const items = await fetchAfrican();
          cache.set("african", { data: items, at: Date.now() });
        } catch {
          /* keep previous cache on failure */
        }
      };
      warmCaches();
      const timer = setInterval(warmCaches, REFRESH_INTERVAL);
      server.httpServer?.on("close", () => clearInterval(timer));

      server.middlewares.use(async (req, res, next) => {
        const reqUrl = req.url ?? "";
        if (!reqUrl.startsWith("/api/trends")) return next();
        try {
          const parsed = new URL(reqUrl, "http://localhost");
          const feed = parsed.searchParams.get("feed") || "nigerian";

          if (feed === "nigerian" || feed === "african") {
            const cached = cache.get(feed);
            if (cached && Date.now() - cached.at < CACHE_TTL) {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ items: cached.data, source: feed, cached: true }));
              return;
            }
            const items = feed === "nigerian" ? await fetchNigerian() : await fetchAfrican();
            cache.set(feed, { data: items, at: Date.now() });
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ items, source: feed, cached: false }));
            return;
          }

          const safeFeed = feed.replace(/[^a-zA-Z0-9/_-]/g, "");
          const cached = cache.get(safeFeed);
          if (cached && Date.now() - cached.at < CACHE_TTL) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ items: cached.data, source: safeFeed, cached: true }));
            return;
          }
          const items = await fetchFeed(safeFeed);
          cache.set(safeFeed, { data: items, at: Date.now() });
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ items, source: safeFeed, cached: false }));
        } catch {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Failed to fetch trends" }));
        }
      });
    },
  };
}
