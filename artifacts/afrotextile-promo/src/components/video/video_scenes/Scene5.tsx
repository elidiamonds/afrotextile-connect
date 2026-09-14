import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video/animations';
import { BrandLockup } from '../BrandLockup';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-dark)]"
      {...sceneTransitions.wipe}
    >
      <div className="text-center relative z-10">
        
        <div className="flex flex-col items-center gap-[2vh] mb-[8vh] overflow-hidden h-[12vw]">
           <motion.div
            initial={{ y: "100%" }}
            animate={phase >= 1 ? { y: 0 } : { y: "100%" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
           >
            <h2 className="text-[3vw] text-[var(--color-text-muted)] uppercase tracking-widest leading-none">
              Bold Prints.
            </h2>
           </motion.div>
           <motion.div
            initial={{ y: "100%" }}
            animate={phase >= 1 ? { y: 0 } : { y: "100%" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
           >
            <h2 className="text-[3vw] text-[var(--color-primary)] uppercase tracking-widest leading-none">
              Proud Heritage.
            </h2>
           </motion.div>
           <motion.div
            initial={{ y: "100%" }}
            animate={phase >= 1 ? { y: 0 } : { y: "100%" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
           >
            <h2 className="text-[3vw] text-white uppercase tracking-widest leading-none font-bold">
              Global Style.
            </h2>
           </motion.div>
        </div>

        <motion.div
          className="w-[2px] h-20 bg-[var(--color-primary)] mx-auto mb-[6vh]"
          initial={{ scaleY: 0, originY: 0 }}
          animate={phase >= 2 ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />

        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <BrandLockup variant="compact" size="hero" />
        </motion.div>

        <motion.p
          className="text-[1.5vw] text-[var(--color-primary)] mt-4 tracking-[0.4em] uppercase"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1.5, delay: 0.5 }}
        >
          The Marketplace
        </motion.p>

        <motion.div
          className="mt-[6vh] flex flex-col items-center gap-[1.5vh]"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="w-[12vw] h-[1px] bg-[var(--color-primary)]/60"
            initial={{ scaleX: 0 }}
            animate={phase >= 4 ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
          <p className="text-[1.2vw] text-white/50 tracking-[0.3em] uppercase">
            Discover the Collection
          </p>
          <p className="text-[1vw] text-[var(--color-primary)]/70 tracking-[0.5em] uppercase">
            afrotextile.com
          </p>
        </motion.div>

      </div>
    </motion.div>
  );
}