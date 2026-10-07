import { cn } from '@/lib/utils';

/** A blank paper slip with a gentle shimmer, shaped like a form card. */
export function CanvasShimmerSkeleton({
  className,
  label = 'Loading',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn('slip flex flex-col p-5', className)} aria-hidden>
      <div className="flex items-center gap-2">
        <div className="skeleton h-5 w-16 rounded-full" />
        <div className="skeleton h-5 w-20 rounded-full" />
      </div>
      <div className="skeleton mt-4 h-5 w-3/4 rounded" />
      <div className="skeleton mt-2.5 h-3 w-full rounded" />
      <div className="skeleton mt-1.5 h-3 w-2/3 rounded" />
      <div className="mt-auto border-t border-dashed border-ink/20 pt-3.5">
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
