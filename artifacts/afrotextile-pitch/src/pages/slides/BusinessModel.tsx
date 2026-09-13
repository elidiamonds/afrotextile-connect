export default function BusinessModel() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(140deg, #0E0B07 60%, #13100A 100%)" }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-[0.2vh] bg-accent opacity-30" />
      <div className="absolute inset-0 flex flex-col" style={{ padding: "6vh 7vw 5vh" }}>
        <p
          className="font-body font-bold text-accent tracking-[0.3em] uppercase"
          style={{ fontSize: "2vw", flexShrink: 0, marginBottom: "1.5vh" }}
        >
          Business Model
        </p>
        <h2
          className="font-display font-black text-text leading-tight"
          style={{ fontSize: "4.5vw", flexShrink: 0, marginBottom: "1.5vh" }}
        >
          Three compounding revenue streams
        </h2>
        <div className="w-[6vw] h-[0.3vh] bg-primary" style={{ flexShrink: 0, marginBottom: "3vh" }} />
        <div className="flex gap-[3vw]" style={{ flex: 1, minHeight: 0 }}>
          <div
            className="flex-1 flex flex-col overflow-hidden"
            style={{ background: "#1A1510", padding: "3vh 3vw" }}
          >
            <p
              className="font-display font-black text-primary leading-none"
              style={{ fontSize: "7vw", flexShrink: 0, marginBottom: "1.5vh" }}
            >
              15%
            </p>
            <div className="w-[3vw] h-[0.25vh] bg-primary" style={{ flexShrink: 0, marginBottom: "2vh" }} />
            <p
              className="font-display font-bold text-text"
              style={{ fontSize: "2.8vw", flexShrink: 0, marginBottom: "1vh" }}
            >
              Transaction Commission
            </p>
            <p
              className="font-body text-muted leading-snug"
              style={{ fontSize: "2.4vw" }}
            >
              Applied to every sale. Scales with vendor GMV.
            </p>
          </div>
          <div
            className="flex-1 flex flex-col overflow-hidden"
            style={{ background: "#1A1510", padding: "3vh 3vw" }}
          >
            <p
              className="font-display font-black text-accent leading-none"
              style={{ fontSize: "7vw", flexShrink: 0, marginBottom: "1.5vh" }}
            >
              $49
            </p>
            <div className="w-[3vw] h-[0.25vh] bg-accent" style={{ flexShrink: 0, marginBottom: "2vh" }} />
            <p
              className="font-display font-bold text-text"
              style={{ fontSize: "2.8vw", flexShrink: 0, marginBottom: "1vh" }}
            >
              Vendor Subscriptions
            </p>
            <p
              className="font-body text-muted leading-snug"
              style={{ fontSize: "2.4vw" }}
            >
              Monthly per storefront. Unlocks analytics and promotional tools.
            </p>
          </div>
          <div
            className="flex-1 flex flex-col overflow-hidden"
            style={{ background: "#1A1510", padding: "3vh 3vw" }}
          >
            <p
              className="font-display font-black text-primary leading-none"
              style={{ fontSize: "7vw", flexShrink: 0, marginBottom: "1.5vh" }}
            >
              +
            </p>
            <div className="w-[3vw] h-[0.25vh] bg-primary" style={{ flexShrink: 0, marginBottom: "2vh" }} />
            <p
              className="font-display font-bold text-text"
              style={{ fontSize: "2.8vw", flexShrink: 0, marginBottom: "1vh" }}
            >
              Logistics Margin
            </p>
            <p
              className="font-body text-muted leading-snug"
              style={{ fontSize: "2.4vw" }}
            >
              Negotiated carrier rates with markup retained as blended margin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
