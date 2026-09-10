import type { Plugin } from "vite";

interface PinItem {
  title: string;
  image: string;
  link: string;
  date: string;
  source: "Nigerian" | "African";
}

// Curated Nigerian fashion boards on Pinterest — prioritised over all others
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
const DAY = 24 * 60 * 60 * 1000;
// Daily cadence: the cache is only refreshed by the scheduled daily task (or a
// manual forced refresh), so Pinterest is pulled once per day per feed.
const CACHE_TTL = DAY;
// Automatic task: re-pull every board once a day.
const REFRESH_INTERVAL = DAY;

let lastRefreshedAt: number | null = null;
let nextRefreshAt: number | null = null;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function parseRss(xml: string, source: PinItem["source"]): PinItem[] {
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
    if (image) items.push({ title: title || "African fashion inspiration", image, link, date, source });
  }
  return items;
}

// Newest trends first — sort every feed by publish date descending.
function sortByNewest(items: PinItem[]): PinItem[] {
  return items.sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
  );
}

function dedupe(items: PinItem[]): PinItem[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    if (seen.has(it.image)) return false;
    seen.add(it.image);
    return true;
  });
}

async function fetchFeed(feed: string, source: PinItem["source"]): Promise<PinItem[]> {
  const safeFeed = feed.replace(/[^a-zA-Z0-9/_-]/g, "");
  const rssUrl = `https://www.pinterest.com/${safeFeed}.rss`;
  const r = await fetch(rssUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) return [];
  return parseRss(await r.text(), source);
}

async function fetchNigerian(): Promise<PinItem[]> {
  const results = await Promise.all(NIGERIAN_FEEDS.map((f) => fetchFeed(f, "Nigerian")));
  return sortByNewest(dedupe(results.flat()));
}

async function fetchAfrican(): Promise<PinItem[]> {
  const results = await Promise.all(AFRICAN_FEEDS.map((f) => fetchFeed(f, "African")));
  return sortByNewest(dedupe(results.flat()));
}

// Combined African feed with Nigerian trends prioritised: Nigerian items come
// first (newest-first), then pan-African items (newest-first), deduped across both.
function buildCombined(nigerian: PinItem[], african: PinItem[]): PinItem[] {
  const seen = new Set<string>();
  const out: PinItem[] = [];
  for (const it of nigerian) {
    if (!seen.has(it.image)) {
      seen.add(it.image);
      out.push(it);
    }
  }
  for (const it of african) {
    if (!seen.has(it.image)) {
      seen.add(it.image);
      out.push(it);
    }
  }
  return out;
}

async function refreshAll(): Promise<void> {
  const nigerian = await fetchNigerian();
  cache.set("nigerian", { data: nigerian, at: Date.now() });
  const african = await fetchAfrican();
  cache.set("african", { data: african, at: Date.now() });
  cache.set("combined", { data: buildCombined(nigerian, african), at: Date.now() });
  lastRefreshedAt = Date.now();
  nextRefreshAt = lastRefreshedAt + REFRESH_INTERVAL;
}

export function pinterestTrendsPlugin(): Plugin {
  return {
    name: "pinterest-trends",
    configureServer(server) {
      // Automatic daily task: warm all feeds on startup, then re-pull once a day
      // so the app always shows the newest African (Nigerian-first) trends.
      const warmCaches = async () => {
        try {
          await refreshAll();
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
          const feed = parsed.searchParams.get("feed") || "combined";
          const force = parsed.searchParams.get("refresh") === "1";

          const serve = (items: PinItem[], source: string, cached: boolean) => {
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                items,
                source,
                cached,
                lastRefreshed: lastRefreshedAt ? new Date(lastRefreshedAt).toISOString() : null,
                nextRefreshIn: nextRefreshAt ? Math.max(0, nextRefreshAt - Date.now()) : null,
                refreshIntervalHours: REFRESH_INTERVAL / (60 * 60 * 1000),
              }),
            );
          };

          // Built-in feeds: combined (Nigerian-first), nigerian, african
          if (feed === "combined" || feed === "nigerian" || feed === "african") {
            const cached = cache.get(feed);
            if (!force && cached && Date.now() - cached.at < CACHE_TTL) {
              serve(cached.data, feed, true);
              return;
            }
            // Fresh pull (forced refresh or stale cache)
            const nigerian = feed === "african" ? await fetchAfrican() : await fetchNigerian();
            if (feed === "nigerian") {
              cache.set("nigerian", { data: nigerian, at: Date.now() });
              serve(nigerian, "nigerian", false);
              return;
            }
            if (feed === "african") {
              cache.set("african", { data: nigerian, at: Date.now() });
              serve(nigerian, "african", false);
              return;
            }
            // combined
            const african = await fetchAfrican();
            const combined = buildCombined(nigerian, african);
            cache.set("combined", { data: combined, at: Date.now() });
            cache.set("nigerian", { data: nigerian, at: Date.now() });
            cache.set("african", { data: african, at: Date.now() });
            lastRefreshedAt = Date.now();
            nextRefreshAt = lastRefreshedAt + REFRESH_INTERVAL;
            serve(combined, "combined", false);
            return;
          }

          // Custom board
          const safeFeed = feed.replace(/[^a-zA-Z0-9/_-]/g, "");
          const cached = cache.get(safeFeed);
          if (!force && cached && Date.now() - cached.at < CACHE_TTL) {
            serve(cached.data, safeFeed, true);
            return;
          }
          const items = sortByNewest(dedupe(await fetchFeed(safeFeed, "African")));
          cache.set(safeFeed, { data: items, at: Date.now() });
          serve(items, safeFeed, false);
        } catch {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Failed to fetch trends" }));
        }
      });
    },
  };
}
