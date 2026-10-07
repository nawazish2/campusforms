'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export function ReceivedStamp() {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let cancelled = false;
    import('canvas-confetti').then(({ default: confetti }) => {
      if (cancelled) return;
      confetti({
        particleCount: 80,
        spread: 70,
        startVelocity: 32,
        origin: { y: 0.45 },
        colors: ['#e2553f', '#f0c85a', '#2f54d6', '#2fb583', '#8f72e6'],
        disableForReducedMotion: true,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.div
      aria-hidden
      initial={reduce ? false : { scale: 1.6, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: -8 }}
      transition={{ duration: 0.4, ease: [0.34, 1.4, 0.64, 1] }}
      className="mx-auto inline-block select-none rounded-md border-[3px] border-pin px-4 py-1.5 font-mono text-lg font-bold uppercase tracking-[0.3em] text-pin"
    >
      Received
    </motion.div>
  );
}
