type BrandLockupProps = {
  tone?: "light" | "dark";
  compact?: boolean;
};

export function BrandLockup({ tone = "dark", compact = false }: BrandLockupProps) {
  const mark = tone === "dark" ? "/brand/threaded-a-dark.svg" : "/brand/threaded-a-light.svg";

  return (
    <span className={`brand-lockup brand-lockup-${tone}${compact ? " brand-lockup-compact" : ""}`}>
      <img
        src={mark}
        alt=""
        aria-hidden="true"
        className="brand-lockup-mark"
      />
      <span className="brand-lockup-wordmark">AFROTEXTILE</span>
    </span>
  );
}