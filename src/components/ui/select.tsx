import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className={cn('relative', props.disabled && 'opacity-60')}>
      <select
        className={cn(
          'h-10 w-full cursor-pointer appearance-none rounded-lg border border-ink/10 bg-card px-3 pr-9 text-sm text-ink shadow-sm outline-none transition focus:border-ballpoint-400 focus:ring-2 focus:ring-ballpoint-500/20 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink/40"
        aria-hidden
      />
    </div>
  );
}
