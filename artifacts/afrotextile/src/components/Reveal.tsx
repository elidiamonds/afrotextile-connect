import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  scale?: boolean;
  threshold?: number;
}

const Reveal = ({ children, className = "", delay = 0, scale = false, threshold = 0.12 }: RevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  const style = { "--reveal-delay": `${delay}ms` } as CSSProperties;

  return (
    <div
      ref={ref}
      className={`${scale ? "reveal-scale" : "reveal"} ${visible ? "is-visible" : ""} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default Reveal;