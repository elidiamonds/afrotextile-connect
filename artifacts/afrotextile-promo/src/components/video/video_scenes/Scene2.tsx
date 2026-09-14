import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video/animations';
import { BrandLockup } from '../BrandLockup';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col justify-center px-[8vw]"
      {...sceneTransitions.clipPolygon}
    >
      <div className="flex items-center gap-[4vw] w-full max-w-7xl mx-auto h-[70vh]">
        
        {/* Product 1 */}
        <motion.div 
          className="relative w-1/2 h-full rounded-tr-[100px] overflow-hidden group"
          initial={{ opacity: 0, y: 50, rotate: -2 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, rotate: 0 } : { opacity: 0, y: 50, rotate: -2 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.img 
            src={`${import.meta.env.BASE_URL}images/product-1.jpg`}
            className="w-full h-full object-cover"
            initial={{ scale: 1.2 }}
            animate={phase >= 1 ? { scale: 1 } : { scale: 1.2 }}
            transition={{ duration: 3, ease: 'easeOut' }}
          />
          <motion.div 
            className="absolute bottom-8 left-8 bg-[var(--color-bg-dark)]/80 backdrop-blur-md p-6 rounded-lg border border-[var(--color-primary)]/30"
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-[1.8vw] text-white" style={{ fontFamily: 'var(--font-display)' }}>Ankara Co-ord Set</h3>
            <p className="text-[var(--color-primary)] text-[1vw] mt-2">Vibrant Heritage</p>
          </motion.div>
        </motion.div>

        {/* Product 2 */}
        <motion.div 
          className="relative w-1/2 h-[80%] rounded-bl-[100px] overflow-hidden mt-auto"
          initial={{ opacity: 0, y: 50, rotate: 2 }}
          animate={phase >= 2 ? { opacity: 1, y: 0, rotate: 0 } : { opacity: 0, y: 50, rotate: 2 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.img 
            src={`${import.meta.env.BASE_URL}images/product-2.jpg`}
            className="w-full h-full object-cover"
            initial={{ scale: 1.2 }}
            animate={phase >= 2 ? { scale: 1 } : { scale: 1.2 }}
            transition={{ duration: 3, ease: 'easeOut' }}
          />
          <motion.div 
            className="absolute top-8 right-8 bg-[var(--color-bg-light)]/90 backdrop-blur-md p-6 rounded-lg text-right"
            initial={{ opacity: 0, x: 20 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-[1.8vw] text-[var(--color-bg-dark)]" style={{ fontFamily: 'var(--font-display)' }}>Kente Maxi Gown</h3>
            <p className="text-[var(--color-secondary)] text-[1vw] mt-2">Woven Tradition</p>
          </motion.div>
          <BrandLockup
            variant="light"
            size="micro"
            className="absolute left-8 top-8 z-10 rounded-full bg-[var(--color-bg-light)]/90 px-3 py-2 backdrop-blur-md"
          />
        </motion.div>

      </div>
    </motion.div>
  );
}