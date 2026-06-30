import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      {...sceneTransitions.zoomThrough}
    >
      <div className="relative z-10 w-full px-[10vw]">
        <motion.div
          className="w-16 h-[2px] bg-[var(--color-primary)] mb-8"
          initial={{ width: 0 }}
          animate={phase >= 1 ? { width: 64 } : { width: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        
        <h1 className="text-[10vw] leading-none font-bold text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
          {'AFROTEXTILE'.split('').map((char, i) => (
            <motion.span 
              key={i} 
              style={{ display: 'inline-block' }}
              initial={{ opacity: 0, y: 100, rotateX: -60, filter: 'blur(10px)' }}
              animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' } : { opacity: 0, y: 100, rotateX: -60, filter: 'blur(10px)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: phase >= 2 ? i * 0.05 : 0 }}
            >
              {char}
            </motion.span>
          ))}
        </h1>

        <motion.p 
          className="text-[2vw] text-[var(--color-primary)] mt-6 tracking-[0.2em] uppercase"
          initial={{ opacity: 0, x: -30 }}
          animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          Global African Fashion Marketplace
        </motion.p>
      </div>
      
      {/* Decorative large letter behind */}
      <motion.div 
        className="absolute right-[-5vw] top-1/2 -translate-y-1/2 text-[40vw] text-[var(--color-primary)] opacity-5 font-bold italic leading-none pointer-events-none"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ x: 100, opacity: 0 }}
        animate={phase >= 1 ? { x: 0, opacity: 0.05 } : { x: 100, opacity: 0 }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        A
      </motion.div>
    </motion.div>
  );
}