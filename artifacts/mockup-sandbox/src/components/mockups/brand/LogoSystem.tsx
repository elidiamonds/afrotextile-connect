import React from "react";

const assetPath = (name: string) => `/__mockup/images/brand-marks/${name}.svg`;

type MarkProps = {
  variant: "one" | "two" | "three";
  alt: string;
  className?: string;
};

function Mark({ variant, alt, className = "" }: MarkProps) {
  return (
    <img
      src={assetPath(`threaded-a-${variant === "one" ? "1" : variant === "two" ? "2" : "3"}`)}
      alt={alt}
      className={`block object-contain ${className}`}
    />
  );
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6a6258]">
      <span className="h-px w-8 bg-[#c49a47]" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function ThreadLine({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${dark ? "text-[#d2a64c]" : "text-[#c49a47]"}`} aria-hidden="true">
      <span className="h-px w-7 bg-current" />
      <span className="h-1.5 w-1.5 rotate-45 border border-current" />
      <span className="h-px w-16 bg-current" />
    </div>
  );
}

function Swatch({ name, hex, tone }: { name: string; hex: string; tone: string }) {
  return (
    <div className="group">
      <div
        className="mb-3 h-16 w-full border border-[#171513]/10 transition-transform duration-300 group-hover:-translate-y-1 sm:h-20"
        style={{ backgroundColor: hex }}
        aria-label={`${name} color swatch`}
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#171513]">{name}</p>
      <p className="mt-1 font-mono text-[11px] text-[#6a6258]">{hex}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-[#756d63]">{tone}</p>
    </div>
  );
}

export function LogoSystem() {
  return (
    <main className="afro-board min-h-[100dvh] overflow-hidden bg-[#e9dfd0] text-[#171513]">
      <style>{`
        .afro-board {
          --ink: #171513;
          --paper: #f8f3eb;
          --parchment: #e9dfd0;
          --line: #cdbda8;
          --gold: #d2a64c;
          --palm: #3c6254;
          font-family: 'DM Sans', sans-serif;
          background-image:
            radial-gradient(circle at 8% 4%, rgba(255,255,255,.42), transparent 23rem),
            radial-gradient(circle at 90% 80%, rgba(210,166,76,.10), transparent 27rem),
            repeating-linear-gradient(0deg, rgba(23,21,19,.016) 0, rgba(23,21,19,.016) 1px, transparent 1px, transparent 4px);
        }
        .afro-board h1, .afro-board h2, .afro-board h3, .afro-board .serif {
          font-family: 'Cormorant Garamond', Georgia, serif;
        }
        .afro-board .hairline {
          background: linear-gradient(90deg, transparent, rgba(23,21,19,.34), transparent);
        }
        .afro-board .woven-field {
          background-color: #171513;
          background-image:
            linear-gradient(115deg, transparent 0 46%, rgba(210,166,76,.13) 47%, transparent 48% 100%),
            linear-gradient(65deg, transparent 0 46%, rgba(248,243,235,.07) 47%, transparent 48% 100%);
          background-size: 23px 23px;
        }
        .afro-board .paper-grain {
          background-image: repeating-linear-gradient(90deg, rgba(23,21,19,.025) 0, rgba(23,21,19,.025) 1px, transparent 1px, transparent 8px);
        }
        .afro-board .label-edge {
          background-image: radial-gradient(circle, rgba(23,21,19,.45) .75px, transparent .8px);
          background-size: 6px 6px;
        }
        @media (prefers-reduced-motion: no-preference) {
          .afro-board .reveal {
            animation: rise-in .8s cubic-bezier(.22,.75,.25,1) both;
          }
          .afro-board .reveal-delay {
            animation-delay: .12s;
          }
          @keyframes rise-in {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        }
      `}</style>

      <div className="mx-auto max-w-[1440px] px-5 py-5 sm:px-8 sm:py-8 lg:px-14 lg:py-12">
        <header className="reveal flex items-start justify-between border-b border-[#171513]/25 pb-5 sm:pb-7">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#6a6258]">AF / IDENTITY SYSTEM / 01</p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#3c6254]">Afrotextile</p>
          </div>
          <p className="max-w-[145px] text-right text-[10px] leading-relaxed text-[#6a6258] sm:max-w-none">
            An editorial marketplace<br className="hidden sm:block" /> for cloth, form, and makers.
          </p>
        </header>

        <section className="reveal reveal-delay grid gap-8 border-b border-[#171513]/25 py-10 sm:py-14 lg:grid-cols-[.86fr_1.14fr] lg:gap-16 lg:py-20">
          <div className="flex flex-col justify-center">
            <SectionKicker>Recommended direction</SectionKicker>
            <h1 className="mt-5 max-w-[560px] text-[clamp(3.8rem,8vw,8.4rem)] font-light leading-[.78] tracking-[-.065em]">
              Threaded
              <br />
              <em className="ml-[.18em] font-light text-[#3c6254]">A</em>
            </h1>
            <p className="serif mt-8 max-w-[440px] text-[clamp(1.35rem,2.3vw,2rem)] leading-[1.08] text-[#4e463e]">
              Two woven ribbons meet to make a signal of passage — from maker to wardrobe, from hand to hand.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <ThreadLine />
              <span className="font-mono text-[9px] uppercase tracking-[.2em] text-[#6a6258]">direction 02 / selected</span>
            </div>
          </div>

          <div className="relative flex min-h-[380px] items-center justify-center overflow-hidden bg-[#f8f3eb] px-5 py-12 sm:min-h-[500px] lg:min-h-[570px]">
            <div className="absolute left-5 top-5 font-mono text-[9px] uppercase tracking-[.24em] text-[#857b6e]">primary mark</div>
            <div className="absolute right-5 top-5 flex items-center gap-2 text-[9px] uppercase tracking-[.19em] text-[#857b6e]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3c6254]" /> woven A
            </div>
            <div className="absolute bottom-5 left-5 right-5 hairline h-px" />
            <div className="absolute bottom-4 right-5 font-mono text-[9px] tracking-[.18em] text-[#857b6e]">AF-02</div>
            <div className="relative flex flex-col items-center">
              <Mark variant="two" alt="Recommended Threaded A monogram, geometric woven A with an antique gold crossing" className="h-52 w-52 sm:h-72 sm:w-72 lg:h-80 lg:w-80" />
              <div className="mt-7 text-center">
                <div className="text-[clamp(1.8rem,4vw,3.4rem)] font-semibold leading-none tracking-[.19em]">AFROTEXTILE</div>
                <div className="mt-3 flex items-center justify-center gap-3 text-[9px] uppercase tracking-[.3em] text-[#6a6258]">
                  <span>independent</span><span className="h-1 w-1 rounded-full bg-[#d2a64c]" /><span>african fashion</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#171513]/25 py-10 sm:py-14">
          <div className="mb-7 flex flex-col justify-between gap-3 sm:mb-10 sm:flex-row sm:items-end">
            <div>
              <SectionKicker>Starting points</SectionKicker>
              <h2 className="mt-3 text-4xl font-light tracking-[-.035em] sm:text-5xl">The weave, in three registers.</h2>
            </div>
            <p className="max-w-[280px] text-[11px] leading-relaxed text-[#6a6258]">A considered system keeps the same gesture in motion — open, geometric, and compact.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <article className="paper-grain border border-[#171513]/20 bg-[#f8f3eb] p-5 sm:p-7">
              <div className="flex items-start justify-between">
                <span className="font-mono text-[10px] text-[#857b6e]">01</span>
                <span className="text-[9px] uppercase tracking-[.2em] text-[#857b6e]">open ribbon</span>
              </div>
              <Mark variant="one" alt="Threaded A starting candidate one, open ribbon A in ink and gold" className="mx-auto my-7 h-36 w-36 sm:h-44 sm:w-44" />
              <p className="serif text-2xl leading-none">Air &amp; gesture</p>
              <p className="mt-2 text-[11px] leading-relaxed text-[#6a6258]">The most fluid expression. A strong parent mark for editorial moments.</p>
            </article>
            <article className="border-2 border-[#d2a64c] bg-[#f8f3eb] p-5 sm:p-7">
              <div className="flex items-start justify-between">
                <span className="font-mono text-[10px] text-[#3c6254]">02</span>
                <span className="flex items-center gap-2 text-[9px] uppercase tracking-[.2em] text-[#3c6254]"><span className="h-1.5 w-1.5 rounded-full bg-[#d2a64c]" /> selected</span>
              </div>
              <Mark variant="two" alt="Threaded A recommended candidate two, geometric woven A in ink and gold" className="mx-auto my-7 h-36 w-36 sm:h-44 sm:w-44" />
              <p className="serif text-2xl leading-none">Order &amp; crossing</p>
              <p className="mt-2 text-[11px] leading-relaxed text-[#6a6258]">The clearest everyday signature. It holds at scale without losing the hand.</p>
            </article>
            <article className="paper-grain border border-[#171513]/20 bg-[#f8f3eb] p-5 sm:p-7">
              <div className="flex items-start justify-between">
                <span className="font-mono text-[10px] text-[#857b6e]">03</span>
                <span className="text-[9px] uppercase tracking-[.2em] text-[#857b6e]">app mark</span>
              </div>
              <Mark variant="three" alt="Threaded A starting candidate three, compact woven A app mark in a dark rounded square" className="mx-auto my-7 h-36 w-36 sm:h-44 sm:w-44" />
              <p className="serif text-2xl leading-none">A compact stamp</p>
              <p className="mt-2 text-[11px] leading-relaxed text-[#6a6258]">A concentrated version for the places where recognition needs to be instant.</p>
            </article>
          </div>
        </section>

        <section className="grid gap-3 border-b border-[#171513]/25 py-10 sm:py-14 lg:grid-cols-[1fr_1fr]">
          <div className="bg-[#f8f3eb] p-6 sm:p-9">
            <SectionKicker>Applications / light</SectionKicker>
            <div className="mt-8 flex min-h-[245px] flex-col items-center justify-center border border-[#171513]/10 bg-[#f8f3eb] p-5 sm:min-h-[320px]">
              <Mark variant="two" alt="Threaded A logo applied in ink and antique gold on a light parchment field" className="h-40 w-40 sm:h-52 sm:w-52" />
              <div className="mt-4 text-center text-[clamp(1.45rem,3vw,2.5rem)] font-semibold tracking-[.18em]">AFROTEXTILE</div>
              <p className="mt-2 font-mono text-[8px] uppercase tracking-[.24em] text-[#6a6258]">made in many hands</p>
            </div>
          </div>
          <div className="woven-field p-6 text-[#f8f3eb] sm:p-9">
            <div className="flex items-start justify-between">
              <SectionKicker>Applications / dark</SectionKicker>
              <span className="font-mono text-[9px] tracking-[.2em] text-[#d2a64c]">INK / 01</span>
            </div>
            <div className="mt-8 flex min-h-[245px] flex-col items-center justify-center border border-[#f8f3eb]/20 p-5 sm:min-h-[320px]">
              <Mark variant="three" alt="Threaded A logo applied in gold and parchment on a dark woven field" className="h-40 w-40 sm:h-52 sm:w-52" />
              <div className="mt-4 text-[clamp(1.45rem,3vw,2.5rem)] font-semibold tracking-[.18em]">AFROTEXTILE</div>
              <p className="mt-2 font-mono text-[8px] uppercase tracking-[.24em] text-[#d2a64c]">made in many hands</p>
            </div>
          </div>
        </section>

        <section className="border-b border-[#171513]/25 py-10 sm:py-14">
          <div className="grid gap-10 lg:grid-cols-[.78fr_1.22fr] lg:items-end">
            <div>
              <SectionKicker>Utility &amp; restraint</SectionKicker>
              <h2 className="mt-4 max-w-[420px] text-4xl font-light leading-[.92] tracking-[-.04em] sm:text-6xl">A mark should still speak when it whispers.</h2>
              <p className="mt-5 max-w-[390px] text-[12px] leading-relaxed text-[#6a6258]">The compact woven A is built to hold its silhouette in a browser tab, a garment label, or a single-ink receipt.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-[#171513]/20 bg-[#f8f3eb] p-5 sm:p-7">
                <div className="flex items-baseline justify-between">
                  <span className="serif text-3xl">32px</span>
                  <span className="font-mono text-[9px] uppercase tracking-[.2em] text-[#6a6258]">favicon / nav</span>
                </div>
                <div className="mt-7 flex h-32 items-center justify-center border border-[#171513]/10 bg-[#f8f3eb]">
                  <Mark variant="two" alt="Threaded A mark shown at a 32 pixel legibility test size" className="h-8 w-8" />
                </div>
                <p className="mt-4 text-[11px] leading-relaxed text-[#6a6258]">Gold crossing remains a useful recognition cue without relying on detail.</p>
              </div>
              <div className="border border-[#171513]/20 bg-[#f8f3eb] p-5 sm:p-7">
                <div className="flex items-baseline justify-between">
                  <span className="serif text-3xl">64px</span>
                  <span className="font-mono text-[9px] uppercase tracking-[.2em] text-[#6a6258]">app / avatar</span>
                </div>
                <div className="mt-7 flex h-32 items-center justify-center border border-[#171513]/10 bg-[#f8f3eb]">
                  <Mark variant="two" alt="Threaded A mark shown at a 64 pixel legibility test size" className="h-16 w-16" />
                </div>
                <p className="mt-4 text-[11px] leading-relaxed text-[#6a6258]">At touchpoint scale, the open counter and intersecting threads read as one.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 border-b border-[#171513]/25 py-10 sm:py-14 lg:grid-cols-[.9fr_1.1fr]">
          <div className="bg-[#171513] p-6 text-[#f8f3eb] sm:p-9">
            <SectionKicker>One-color print</SectionKicker>
            <div className="mt-8 flex min-h-[260px] flex-col items-center justify-center bg-[#f8f3eb] p-7 sm:min-h-[330px]">
              <Mark variant="two" alt="Threaded A one-color print simulation in solid black ink" className="h-44 w-44 grayscale contrast-150" />
              <p className="mt-5 font-mono text-[9px] uppercase tracking-[.24em] text-[#6a6258]">100% black / 0% tint</p>
            </div>
          </div>
          <div className="paper-grain flex flex-col justify-between border border-[#171513]/20 bg-[#e1d1bb] p-6 sm:p-9">
            <div>
              <SectionKicker>Physical touchpoint</SectionKicker>
              <h2 className="mt-4 text-4xl font-light leading-none tracking-[-.035em] sm:text-5xl">A label with a point of view.</h2>
            </div>
            <div className="mt-8 flex justify-center sm:justify-end">
              <div className="relative w-[min(100%,300px)] rotate-[-3deg] bg-[#f8f3eb] px-7 py-9 shadow-[12px_16px_0_rgba(23,21,19,.08)]">
                <div className="label-edge absolute inset-3 border border-dashed border-[#171513]/25" />
                <div className="relative flex items-center justify-between">
                  <Mark variant="two" alt="Threaded A mark on an Afrotextile garment label" className="h-16 w-16" />
                  <span className="font-mono text-[8px] uppercase tracking-[.2em] text-[#6a6258]">AT / 001</span>
                </div>
                <div className="relative mt-8 border-t border-[#171513]/20 pt-4">
                  <div className="text-[14px] font-semibold tracking-[.18em]">AFROTEXTILE</div>
                  <div className="mt-2 flex items-center gap-2 text-[8px] uppercase tracking-[.18em] text-[#3c6254]"><span className="h-1.5 w-1.5 rounded-full bg-[#d2a64c]" /> independent fashion</div>
                </div>
                <div className="relative mt-10 text-right font-mono text-[8px] leading-relaxed text-[#6a6258]">designed in community<br />worn everywhere</div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#171513]/25 py-10 sm:py-14">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <SectionKicker>Core palette</SectionKicker>
              <h2 className="mt-3 text-4xl font-light tracking-[-.035em] sm:text-5xl">Ink, parchment, a held note of gold.</h2>
            </div>
            <p className="max-w-[290px] text-[11px] leading-relaxed text-[#6a6258]">A restrained base lets the textile, the maker, and the mark carry the warmth.</p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-5">
            <Swatch name="Thread ink" hex="#171513" tone="The editorial anchor. Quiet, precise, never glossy." />
            <Swatch name="Parchment" hex="#F8F3EB" tone="A soft ground for product and story." />
            <Swatch name="Antique gold" hex="#D2A64C" tone="The crossing thread. Use with intention." />
            <Swatch name="Palm note" hex="#3C6254" tone="A small living accent for wayfinding and warmth." />
          </div>
        </section>

        <footer className="flex flex-col gap-4 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ThreadLine />
            <span className="font-mono text-[9px] uppercase tracking-[.18em] text-[#6a6258]">identity study / Threaded A</span>
          </div>
          <p className="max-w-[320px] text-[10px] leading-relaxed text-[#6a6258] sm:text-right">A working visual direction for Afrotextile — a considered home for independent African fashion.</p>
        </footer>
      </div>
    </main>
  );
}