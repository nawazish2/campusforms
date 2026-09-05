import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-ink/[0.08] bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate font-mono text-[11px] uppercase tracking-wider text-ink/45">
          {label}
        </p>
        <Icon className="size-4 shrink-0 text-ink/30" aria-hidden />
      </div>
      <p className="mt-2 font-display text-[26px] font-bold leading-none tracking-tight">
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-[13px] text-ink/50">{sub}</p> : null}
    </div>
  );
}
