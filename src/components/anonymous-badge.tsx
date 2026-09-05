import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AnonymousBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-ballpoint-50 px-2.5 py-0.5 text-xs font-medium text-ballpoint-700 ring-1 ring-inset ring-ballpoint-200',
        '',
        className
      )}
    >
      <Lock className="size-3" aria-hidden />
      Anonymous
    </span>
  );
}
