import Link from 'next/link';
import { SquareCheckBig } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <span className="relative grid size-8 shrink-0 place-items-center rounded-[6px] bg-accent-solid text-on-accent shadow-sm transition-transform duration-200 group-hover:-rotate-6">
        <SquareCheckBig className="size-[18px]" strokeWidth={2.4} />
        <span
          aria-hidden
          className="absolute -right-1 -top-1 size-2.5 rounded-full bg-pin shadow-[0_1px_2px_rgb(60_20_5/0.4)]"
        />
      </span>
      <span className="font-display text-xl font-semibold text-ink">
        Campus<span className="text-ballpoint-600">Forms</span>
      </span>
    </Link>
  );
}
