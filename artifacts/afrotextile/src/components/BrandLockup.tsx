import officialLockup from "@/assets/afrotextile-official-lockup.png";
import officialMark from "@/assets/afrotextile-official-mark.png";

type BrandLockupProps = {
  tone?: "light" | "dark";
  compact?: boolean;
};

export function BrandLockup({ tone = "dark", compact = false }: BrandLockupProps) {
  return (
    <span className={`brand-lockup brand-lockup-${tone}${compact ? " brand-lockup-compact" : ""}`}>
      <img
        src={compact ? officialMark : officialLockup}
        alt="Afrotextile"
        className="brand-lockup-official"
      />
      {compact && <span className="brand-lockup-wordmark">AFROTEXTILE</span>}
    </span>
  );
}