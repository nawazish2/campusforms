import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FilterChip({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]',
        active
          ? 'border-accent-solid bg-accent-solid text-on-accent shadow-sm'
          : 'border-ink/15 bg-card text-ink/70 hover:border-ink/40 hover:text-ink'
      )}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
      {children}
    </button>
  );
}
