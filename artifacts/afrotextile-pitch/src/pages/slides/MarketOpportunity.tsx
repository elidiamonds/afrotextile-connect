export default function MarketOpportunity() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(125deg, #0E0B07 55%, #120C06 100%)" }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-[0.2vh] bg-primary opacity-25" />
      <div className="absolute inset-0 flex flex-col" style={{ padding: "6vh 6vw 5vh" }}>
        <p
          className="font-body font-bold text-accent tracking-[0.3em] uppercase"
          style={{ fontSize: "2vw", flexShrink: 0, marginBottom: "1vh" }}
        >
          Market Opportunity
        </p>
        <h2
          className="font-display font-black text-text leading-tight"
          style={{ fontSize: "3.8vw", flexShrink: 0, marginBottom: "1.5vh" }}
        >
          A billion-dollar category with no premium home online
        </h2>
        <div className="w-[6vw] h-[0.3vh] bg-primary" style={{ flexShrink: 0, marginBottom: "2.5vh" }} />
        <div className="flex gap-[2vw]" style={{ flex: 1, minHeight: 0 }}>
          <div
            className="flex-1 flex flex-col overflow-hidden"
            style={{ background: "#1A1510", borderTop: "0.35vh solid #C9A84C", padding: "2vh 2.5vw" }}
          >
            <p
              className="font-body font-bold text-muted tracking-widest uppercase"
              style={{ fontSize: "1.8vw", flexShrink: 0, marginBottom: "0.8vh" }}
            >
              African Fashion Industry
            </p>
            <p
              className="font-display font-black text-primary leading-none"
              style={{ fontSize: "7.5vw", flexShrink: 0, marginBottom: "1.5vh" }}
            >
              $31B+
            </p>
            <p
              className="font-body text-text leading-snug"
              style={{ fontSize: "2.4vw" }}
            >
              Annual market value — growing faster than global fashion averages.
            </p>
          </div>
          <div
            className="flex-1 flex flex-col overflow-hidden"
            style={{ background: "#1A1510", borderTop: "0.35vh solid #C4623A", padding: "2vh 2.5vw" }}
          >
            <p
              className="font-body font-bold text-muted tracking-widest uppercase"
              style={{ fontSize: "1.8vw", flexShrink: 0, marginBottom: "0.8vh" }}
            >
              African Diaspora
            </p>
            <p
              className="font-display font-black text-accent leading-none"
              style={{ fontSize: "7.5vw", flexShrink: 0, marginBottom: "1.5vh" }}
            >
              200M+
            </p>
            <p
              className="font-body text-text leading-snug"
              style={{ fontSize: "2.4vw" }}
            >
              High-purchasing-power audience with strong cultural identity demand.
            </p>
          </div>
          <div
            className="flex-1 flex flex-col overflow-hidden"
            style={{ background: "#1A1510", borderTop: "0.35vh solid #C9A84C", padding: "2vh 2.5vw" }}
          >
            <p
              className="font-body font-bold text-muted tracking-widest uppercase"
              style={{ fontSize: "1.8vw", flexShrink: 0, marginBottom: "0.8vh" }}
            >
              E-Commerce in Africa
            </p>
            <p
              className="font-display font-black text-primary leading-none"
              style={{ fontSize: "7.5vw", flexShrink: 0, marginBottom: "1.5vh" }}
            >
              29%
            </p>
            <p
              className="font-body text-text leading-snug"
              style={{ fontSize: "2.4vw" }}
            >
              Projected CAGR through 2028 as mobile internet penetration accelerates.
            </p>
          </div>
        </div>
        <p
          className="font-body text-muted"
          style={{ fontSize: "1.8vw", flexShrink: 0, marginTop: "1.5vh" }}
        >
          Sources: McKinsey Global Fashion Index; Statista Africa E-Commerce Report
        </p>
      </div>
    </div>
  );
}
