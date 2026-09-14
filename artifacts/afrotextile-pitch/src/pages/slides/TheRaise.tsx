export default function TheRaise() {
  const base = import.meta.env.BASE_URL;

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(140deg, #0E0B07 55%, #1A1208 100%)" }}
      />
      <div className="absolute top-0 left-0 w-[0.4vw] h-full bg-primary" />
      <div
        className="absolute bottom-0 left-0 right-0 h-[0.8vh]"
        style={{ background: "linear-gradient(90deg, #C9A84C, #C4623A)" }}
      />
      <div className="absolute inset-0 flex" style={{ padding: "6vh 6vw 7vh 8vw", gap: "5vw" }}>
        <div className="flex flex-col justify-between" style={{ width: "38%" }}>
          <div>
            <p
              className="font-body font-bold text-accent tracking-[0.3em] uppercase mb-[1.5vh]"
              style={{ fontSize: "2.2vw" }}
            >
              The Raise
            </p>
            <p
              className="font-display font-black text-primary leading-none"
              style={{ fontSize: "10vw" }}
            >
              $3M
            </p>
            <p
              className="font-display font-bold text-text mb-[2vh]"
              style={{ fontSize: "3vw" }}
            >
              Seed Round
            </p>
            <div className="w-[5vw] h-[0.3vh] bg-primary mb-[2vh]" />
            <p
              className="font-body text-muted leading-snug"
              style={{ fontSize: "2.6vw" }}
            >
              18-month runway. Target: 100 vendor storefronts and mobile launch across three markets.
            </p>
          </div>
          <div className="flex items-center gap-[1vw]">
            <img
              src={`${base}brand/threaded-a-dark.svg`}
              crossOrigin="anonymous"
              alt="Afrotextile Threaded A mark"
              className="w-[3.2vw] h-[3.2vw] object-contain shrink-0"
            />
            <div>
              <p
                className="font-body font-bold text-text tracking-[0.16em]"
                style={{ fontSize: "2vw" }}
              >
                AFROTEXTILE
              </p>
              <p
                className="font-body text-muted"
                style={{ fontSize: "2.2vw" }}
              >
                invest@afrotextile.co
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-[2vh]">
          <p
            className="font-body font-bold text-muted tracking-widest uppercase mb-[0.5vh]"
            style={{ fontSize: "2.2vw" }}
          >
            Use of Funds
          </p>
          <div
            className="flex items-center gap-[2vw]"
            style={{ background: "#1A1510", padding: "2vh 2.5vw" }}
          >
            <p
              className="font-display font-black text-primary shrink-0"
              style={{ fontSize: "3.8vw", width: "7.5vw" }}
            >
              45%
            </p>
            <div>
              <p className="font-body font-bold text-text" style={{ fontSize: "2.8vw" }}>
                Product and Engineering
              </p>
              <p className="font-body text-muted" style={{ fontSize: "2.3vw" }}>
                Mobile app, vendor dashboard, logistics integration
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-[2vw]"
            style={{ background: "#1A1510", padding: "2vh 2.5vw" }}
          >
            <p
              className="font-display font-black text-accent shrink-0"
              style={{ fontSize: "3.8vw", width: "7.5vw" }}
            >
              30%
            </p>
            <div>
              <p className="font-body font-bold text-text" style={{ fontSize: "2.8vw" }}>
                Vendor Acquisition
              </p>
              <p className="font-body text-muted" style={{ fontSize: "2.3vw" }}>
                Onboarding team, travel, vendor support across Africa
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-[2vw]"
            style={{ background: "#1A1510", padding: "2vh 2.5vw" }}
          >
            <p
              className="font-display font-black text-primary shrink-0"
              style={{ fontSize: "3.8vw", width: "7.5vw" }}
            >
              25%
            </p>
            <div>
              <p className="font-body font-bold text-text" style={{ fontSize: "2.8vw" }}>
                Marketing and Operations
              </p>
              <p className="font-body text-muted" style={{ fontSize: "2.3vw" }}>
                Diaspora buyer acquisition, brand partnerships, infrastructure
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
