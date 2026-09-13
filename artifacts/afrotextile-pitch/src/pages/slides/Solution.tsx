export default function Solution() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(150deg, #0E0B07 60%, #14100A 100%)" }}
      />
      <div className="absolute top-0 left-0 w-[0.4vw] h-full bg-primary" />
      <div className="absolute inset-0 flex flex-col" style={{ padding: "8vh 10vw 6vh 7vw" }}>
        <p
          className="font-body font-bold text-accent tracking-[0.3em] uppercase"
          style={{ fontSize: "2.2vw", flexShrink: 0, marginBottom: "2vh" }}
        >
          Our Solution
        </p>
        <h2
          className="font-display font-black text-text leading-tight"
          style={{ fontSize: "4.2vw", flexShrink: 0, marginBottom: "2vh" }}
        >
          One platform. Every African designer. Every global buyer.
        </h2>
        <div className="w-[6vw] h-[0.3vh] bg-primary" style={{ flexShrink: 0, marginBottom: "3vh" }} />
        <div className="flex flex-col" style={{ gap: "1.8vh" }}>
          <div className="flex items-start" style={{ gap: "2.5vw" }}>
            <div className="w-[0.5vw] shrink-0 mt-[0.3vh]" style={{ height: "3vh", background: "#C9A84C" }} />
            <div>
              <p className="font-display font-bold text-text" style={{ fontSize: "2.8vw", marginBottom: "0.4vh" }}>
                Curated Luxury Marketplace
              </p>
              <p className="font-body text-muted leading-snug" style={{ fontSize: "2.2vw" }}>
                Vetted African fashion vendors with full storefronts, fabric authentication, and cultural context.
              </p>
            </div>
          </div>
          <div className="flex items-start" style={{ gap: "2.5vw" }}>
            <div className="w-[0.5vw] shrink-0 mt-[0.3vh]" style={{ height: "3vh", background: "#C4623A" }} />
            <div>
              <p className="font-display font-bold text-text" style={{ fontSize: "2.8vw", marginBottom: "0.4vh" }}>
                Global Commerce Infrastructure
              </p>
              <p className="font-body text-muted leading-snug" style={{ fontSize: "2.2vw" }}>
                International payments, cross-border logistics, local sizing — built for African fashion from day one.
              </p>
            </div>
          </div>
          <div className="flex items-start" style={{ gap: "2.5vw" }}>
            <div className="w-[0.5vw] shrink-0 mt-[0.3vh]" style={{ height: "3vh", background: "#C9A84C" }} />
            <div>
              <p className="font-display font-bold text-text" style={{ fontSize: "2.8vw", marginBottom: "0.4vh" }}>
                Cultural Discovery Engine
              </p>
              <p className="font-body text-muted leading-snug" style={{ fontSize: "2.2vw" }}>
                Browse by fabric type, region, and tradition — connecting buyers to the story behind what they wear.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
