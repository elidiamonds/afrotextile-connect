import { motion } from 'framer-motion';

type BrandMarkVariant = 'dark' | 'light' | 'compact' | 'primary';
type BrandLockupSize = 'micro' | 'compact' | 'hero';

const MARK_FILES: Record<BrandMarkVariant, string> = {
  dark: 'threaded-a-dark.svg',
  light: 'threaded-a-light.svg',
  compact: 'threaded-a-compact.svg',
  primary: 'threaded-a-primary.svg',
};

const SIZE_CLASSES: Record<BrandLockupSize, { mark: string; wordmark: string; gap: string }> = {
  micro: {
    mark: 'w-[3.2vw] h-[3.2vw] min-w-[24px] min-h-[24px]',
    wordmark: 'text-[clamp(10px,1.4vw,18px)] tracking-[0.24em]',
    gap: 'gap-[1vw]',
  },
  compact: {
    mark: 'w-[5.2vw] h-[5.2vw] min-w-[34px] min-h-[34px]',
    wordmark: 'text-[clamp(13px,2.4vw,34px)] tracking-[0.18em]',
    gap: 'gap-[1.4vw]',
  },
  hero: {
    mark: 'w-[9vw] h-[9vw] min-w-[58px] min-h-[58px]',
    wordmark: 'text-[clamp(30px,7.2vw,110px)] tracking-[-0.045em]',
    gap: 'gap-[2.2vw]',
  },
};

export function BrandLockup({
  variant,
  size = 'compact',
  className = '',
  animate = false,
}: {
  variant: BrandMarkVariant;
  size?: BrandLockupSize;
  className?: string;
  animate?: boolean;
}) {
  const sizeClasses = SIZE_CLASSES[size];
  const onLightSurface = variant === 'light' || variant === 'primary';
  const content = (
    <>
      <img
        src={`${import.meta.env.BASE_URL}brand/${MARK_FILES[variant]}`}
        alt="Threaded A mark"
        className={`${sizeClasses.mark} shrink-0 object-contain`}
      />
      <span
        className={`${sizeClasses.wordmark} whitespace-nowrap font-semibold leading-none ${
          onLightSurface ? 'text-[var(--color-bg-dark)]' : 'text-[var(--color-text-primary)]'
        }`}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        AFROTEXTILE
      </span>
    </>
  );

  if (!animate) {
    return (
      <div className={`inline-flex items-center ${sizeClasses.gap} ${className}`} aria-label="Afrotextile">
        {content}
      </div>
    );
  }

  return (
    <motion.div
      className={`inline-flex items-center ${sizeClasses.gap} ${className}`}
      initial={{ opacity: 0, y: 36, rotateX: -35, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      aria-label="Afrotextile"
    >
      {content}
    </motion.div>
  );
}