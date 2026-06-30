import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 500),
      setTimeout(() => setPhase(3), 900),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-between px-[10vw]"
      {...sceneTransitions.splitHorizontal}
    >
      <div className="w-[40%] relative z-10">
        <motion.h2 
          className="text-[6vw] text-white leading-[1.1]" 
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          Bold<br/><span className="text-[var(--color-secondary)] italic">African</span><br/>Craft.
        </motion.h2>
        <motion.p 
          className="text-[1.5vw] text-[var(--color-text-muted)] mt-6 max-w-md"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          Authentic textiles. Modern silhouettes. Woven with intention.
        </motion.p>
      </div>

      <div className="w-[50%] relative h-[80vh]">
        <motion.div 
          className="absolute top-0 right-[10%] w-[60%] h-[60%] z-20 rounded-lg overflow-hidden shadow-2xl border border-white/10"
          initial={{ opacity: 0, scale: 0.8, x: 50 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.8, x: 50 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          <img src={`${import.meta.env.BASE_URL}images/product-3.jpg`} className="w-full h-full object-cover" />
          <div className="absolute bottom-4 left-4 text-white text-[1vw] bg-black/50 px-3 py-1 rounded">Mudcloth Bomber</div>
        </motion.div>

        <motion.div 
          className="absolute bottom-[5%] left-0 w-[70%] h-[55%] z-10 rounded-lg overflow-hidden shadow-2xl border border-[var(--color-primary)]/20"
          initial={{ opacity: 0, scale: 0.8, x: -50 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.8, x: -50 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          <img src={`${import.meta.env.BASE_URL}images/product-5.jpg`} className="w-full h-full object-cover" />
          <div className="absolute top-4 right-4 text-white text-[1vw] bg-[var(--color-secondary)]/80 px-3 py-1 rounded">Embroidered Kaftan</div>
        </motion.div>
      </div>
    </motion.div>
  );
}