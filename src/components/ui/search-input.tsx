import { Search } from 'lucide-react';

export function SearchInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="relative w-full min-w-0 sm:max-w-xs">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/35"
        aria-hidden
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-label={label}
        className="h-10 w-full min-w-0 rounded-full border border-ink/10 bg-card pl-9 pr-4 text-sm shadow-sm outline-none transition placeholder:text-ink/35 focus:border-ballpoint-400 focus:ring-2 focus:ring-ballpoint-500/20"
      />
    </div>
  );
}
