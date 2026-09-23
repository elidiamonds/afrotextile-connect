const base = import.meta.env.BASE_URL;

export default function Cover() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, #0E0B07 60%, #1A1208 100%)" }}
      />
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={`${base}cover-texture.png`}
          crossOrigin="anonymous"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
      </div>
      <div className="absolute top-0 left-0 w-[0.4vw] h-full bg-primary" />
      <div className="absolute top-0 right-[8vw] w-[0.15vw] h-full bg-primary opacity-20" />
      <div className="absolute top-0 right-[12vw] w-[0.08vw] h-full bg-primary opacity-10" />
      <div className="absolute bottom-0 left-0 right-0 h-[0.15vh] bg-primary opacity-30" />
      <div className="absolute inset-0 flex flex-col justify-center pl-[7vw] pr-[15vw]">
        <p
          className="font-body text-primary tracking-[0.35em] uppercase mb-[2.5vh]"
          style={{ fontSize: "2.2vw", letterSpacing: "0.35em" }}
        >
          Investor Presentation
        </p>
        <div className="flex items-center gap-[2.2vw] mb-[3vh]">
          <img
            src={`${base}brand/official-icon.png`}
            crossOrigin="anonymous"
            alt="Afrotextile official icon"
            className="w-[9vw] h-[9vw] object-contain shrink-0"
          />
          <h1
            className="font-body font-bold text-text tracking-[0.16em] leading-none"
            style={{ fontSize: "8.2vw", textWrap: "balance" }}
          >
            AFROTEXTILE
          </h1>
        </div>
        <div className="w-[8vw] h-[0.3vh] bg-primary mb-[3.5vh]" />
        <p
          className="font-display font-bold text-text leading-snug mb-[5vh]"
          style={{ fontSize: "3.5vw", textWrap: "balance" }}
        >
          Where African Craft Meets Global Commerce
        </p>
        <p
          className="font-body text-muted"
          style={{ fontSize: "2.4vw" }}
        >
          afrotextile.co
        </p>
      </div>
      <div className="absolute bottom-[4vh] right-[6vw]">
        <p
          className="font-body text-muted text-right"
          style={{ fontSize: "2.2vw" }}
        >
          Seed Round — 2026
        </p>
      </div>
    </div>
  );
}
