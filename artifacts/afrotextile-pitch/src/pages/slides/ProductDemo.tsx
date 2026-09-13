const base = import.meta.env.BASE_URL;

export default function ProductDemo() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(155deg, #0E0B07 60%, #100D09 100%)" }}
      />
      <div className="absolute top-0 left-0 w-[0.4vw] h-full bg-primary" />
      <div className="absolute inset-0 flex flex-col" style={{ padding: "6vh 7vw 5vh" }}>
        <p
          className="font-body font-bold text-accent tracking-[0.3em] uppercase"
          style={{ fontSize: "2.2vw", flexShrink: 0, marginBottom: "1.5vh" }}
        >
          Product Demo
        </p>
        <h2
          className="font-display font-black text-text leading-tight"
          style={{ fontSize: "4.2vw", flexShrink: 0, marginBottom: "1.5vh" }}
        >
          Live today. Polished for launch.
        </h2>
        <div className="w-[6vw] h-[0.3vh] bg-primary" style={{ flexShrink: 0, marginBottom: "3vh" }} />
        <div className="flex" style={{ flex: 1, minHeight: 0, gap: "3vw" }}>
          <div className="flex flex-col" style={{ flex: 1, minHeight: 0, gap: "1.5vh" }}>
            <p
              className="font-body font-bold text-muted tracking-widest uppercase"
              style={{ fontSize: "2vw", flexShrink: 0 }}
            >
              Home — Hero & Discovery
            </p>
            <div
              className="flex-1 overflow-hidden"
              style={{
                border: "0.2vw solid #C9A84C",
                borderRadius: "0.8vw",
                boxShadow: "0 0 4vw rgba(201,168,76,0.15)",
              }}
            >
              <img
                src={`${base}demo-web-home.jpg`}
                alt="Afrotextile home page"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
              />
            </div>
          </div>
          <div className="flex flex-col" style={{ flex: 1, minHeight: 0, gap: "1.5vh" }}>
            <p
              className="font-body font-bold text-muted tracking-widest uppercase"
              style={{ fontSize: "2vw", flexShrink: 0 }}
            >
              Shop — Product Grid & Filters
            </p>
            <div
              className="flex-1 overflow-hidden"
              style={{
                border: "0.2vw solid #C4623A",
                borderRadius: "0.8vw",
                boxShadow: "0 0 4vw rgba(196,98,58,0.12)",
              }}
            >
              <img
                src={`${base}demo-web-shop.jpg`}
                alt="Afrotextile shop page"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
