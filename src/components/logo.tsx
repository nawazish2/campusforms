import Link from 'next/link';
import { SquareCheckBig } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40',
        className
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-ballpoint-600 text-white shadow-sm transition-transform duration-200 group-hover:-rotate-6">
        <SquareCheckBig className="size-[18px]" strokeWidth={2.4} />
      </span>
      <span className="font-display text-[17px] font-bold tracking-tight text-ink sm:text-[19px]">
        Campus<span className="text-ballpoint-600">Forms</span>
      </span>
    </Link>
  );
}
