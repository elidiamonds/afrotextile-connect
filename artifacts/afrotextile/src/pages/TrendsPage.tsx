import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ExternalLink, Search, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface PinItem {
  title: string;
  image: string;
  link: string;
  date: string;
}

interface TrendsResponse {
  items: PinItem[];
  source: string;
  cached?: boolean;
  error?: string;
}

const PRESETS = [
  { label: "Nigerian Fashion", feed: "nigerian" },
  { label: "Fashion", feed: "african" },
];

const TrendsPage = () => {
  const [feed, setFeed] = useState("nigerian");
  const [custom, setCustom] = useState("");
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTrends = useCallback(async (f: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/trends?feed=${encodeURIComponent(f)}`);
      const json: TrendsResponse = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load trends");
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setError("Could not reach the trends service.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends(feed);
  }, [feed, fetchTrends]);

  // Auto-refresh so the board stays current with the server's scheduled pulls
  useEffect(() => {
    const id = setInterval(() => fetchTrends(feed), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [feed, fetchTrends]);

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custom.trim()) return;
    setFeed(custom.trim().replace(/^https?:\/\/(www\.)?pinterest\.com\//, "").replace(/\.rss$/, ""));
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Live Inspiration</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">Trend Inspiration</h1>
          <p className="text-muted-foreground font-sans max-w-2xl">
            Fresh fashion styles fetched live from Pinterest boards to keep your product listings aligned with current trends.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.feed}
                onClick={() => setFeed(p.feed)}
                className={`px-4 h-10 rounded-md text-sm font-sans border transition-colors ${
                  feed === p.feed
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted text-foreground hover:border-primary"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleCustomSearch} className="flex gap-2 flex-1 md:max-w-md">
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Custom board — e.g. username/board"
              className="font-sans"
            />
            <Button type="submit" variant="heroOutline" size="icon" aria-label="Search board">
              <Search className="w-4 h-4" />
            </Button>
          </form>
          <Button variant="hero" onClick={() => fetchTrends(feed)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive font-sans text-sm mb-6">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {data && (
          <div className="flex items-center gap-3 mb-6">
            <Badge variant="outline" className="font-sans text-xs uppercase tracking-wider">
              {data.items.length} pins
            </Badge>
            {data.cached && <span className="text-xs text-muted-foreground font-sans">from cache</span>}
          </div>
        )}

        {/* Masonry grid */}
        {loading && !data ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-muted rounded-sm animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
            {data?.items.map((pin, i) => (
              <a
                key={i}
                href={pin.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group mb-4 block break-inside-avoid relative overflow-hidden rounded-sm bg-muted"
              >
                <img
                  src={pin.image}
                  alt={pin.title}
                  loading="lazy"
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs font-sans text-foreground line-clamp-2 leading-snug">{pin.title}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary font-sans mt-1">
                    View on Pinterest <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}

        {data && data.items.length === 0 && !error && (
          <p className="text-center py-20 text-muted-foreground font-sans">No pins found for this board.</p>
        )}
      </div>
    </div>
  );
};

export default TrendsPage;
