export default function Platform() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(160deg, #0E0B07 65%, #12100A 100%)" }}
      />
      <div className="absolute inset-0 flex" style={{ padding: "7vh 7vw", gap: "5vw" }}>
        <div className="flex flex-col" style={{ width: "42%" }}>
          <p
            className="font-body font-bold text-accent tracking-[0.3em] uppercase"
            style={{ fontSize: "2.2vw", flexShrink: 0, marginBottom: "1.5vh" }}
          >
            The Platform
          </p>
          <h2
            className="font-display font-black text-text leading-none"
            style={{ fontSize: "3.6vw", flexShrink: 0, marginBottom: "1.5vh" }}
          >
            Web and mobile, built for discovery
          </h2>
          <div className="w-[5vw] h-[0.3vh] bg-primary" style={{ flexShrink: 0, marginBottom: "2vh" }} />
          <div className="flex flex-col" style={{ gap: "1.5vh" }}>
            <div>
              <p className="font-display font-bold text-primary" style={{ fontSize: "2.6vw", marginBottom: "0.3vh" }}>
                Vendor Storefronts
              </p>
              <p className="font-body text-muted leading-snug" style={{ fontSize: "2.1vw" }}>
                Each designer gets a branded home — product grid, story, fabric heritage, and shipping settings.
              </p>
            </div>
            <div>
              <p className="font-display font-bold text-primary" style={{ fontSize: "2.6vw", marginBottom: "0.3vh" }}>
                Smart Filtering
              </p>
              <p className="font-body text-muted leading-snug" style={{ fontSize: "2.1vw" }}>
                Browse by fabric type (Ankara, Kente, Mudcloth), region, price, and occasion.
              </p>
            </div>
            <div>
              <p className="font-display font-bold text-primary" style={{ fontSize: "2.6vw", marginBottom: "0.3vh" }}>
                Cart, Wishlist, Global Checkout
              </p>
              <p className="font-body text-muted leading-snug" style={{ fontSize: "2.1vw" }}>
                Multi-vendor cart with international payment and unified order tracking.
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden" style={{ gap: "1.8vh", paddingLeft: "2vw" }}>
          <div
            className="flex flex-col overflow-hidden"
            style={{ background: "#1A1510", borderLeft: "0.4vw solid #C9A84C", padding: "2vh 2.5vw", flex: 1 }}
          >
            <p
              className="font-body font-bold text-muted tracking-widest uppercase"
              style={{ fontSize: "1.9vw", flexShrink: 0, marginBottom: "0.8vh" }}
            >
              Web App
            </p>
            <p className="font-display font-bold text-text leading-snug" style={{ fontSize: "2.4vw" }}>
              Full marketplace experience — discovery, browsing, and purchase across all categories.
            </p>
          </div>
          <div
            className="flex flex-col overflow-hidden"
            style={{ background: "#1A1510", borderLeft: "0.4vw solid #C4623A", padding: "2vh 2.5vw", flex: 1 }}
          >
            <p
              className="font-body font-bold text-muted tracking-widest uppercase"
              style={{ fontSize: "1.9vw", flexShrink: 0, marginBottom: "0.8vh" }}
            >
              Mobile App
            </p>
            <p className="font-display font-bold text-text leading-snug" style={{ fontSize: "2.4vw" }}>
              Native iOS and Android — on-the-go browsing, wishlist curation, and push notifications.
            </p>
          </div>
          <div
            className="flex flex-col overflow-hidden"
            style={{ background: "#1A1510", borderLeft: "0.4vw solid #C9A84C", padding: "2vh 2.5vw", flex: 1 }}
          >
            <p
              className="font-body font-bold text-muted tracking-widest uppercase"
              style={{ fontSize: "1.9vw", flexShrink: 0, marginBottom: "0.8vh" }}
            >
              Vendor Dashboard
            </p>
            <p className="font-display font-bold text-text leading-snug" style={{ fontSize: "2.4vw" }}>
              Self-serve storefront management, order tracking, analytics, and payout controls.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
