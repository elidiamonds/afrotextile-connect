import type { Plugin } from "vite";

interface PinItem {
  title: string;
  image: string;
  link: string;
  date: string;
}

const cache = new Map<string, { data: PinItem[]; at: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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
    if (image) items.push({ title: title || "Pinterest inspiration", image, link, date });
  }
  return items;
}

export function pinterestTrendsPlugin(): Plugin {
  return {
    name: "pinterest-trends",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const reqUrl = req.url ?? "";
        if (!reqUrl.startsWith("/api/trends")) return next();
        try {
          const parsed = new URL(reqUrl, "http://localhost");
          const feed = parsed.searchParams.get("feed") || "pinterest/fashion";
          const safeFeed = feed.replace(/[^a-zA-Z0-9/_-]/g, "");
          const rssUrl = `https://www.pinterest.com/${safeFeed}.rss`;

          const cached = cache.get(safeFeed);
          if (cached && Date.now() - cached.at < CACHE_TTL) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ items: cached.data, source: safeFeed, cached: true }));
            return;
          }

          const r = await fetch(rssUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
          if (!r.ok) {
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: `Pinterest feed returned ${r.status}` }));
            return;
          }
          const xml = await r.text();
          const items = parseRss(xml);
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
