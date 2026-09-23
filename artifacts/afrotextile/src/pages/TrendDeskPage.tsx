import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ArrowUpRight,
  Check,
  Clock3,
  Inbox,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  curatedTrendSignals,
  dedupeTrendSignals,
  getNigerianProduct,
  NIGERIAN_FASHION_PINTEREST_BOARD,
  TREND_DESK_STORAGE_KEY,
  TrendDecision,
  TrendSignal,
  TrendSignalStatus,
} from "@/data/trendDesk";
import { PinterestBoardEmbed } from "@/components/PinterestBoardEmbed";

type DeskFilter = TrendSignalStatus;
type Decisions = Record<string, TrendDecision>;

const readDecisions = (): Decisions => {
  try {
    const stored = window.localStorage.getItem(TREND_DESK_STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as Decisions;
  } catch {
    return {};
  }
};

const lagosDateLabel = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

const statusLabels: Record<DeskFilter, string> = {
  inbox: "Inbox",
  approved: "Approved",
  snoozed: "Snoozed",
  dismissed: "Dismissed",
};

const TrendDeskPage = () => {
  const signals = useMemo(() => dedupeTrendSignals(curatedTrendSignals), []);
  const [decisions, setDecisions] = useState<Decisions>({});
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<DeskFilter>("inbox");
  const [notice, setNotice] = useState("Desk ready for review.");

  useEffect(() => {
    setDecisions(readDecisions());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(TREND_DESK_STORAGE_KEY, JSON.stringify(decisions));
  }, [decisions, hydrated]);

  const visibleSignals = signals.filter((signal) => {
    const status = decisions[signal.id]?.status ?? "inbox";
    return status === filter;
  });

  const counts = signals.reduce<Record<DeskFilter, number>>(
    (acc, signal) => {
      const status = decisions[signal.id]?.status ?? "inbox";
      acc[status] += 1;
      return acc;
    },
    { inbox: 0, approved: 0, snoozed: 0, dismissed: 0 },
  );

  const updateSignal = (signal: TrendSignal, status: Exclude<TrendSignalStatus, "inbox">) => {
    setDecisions((current) => ({
      ...current,
      [signal.id]: { status, updatedAt: new Date().toISOString() },
    }));
    setNotice(
      status === "approved"
        ? `"${signal.title}" is ready for the Nigerian edit.`
        : status === "snoozed"
          ? `"${signal.title}" moved to Snoozed.`
          : `"${signal.title}" dismissed from today's desk.`,
    );
  };

  const restoreSignal = (signal: TrendSignal) => {
    setDecisions((current) => {
      const next = { ...current };
      delete next[signal.id];
      return next;
    });
    setNotice(`"${signal.title}" returned to Inbox.`);
  };

  const resetDesk = () => {
    setDecisions({});
    setFilter("inbox");
    setNotice("Review history cleared. The desk is fresh again.");
  };

  return (
    <main className="min-h-screen bg-background pb-20 pt-24">
      <div className="container mx-auto px-4">
        <section className="relative overflow-hidden border border-border bg-card px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border border-primary/20" />
          <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border border-primary/15" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_280px] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-5 flex flex-wrap items-center gap-3 text-[10px] font-sans uppercase tracking-[0.25em] text-primary">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Internal editor's notebook
                </span>
                <span className="text-muted-foreground">/</span>
                <span>Nigerian fashion</span>
              </div>
              <h1 className="max-w-2xl text-4xl font-serif font-medium leading-[1.04] text-foreground sm:text-6xl">
                The Trend <span className="italic text-primary">Desk</span>
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                A daily, human-curated edit of the colour, silhouette and craft signals shaping what we want to wear from Lagos outward.
              </p>
            </div>
            <div className="border-l border-primary/35 pl-5">
              <p className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] text-primary">
                <Clock3 className="h-3.5 w-3.5" /> Lagos time
              </p>
              <p className="mt-3 font-serif text-lg text-foreground" data-testid="text-refresh-date">
                Refreshed {lagosDateLabel()}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
              A considered editorial fallback, with an official Pinterest board for visual reference.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 border border-border bg-card p-5 sm:p-7" aria-labelledby="pinterest-trends-heading">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.25em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d60023]" />
              Pinterest inspiration
            </p>
            <h2 id="pinterest-trends-heading" className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">
              Nigerian Fashion Trends
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Discover Nigerian fashion inspiration and trends
            </p>
          </div>
          <div className="mt-6 overflow-hidden border border-border bg-background p-2 sm:p-4">
            <PinterestBoardEmbed boardUrl={NIGERIAN_FASHION_PINTEREST_BOARD} />
          </div>
        </section>

        <section className="mt-8 flex flex-col gap-5 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-sans uppercase tracking-[0.2em] text-primary">Review queue</p>
            <h2 className="mt-2 text-2xl font-serif text-foreground">Make the call.</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Trend signal status">
            {(Object.keys(statusLabels) as DeskFilter[]).map((status) => (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={filter === status}
                data-testid={`button-filter-${status}`}
                onClick={() => setFilter(status)}
                className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-sans uppercase tracking-wider transition-colors ${
                  filter === status
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:border-primary/60 hover:text-foreground"
                }`}
              >
                {statusLabels[status]}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filter === status ? "bg-primary-foreground/15" : "bg-muted"}`}>
                  {counts[status]}
                </span>
              </button>
            ))}
          </div>
        </section>

        <div aria-live="polite" data-testid="status-trend-desk" className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {notice}
        </div>

        {visibleSignals.length > 0 ? (
          <section className="mt-5 grid gap-4 lg:grid-cols-2" aria-label={`${statusLabels[filter]} trend signals`}>
            {visibleSignals.map((signal, index) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                status={decisions[signal.id]?.status ?? "inbox"}
                index={index}
                onApprove={() => updateSignal(signal, "approved")}
                onSnooze={() => updateSignal(signal, "snoozed")}
                onDismiss={() => updateSignal(signal, "dismissed")}
                onRestore={() => restoreSignal(signal)}
              />
            ))}
          </section>
        ) : (
          <EmptyDeskState filter={filter} onReset={resetDesk} />
        )}

        <footer className="mt-12 flex flex-col gap-4 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                 Source: curated desk / live Pinterest searches
          </p>
          <button
            type="button"
            onClick={resetDesk}
            data-testid="button-reset-trend-desk"
            className="inline-flex items-center gap-2 self-start font-sans uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary sm:self-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset review history
          </button>
        </footer>
      </div>
    </main>
  );
};

interface SignalCardProps {
  signal: TrendSignal;
  status: TrendSignalStatus;
  index: number;
  onApprove: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
  onRestore: () => void;
}

const SignalCard = ({ signal, status, index, onApprove, onSnooze, onDismiss, onRestore }: SignalCardProps) => {
  const product = getNigerianProduct(signal.productId);
  return (
    <article
      className="group relative overflow-hidden border border-border bg-card transition-colors duration-300 hover:border-primary/50"
      style={{ animation: `fadeUp 0.5s ease-out ${index * 70}ms both` }}
      data-testid={`card-trend-signal-${signal.id}`}
    >
      <div className="grid min-h-[230px] grid-cols-[112px_1fr] sm:grid-cols-[150px_1fr]">
        <div className="relative overflow-hidden bg-muted">
          {signal.image ? (
            <img src={signal.image} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center bg-pattern-african text-primary/50">
              <Sparkles className="h-7 w-7" />
            </div>
          )}
          <span className="absolute left-3 top-3 bg-background/85 px-2 py-1 text-[9px] font-sans uppercase tracking-widest text-primary backdrop-blur-sm">
            {signal.type}
          </span>
        </div>
        <div className="flex flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-primary">{signal.eyebrow}</p>
            {status !== "inbox" && <StatusMark status={status} />}
          </div>
          <h3 className="mt-3 font-serif text-xl leading-tight text-foreground sm:text-2xl">{signal.title}</h3>
          <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground sm:text-sm">{signal.note}</p>
          <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
            {signal.tags.map((tag) => (
              <span key={tag} className="border border-border px-2 py-1 text-[10px] font-sans uppercase tracking-wider text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3">
        <span className="text-[10px] font-sans uppercase tracking-wider text-muted-foreground">
          {signal.source} <span className="text-primary/70">·</span> {signal.sourceDetail}
        </span>
        <div className="flex items-center gap-1.5">
          {status === "inbox" && (
            <>
              <Button type="button" size="sm" variant="ghost" onClick={onSnooze} data-testid={`button-snooze-${signal.id}`} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                <Clock3 className="h-3.5 w-3.5" /> Snooze
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onDismiss} data-testid={`button-dismiss-${signal.id}`} className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" /> Dismiss
              </Button>
              <Button type="button" size="sm" onClick={onApprove} data-testid={`button-approve-${signal.id}`} className="h-8 px-3 text-xs">
                <Check className="h-3.5 w-3.5" /> Approve
              </Button>
            </>
          )}
          {status === "approved" && product && (
            <Button asChild type="button" size="sm" variant="outline" data-testid={`link-product-${signal.id}`} className="h-8 px-3 text-xs">
              <Link to={`/product/${product.id}`}>
                View product <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          {status === "approved" && !product && <span className="text-xs text-muted-foreground">No product linked yet</span>}
          {(status === "snoozed" || status === "dismissed") && (
            <Button type="button" size="sm" variant="outline" onClick={onRestore} data-testid={`button-restore-${signal.id}`} className="h-8 px-3 text-xs">
              <Inbox className="h-3.5 w-3.5" /> Return to inbox
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};

const StatusMark = ({ status }: { status: Exclude<TrendSignalStatus, "inbox"> }) => {
  const icon = status === "approved" ? <Check className="h-3 w-3" /> : status === "snoozed" ? <Clock3 className="h-3 w-3" /> : <Archive className="h-3 w-3" />;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-sans uppercase tracking-widest ${status === "approved" ? "text-primary" : "text-muted-foreground"}`}>
      {icon} {status}
    </span>
  );
};

const EmptyDeskState = ({ filter, onReset }: { filter: DeskFilter; onReset: () => void }) => (
  <div className="mt-5 border border-dashed border-border bg-card px-6 py-16 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 text-primary">
      {filter === "inbox" ? <Check className="h-5 w-5" /> : filter === "approved" ? <Sparkles className="h-5 w-5" /> : filter === "snoozed" ? <Clock3 className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
    </div>
    <h3 className="mt-5 font-serif text-2xl text-foreground">
      {filter === "inbox" ? "The inbox is clear." : `No ${statusLabels[filter].toLowerCase()} signals yet.`}
    </h3>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
      {filter === "inbox" ? "A clean desk is a good place to start tomorrow." : "Review another signal or return this view to the fresh desk."}
    </p>
    {filter !== "inbox" && (
      <Button type="button" variant="outline" onClick={onReset} data-testid="button-empty-reset" className="mt-6">
        <RotateCcw className="h-4 w-4" /> Reset review history
      </Button>
    )}
  </div>
);

export default TrendDeskPage;