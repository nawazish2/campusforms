import { cn } from '@/lib/utils';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-10 w-full min-w-0 rounded-lg border border-ink/10 bg-card px-3 text-sm text-ink shadow-sm outline-none transition placeholder:text-ink/35 focus:border-ballpoint-400 focus:ring-2 focus:ring-ballpoint-500/20 disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-lg border border-ink/10 bg-card px-3 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-ink/35 focus:border-ballpoint-400 focus:ring-2 focus:ring-ballpoint-500/20 disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    />
  );
}
