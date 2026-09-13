export default function Team() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(150deg, #0E0B07 60%, #14110A 100%)" }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-[0.2vh] bg-primary opacity-25" />
      <div className="absolute inset-0 flex flex-col" style={{ padding: "7vh 7vw 6vh" }}>
        <p
          className="font-body font-bold text-accent tracking-[0.3em] uppercase mb-[1.5vh]"
          style={{ fontSize: "2.2vw" }}
        >
          Founding Team
        </p>
        <h2
          className="font-display font-black text-text leading-tight mb-[2vh]"
          style={{ fontSize: "4.5vw" }}
        >
          Built by insiders who know both worlds
        </h2>
        <div className="w-[6vw] h-[0.3vh] bg-primary mb-[3.5vh]" />
        <div className="flex gap-[3vw]" style={{ flex: 1, minHeight: 0 }}>
          <div
            className="flex-1 flex flex-col"
            style={{ background: "#1A1510", padding: "2.5vh 2.5vw" }}
          >
            <div className="w-full mb-[1.5vh]" style={{ height: "0.35vh", background: "#C9A84C" }} />
            <p
              className="font-body font-bold text-muted tracking-widest uppercase mb-[0.8vh]"
              style={{ fontSize: "2.2vw" }}
            >
              CEO
            </p>
            <p
              className="font-display font-bold text-text mb-[1.5vh]"
              style={{ fontSize: "3.5vw" }}
            >
              Chioma A.
            </p>
            <p
              className="font-body text-muted leading-snug"
              style={{ fontSize: "2.4vw" }}
            >
              10 years in luxury fashion retail, Lagos to London. Former commercial partnerships lead at a pan-African fashion NGO.
            </p>
          </div>
          <div
            className="flex-1 flex flex-col"
            style={{ background: "#1A1510", padding: "2.5vh 2.5vw" }}
          >
            <div className="w-full mb-[1.5vh]" style={{ height: "0.35vh", background: "#C4623A" }} />
            <p
              className="font-body font-bold text-muted tracking-widest uppercase mb-[0.8vh]"
              style={{ fontSize: "2.2vw" }}
            >
              CTO
            </p>
            <p
              className="font-display font-bold text-text mb-[1.5vh]"
              style={{ fontSize: "3.5vw" }}
            >
              Kwame O.
            </p>
            <p
              className="font-body text-muted leading-snug"
              style={{ fontSize: "2.4vw" }}
            >
              Former engineering lead at a major pan-African e-commerce platform. Built cross-border payment rails across 12 African markets.
            </p>
          </div>
          <div
            className="flex-1 flex flex-col"
            style={{ background: "#1A1510", padding: "2.5vh 2.5vw" }}
          >
            <div className="w-full mb-[1.5vh]" style={{ height: "0.35vh", background: "#C9A84C" }} />
            <p
              className="font-body font-bold text-muted tracking-widest uppercase mb-[0.8vh]"
              style={{ fontSize: "2.2vw" }}
            >
              Vendor Partnerships
            </p>
            <p
              className="font-display font-bold text-text mb-[1.5vh]"
              style={{ fontSize: "3.5vw" }}
            >
              Fatou D.
            </p>
            <p
              className="font-body text-muted leading-snug"
              style={{ fontSize: "2.4vw" }}
            >
              Based in Accra. 8 years onboarding artisan brands across West Africa for international wholesale buyers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
