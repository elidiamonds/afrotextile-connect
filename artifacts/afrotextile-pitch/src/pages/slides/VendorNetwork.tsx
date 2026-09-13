export default function VendorNetwork() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(155deg, #0E0B07 60%, #14100A 100%)" }}
      />
      <div className="absolute top-0 right-0 w-[0.4vw] h-full bg-primary opacity-50" />
      <div className="absolute inset-0 flex" style={{ padding: "7vh 6vw 7vh 7vw", gap: "5vw" }}>
        <div className="flex flex-col justify-center" style={{ width: "42%", overflow: "hidden" }}>
          <p
            className="font-body font-bold text-accent tracking-[0.3em] uppercase mb-[1.5vh]"
            style={{ fontSize: "1.8vw" }}
          >
            Vendor Network
          </p>
          <h2
            className="font-display font-black text-text leading-none mb-[2vh]"
            style={{ fontSize: "4vw" }}
          >
            Six countries. Ten fabric traditions. One marketplace.
          </h2>
          <div className="w-[5vw] h-[0.3vh] bg-primary mb-[2.5vh]" />
          <p
            className="font-body text-muted leading-snug"
            style={{ fontSize: "2.5vw" }}
          >
            Our founding cohort spans Nigeria, Ghana, Mali, Zanzibar, and South Africa — expanding across all 54 African nations.
          </p>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-[2vw]">
          <div className="flex gap-[2vw]">
            <div
              className="flex-1 flex flex-col items-center justify-center"
              style={{ background: "#1A1510", padding: "3vh 2vw" }}
            >
              <p
                className="font-display font-black text-primary leading-none"
                style={{ fontSize: "9vw" }}
              >
                6
              </p>
              <p
                className="font-body text-muted text-center mt-[1vh]"
                style={{ fontSize: "2.4vw" }}
              >
                founding vendors
              </p>
            </div>
            <div
              className="flex-1 flex flex-col items-center justify-center"
              style={{ background: "#1A1510", padding: "3vh 2vw" }}
            >
              <p
                className="font-display font-black text-accent leading-none"
                style={{ fontSize: "9vw" }}
              >
                180+
              </p>
              <p
                className="font-body text-muted text-center mt-[1vh]"
                style={{ fontSize: "2.4vw" }}
              >
                products listed
              </p>
            </div>
          </div>
          <div className="flex gap-[2vw]">
            <div
              className="flex-1 flex flex-col items-center justify-center"
              style={{ background: "#1A1510", padding: "3vh 2vw" }}
            >
              <p
                className="font-display font-black text-primary leading-none"
                style={{ fontSize: "9vw" }}
              >
                10
              </p>
              <p
                className="font-body text-muted text-center mt-[1vh]"
                style={{ fontSize: "2.4vw" }}
              >
                fabric traditions
              </p>
            </div>
            <div
              className="flex-1 flex flex-col items-center justify-center"
              style={{ background: "#1A1510", padding: "3vh 2vw" }}
            >
              <p
                className="font-display font-black text-accent leading-none"
                style={{ fontSize: "9vw" }}
              >
                4.7
              </p>
              <p
                className="font-body text-muted text-center mt-[1vh]"
                style={{ fontSize: "2.4vw" }}
              >
                avg. vendor rating
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
