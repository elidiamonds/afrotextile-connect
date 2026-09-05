import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";

interface PinItem {
  title: string;
  image: string;
  link: string;
  date: string;
}

const TrendingNow = () => {
  const [pins, setPins] = useState<PinItem[]>([]);

  useEffect(() => {
    fetch("/api/trends?feed=nigerian")
      .then((r) => r.json())
      .then((d) => setPins((d.items || []).slice(0, 10)))
      .catch(() => {});
    // Auto-refresh every 5 minutes to stay current with the server's auto-pull
    const id = setInterval(() => {
      fetch("/api/trends?feed=nigerian")
        .then((r) => r.json())
        .then((d) => setPins((d.items || []).slice(0, 10)))
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (pins.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-serif font-bold text-foreground">Trending Now</h2>
          <span className="text-xs text-muted-foreground font-sans">Live from Pinterest · Nigerian fashion</span>
        </div>
        <Link to="/trends" className="text-sm text-primary font-sans hover:underline">View all</Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1">
        {pins.map((pin, i) => (
          <a
            key={i}
            href={pin.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex-shrink-0 w-40"
          >
            <div className="w-40 h-52 rounded-sm overflow-hidden bg-muted">
              <img
                src={pin.image}
                alt={pin.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <p className="text-xs font-sans text-muted-foreground mt-2 line-clamp-2 leading-snug">{pin.title}</p>
          </a>
        ))}
      </div>
    </section>
  );
};

export default TrendingNow;
