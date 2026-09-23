export default function Competitive() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(140deg, #0E0B07 60%, #130E0A 100%)" }}
      />
      <div className="absolute top-0 left-0 w-[0.4vw] h-full bg-primary" />
      <div className="absolute inset-0 flex flex-col" style={{ padding: "7vh 7vw 6vh" }}>
        <p
          className="font-body font-bold text-accent tracking-[0.3em] uppercase"
          style={{ fontSize: "2.2vw", flexShrink: 0, marginBottom: "1.5vh" }}
        >
          Competitive Position
        </p>
        <h2
          className="font-display font-black text-text leading-tight"
          style={{ fontSize: "4.5vw", flexShrink: 0, marginBottom: "1.5vh" }}
        >
          Built for this category. Not adapted to it.
        </h2>
        <div className="w-[6vw] h-[0.3vh] bg-primary" style={{ flexShrink: 0, marginBottom: "2.5vh" }} />
        <div className="flex gap-[4vw]" style={{ flex: 1, minHeight: 0 }}>
          <div
            className="flex-1 flex flex-col overflow-hidden"
            style={{ background: "#1A1510", borderTop: "0.3vh solid #8B7355", padding: "2vh 3vw" }}
          >
            <p
              className="font-body font-bold text-muted tracking-widest uppercase"
              style={{ fontSize: "2.2vw", flexShrink: 0, marginBottom: "1.5vh" }}
            >
              General Platforms
            </p>
            <div className="flex flex-col" style={{ gap: "1.2vh" }}>
              <div className="flex items-start" style={{ gap: "1.5vw" }}>
                <span className="font-body font-bold text-muted shrink-0" style={{ fontSize: "2.2vw" }}>—</span>
                <p className="font-body text-muted" style={{ fontSize: "2.2vw" }}>
                  African sellers lost in commodity search results
                </p>
              </div>
              <div className="flex items-start" style={{ gap: "1.5vw" }}>
                <span className="font-body font-bold text-muted shrink-0" style={{ fontSize: "2.2vw" }}>—</span>
                <p className="font-body text-muted" style={{ fontSize: "2.2vw" }}>
                  No fabric taxonomy or cultural context
                </p>
              </div>
              <div className="flex items-start" style={{ gap: "1.5vw" }}>
                <span className="font-body font-bold text-muted shrink-0" style={{ fontSize: "2.2vw" }}>—</span>
                <p className="font-body text-muted" style={{ fontSize: "2.2vw" }}>
                  No Africa-optimized payment or logistics rails
                </p>
              </div>
              <div className="flex items-start" style={{ gap: "1.5vw" }}>
                <span className="font-body font-bold text-muted shrink-0" style={{ fontSize: "2.2vw" }}>—</span>
                <p className="font-body text-muted" style={{ fontSize: "2.2vw" }}>
                  Luxury undermined by adjacent mass market goods
                </p>
              </div>
            </div>
          </div>
          <div
            className="flex-1 flex flex-col overflow-hidden"
            style={{ background: "#1A1510", borderTop: "0.3vh solid #C9A84C", padding: "2vh 3vw" }}
          >
            <div className="flex items-center gap-[1.2vw]" style={{ flexShrink: 0, marginBottom: "1.5vh" }}>
              <img
                src={`${import.meta.env.BASE_URL}brand/official-icon.png`}
                crossOrigin="anonymous"
                alt="Afrotextile official icon"
                className="w-[3.2vw] h-[3.2vw] object-contain shrink-0"
              />
              <p
                className="font-body font-bold text-primary tracking-[0.16em] uppercase"
                style={{ fontSize: "2.2vw" }}
              >
                AFROTEXTILE
              </p>
            </div>
            <div className="flex flex-col" style={{ gap: "1.2vh" }}>
              <div className="flex items-start" style={{ gap: "1.5vw" }}>
                <span className="font-display font-black text-primary shrink-0" style={{ fontSize: "2.2vw" }}>+</span>
                <p className="font-body text-text" style={{ fontSize: "2.2vw" }}>
                  Curated, vetted African designers with full brand presence
                </p>
              </div>
              <div className="flex items-start" style={{ gap: "1.5vw" }}>
                <span className="font-display font-black text-primary shrink-0" style={{ fontSize: "2.2vw" }}>+</span>
                <p className="font-body text-text" style={{ fontSize: "2.2vw" }}>
                  Deep fabric and regional taxonomy built into discovery
                </p>
              </div>
              <div className="flex items-start" style={{ gap: "1.5vw" }}>
                <span className="font-display font-black text-primary shrink-0" style={{ fontSize: "2.2vw" }}>+</span>
                <p className="font-body text-text" style={{ fontSize: "2.2vw" }}>
                  Payments, logistics, and compliance tuned for Africa
                </p>
              </div>
              <div className="flex items-start" style={{ gap: "1.5vw" }}>
                <span className="font-display font-black text-primary shrink-0" style={{ fontSize: "2.2vw" }}>+</span>
                <p className="font-body text-text" style={{ fontSize: "2.2vw" }}>
                  Premium positioning — curated, never mass market
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
