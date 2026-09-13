export default function Problem() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(160deg, #0E0B07 70%, #160D08 100%)" }}
      />
      <div className="absolute top-0 right-0 w-[0.4vw] h-full bg-accent opacity-60" />
      <div className="absolute inset-0 flex flex-col justify-center pl-[7vw] pr-[10vw]">
        <p
          className="font-body font-bold text-accent tracking-[0.3em] uppercase mb-[2vh]"
          style={{ fontSize: "2.2vw" }}
        >
          The Problem
        </p>
        <h2
          className="font-display font-black text-text leading-tight mb-[2vh]"
          style={{ fontSize: "4.5vw", textWrap: "balance" }}
        >
          African designers create for the world. The world cannot reach them.
        </h2>
        <div className="w-[6vw] h-[0.3vh] bg-primary mb-[3.5vh]" />
        <div className="flex flex-col gap-[2vh]">
          <div className="flex items-start gap-[2.5vw]">
            <span
              className="font-display font-black text-primary shrink-0 leading-none"
              style={{ fontSize: "3.2vw" }}
            >
              01
            </span>
            <p
              className="font-body text-text leading-snug"
              style={{ fontSize: "2.8vw" }}
            >
              African fashion houses sell locally. Global buyers have no trusted way to discover or purchase their work.
            </p>
          </div>
          <div className="flex items-start gap-[2.5vw]">
            <span
              className="font-display font-black text-primary shrink-0 leading-none"
              style={{ fontSize: "3.2vw" }}
            >
              02
            </span>
            <p
              className="font-body text-text leading-snug"
              style={{ fontSize: "2.8vw" }}
            >
              General marketplaces commoditize luxury craft — no infrastructure for African textiles, sizing, or cross-border logistics.
            </p>
          </div>
          <div className="flex items-start gap-[2.5vw]">
            <span
              className="font-display font-black text-primary shrink-0 leading-none"
              style={{ fontSize: "3.2vw" }}
            >
              03
            </span>
            <p
              className="font-body text-text leading-snug"
              style={{ fontSize: "2.8vw" }}
            >
              200M+ African diaspora buyers seek heritage fashion — with no dedicated channel to reach them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
