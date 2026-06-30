import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000),
      setTimeout(() => setPhase(4), 1800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const vendors = [
    { name: 'Lagos.', img: 'vendor-1.jpg', delay: 1 },
    { name: 'Accra.', img: 'vendor-2.jpg', delay: 2 },
    { name: 'Bamako.', img: 'vendor-3.jpg', delay: 3 },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      {...sceneTransitions.perspectiveFlip}
    >
      <motion.p 
        className="text-[var(--color-primary)] text-[1.5vw] uppercase tracking-[0.3em] mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      >
        Independent Designers
      </motion.p>

      <div className="flex gap-[4vw] justify-center items-center mb-12">
        {vendors.map((vendor, index) => (
          <motion.div 
            key={index}
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={phase >= vendor.delay ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="w-[18vw] h-[25vw] rounded-full overflow-hidden border-2 border-[var(--color-primary)]/40 p-2 mb-6">
              <div className="w-full h-full rounded-full overflow-hidden relative">
                <img src={`${import.meta.env.BASE_URL}images/${vendor.img}`} className="w-full h-full object-cover grayscale opacity-80" />
                <div className="absolute inset-0 bg-[var(--color-primary)]/20 mix-blend-color"></div>
              </div>
            </div>
            <h3 className="text-[3vw] text-white" style={{ fontFamily: 'var(--font-display)' }}>
              {vendor.name}
            </h3>
          </motion.div>
        ))}
      </div>

      <motion.h2 
        className="text-[4vw] text-white italic"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
        animate={phase >= 4 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        On a <span className="text-[var(--color-secondary)] not-italic">global</span> stage.
      </motion.h2>

    </motion.div>
  );
}