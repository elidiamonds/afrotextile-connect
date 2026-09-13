export default function SocialProof() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(145deg, #0E0B07 50%, #1A0E08 100%)" }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-[1vh]"
        style={{ background: "linear-gradient(90deg, #C9A84C, #C4623A, #C9A84C)" }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-[1vh]"
        style={{ background: "linear-gradient(90deg, #C9A84C, #C4623A, #C9A84C)" }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-[10vw]">
        <p
          className="font-display font-black text-primary leading-none mb-[3vh]"
          style={{ fontSize: "8vw" }}
        >
          "
        </p>
        <p
          className="font-display font-bold text-text text-center leading-snug mb-[5vh]"
          style={{ fontSize: "4vw", textWrap: "balance" }}
        >
          Afrotextile gave my small Lagos atelier a global stage. I went from 8 local clients to 400+ international customers in six months.
        </p>
        <div className="w-[6vw] h-[0.3vh] bg-primary mb-[3.5vh]" />
        <p
          className="font-body font-bold text-text text-center"
          style={{ fontSize: "3vw" }}
        >
          Adunni O.
        </p>
        <p
          className="font-body text-muted text-center mt-[1vh]"
          style={{ fontSize: "2.8vw" }}
        >
          Vendor — Adunni Couture, Lagos, Nigeria
        </p>
      </div>
    </div>
  );
}
