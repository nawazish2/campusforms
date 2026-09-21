'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light' : 'Dark'}
      className={cn(
        'grid size-10 place-items-center rounded-lg text-ink/70 transition outline-none hover:bg-ink/[0.05] hover:text-ink focus-visible:ring-2 focus-visible:ring-ballpoint-500/40 active:scale-[0.96]',
        className
      )}
    >
      <span className="animate-pop" key={theme}>
        {dark ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
      </span>
    </button>
  );
}
