import { Badge } from '@/components/ui/badge';
import { STATUS_META } from '@/lib/constants';
import type { FormStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export function StatusBadge({
  status,
  className,
}: {
  status: FormStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <Badge className={cn(meta.badge, className)}>
      <span
        className={cn(
          'size-1.5 rounded-full bg-current',
          status === 'open' && 'animate-pulse'
        )}
        aria-hidden
      />
      {meta.label}
    </Badge>
  );
}
