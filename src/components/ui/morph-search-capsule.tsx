'use client';

import { useEffect, useId, useRef, useState, type FocusEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDarkTheme } from '@/lib/use-dark-theme';

type Ripple = { id: number; x: number; y: number };

type MorphSearchCapsuleProps = {
  placeholder?: string;
  value?: string;
  onSearch?: (query: string) => void;
  className?: string;
};

export function MorphSearchCapsule({
  placeholder = 'Search forms…',
  value,
  onSearch,
  className,
}: MorphSearchCapsuleProps) {
  const reduce = useReducedMotion();
  const isDark = useDarkTheme();
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState('');
  const query = isControlled ? value : internal;
  const [isActive, setIsActive] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!query) setIsActive(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query]);

  const setQuery = (next: string) => {
    if (!isControlled) setInternal(next);
    onSearch?.(next);
  };

  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!reduce) {
      const rect = e.currentTarget.getBoundingClientRect();
      const newRipple = {
        id: Date.now(),
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setRipples((prev) => [...prev.slice(-2), newRipple]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);
    }
    setIsActive(true);
    window.setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    if (!query) setIsActive(false);
  };

  const theme = {
    capsule: isDark
      ? 'bg-[#1a1b24] border-white/12 text-white'
      : 'bg-white border-ink/10 text-ink',
    shadow: isDark
      ? '0 14px 34px -6px rgba(0,0,0,0.65), 0 4px 14px rgba(0,0,0,0.35)'
      : '0 12px 30px -6px rgba(20,22,32,0.10), 0 4px 12px rgba(20,22,32,0.04)',
    innerGlow: isDark
      ? 'inset 0 1px 1px 0 rgba(255,255,255,0.18), inset 0 -1px 1px 0 rgba(0,0,0,0.4)'
      : 'inset 0 1px 1.5px 0 rgba(255,255,255,1), inset 0 -1px 1px 0 rgba(0,0,0,0.04)',
    iconColor: isDark ? '#FFFFFF' : '#14151c',
    rippleColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(61,95,232,0.12)',
    inputColor: isDark ? 'text-white' : 'text-ink',
    placeholderColor: isDark ? 'placeholder:text-white/40' : 'placeholder:text-ink/40',
  };

  const isMorphedToCaret = isActive && !query;

  return (
    <div
      ref={containerRef}
      className={cn('relative flex items-center justify-start select-none', className)}
    >
      <motion.div
        onClick={handleClick}
        animate={reduce ? undefined : { scale: isActive ? 1.018 : 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        className={cn(
          'relative z-10 flex h-11 w-full max-w-[320px] cursor-pointer items-center overflow-hidden rounded-full border px-4 transition-colors duration-200 sm:h-12',
          theme.capsule
        )}
        style={{ boxShadow: theme.shadow }}
      >
        <div className="pointer-events-none absolute inset-0 rounded-full" style={{ boxShadow: theme.innerGlow }} />

        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 2.8, opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: r.x - 30,
              top: r.y - 30,
              width: 60,
              height: 60,
              backgroundColor: theme.rippleColor,
            }}
          />
        ))}

        <div className="relative mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-6 w-6 overflow-visible" fill="none" aria-hidden>
            <motion.g
              style={{ transformOrigin: '11px 11px' }}
              animate={
                reduce
                  ? undefined
                  : isMorphedToCaret
                    ? { rotate: -45, scaleX: 0.08, scaleY: 1.35, x: -0.5, y: 0 }
                    : { rotate: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 }
              }
              transition={{ type: 'spring', stiffness: 380, damping: 26, mass: 0.8 }}
            >
              <motion.circle
                cx="11"
                cy="11"
                r="6.5"
                stroke={theme.iconColor}
                strokeWidth="2.4"
                strokeLinecap="round"
                animate={
                  reduce || !isMorphedToCaret
                    ? { opacity: 1 }
                    : { opacity: [1, 1, 0, 0, 1] }
                }
                transition={
                  isMorphedToCaret && !reduce
                    ? {
                        opacity: {
                          repeat: Infinity,
                          duration: 1.0,
                          delay: 0.35,
                          ease: 'easeInOut',
                          times: [0, 0.45, 0.5, 0.95, 1],
                        },
                      }
                    : { duration: 0.15 }
                }
              />
            </motion.g>
            <motion.line
              x1="15.8"
              y1="15.8"
              x2="20.8"
              y2="20.8"
              stroke={theme.iconColor}
              strokeWidth="2.4"
              strokeLinecap="round"
              animate={
                isMorphedToCaret && !reduce
                  ? { x1: 15.5, y1: 15.5, x2: 15.5, y2: 15.5, opacity: 0 }
                  : { x1: 15.8, y1: 15.8, x2: 20.8, y2: 20.8, opacity: 1 }
              }
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            />
          </svg>
        </div>

        <div className="relative flex h-full flex-1 items-center">
          <label htmlFor={inputId} className="sr-only">
            {placeholder}
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsActive(true)}
            onBlur={handleBlur}
            placeholder={isActive ? placeholder : ''}
            autoComplete="off"
            style={{ caretColor: query ? theme.iconColor : 'transparent' }}
            className={cn(
              'w-full cursor-text bg-transparent text-[15px] font-medium tracking-normal outline-none',
              theme.inputColor,
              theme.placeholderColor
            )}
          />
        </div>

        {query ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className={cn(
              'grid size-5 place-items-center rounded-full text-xs opacity-60 transition-opacity hover:opacity-100',
              isDark ? 'bg-white/10 text-white' : 'bg-ink/10 text-ink'
            )}
          >
            ×
          </button>
        ) : null}
      </motion.div>
    </div>
  );
}
