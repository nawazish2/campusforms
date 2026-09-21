import { Search } from 'lucide-react';
import type { RefObject } from 'react';

export function SearchInput({
  value,
  onChange,
  label,
  inputRef,
  kbd,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  /** Small hint pinned inside the field, e.g. "/" — purely visual. */
  kbd?: string;
}) {
  return (
    <div className="relative w-full min-w-0 sm:max-w-xs">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40"
        aria-hidden
      />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-label={label}
        className="h-10 w-full min-w-0 rounded-full border border-ink/10 bg-card pl-9 pr-10 text-sm shadow-sm outline-none transition placeholder:text-ink/40 focus:border-ballpoint-400 focus:ring-2 focus:ring-ballpoint-500/20"
      />
      {kbd ? (
        <kbd
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-ink/10 bg-ink/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-ink/50 sm:block"
        >
          {kbd}
        </kbd>
      ) : null}
    </div>
  );
}
