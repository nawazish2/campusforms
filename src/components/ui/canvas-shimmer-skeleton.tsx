'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDarkTheme } from '@/lib/use-dark-theme';

export function CanvasShimmerSkeleton({
  className,
  label = 'Loading',
}: {
  className?: string;
  label?: string;
}) {
  const isDark = useDarkTheme();
  const reduce = useReducedMotion();

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        isDark ? 'bg-[#161822]' : 'bg-[#e8eaf0]',
        className
      )}
      aria-hidden
    >
      {reduce ? (
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? 'radial-gradient(circle at 50% 50%, rgba(109,144,242,0.12) 0%, transparent 70%)'
              : 'radial-gradient(circle at 50% 50%, rgba(61,95,232,0.10) 0%, transparent 70%)',
          }}
        />
      ) : (
        <>
          <motion.div
            initial={{ x: '-120%', y: '-40%' }}
            animate={{ x: '120%', y: '40%' }}
            transition={{
              repeat: Infinity,
              duration: 1.65,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="pointer-events-none absolute -top-[50%] -left-[50%] h-[200%] w-[200%]"
            style={{
              background: isDark
                ? 'linear-gradient(118deg, transparent 22%, rgba(42,36,52,0.05) 32%, rgba(61,95,232,0.16) 42%, rgba(157,182,248,0.38) 48%, rgba(255,255,255,0.45) 51%, rgba(157,182,248,0.28) 55%, rgba(61,95,232,0.12) 62%, transparent 74%)'
                : 'linear-gradient(118deg, transparent 20%, rgba(238,243,254,0.35) 30%, rgba(197,212,251,0.4) 39%, rgba(157,182,248,0.5) 47%, rgba(255,255,255,0.95) 51%, rgba(157,182,248,0.4) 56%, rgba(109,144,242,0.2) 64%, transparent 76%)',
            }}
          />
          <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            className="pointer-events-none absolute inset-0"
            style={{
              background: isDark
                ? 'radial-gradient(circle at 50% 50%, rgba(109,144,242,0.08) 0%, transparent 70%)'
                : 'radial-gradient(circle at 50% 50%, rgba(61,95,232,0.12) 0%, transparent 70%)',
            }}
          />
        </>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}
