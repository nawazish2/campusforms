'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, CornerDownLeft, FilePlus2, LayoutGrid, Search } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { cn, pluralize } from '@/lib/utils';
import type { FormSummary } from '@/lib/db/schema';

interface Entry {
  id: string;
  group: string;
  title: string;
  sub?: string;
  badge?: React.ReactNode;
  run: (edit: boolean) => void;
}

/**
 * ⌘K desk drawer: jump to any form's results (⇧↵ for the editor),
 * start a new form, or open the student board. No data writes.
 */
export function CommandPalette({ forms }: { forms: FormSummary[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuery('');
        setCursor(0);
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // External open requests (e.g. the header ⌘K button) arrive as events —
  // subscribing is effect-safe, unlike syncing a prop into state.
  useEffect(() => {
    const open = () => {
      setQuery('');
      setCursor(0);
      setOpen(true);
    };
    window.addEventListener('cf:palette', open);
    return () => window.removeEventListener('cf:palette', open);
  }, []);

  const entries = useMemo<Entry[]>(() => {
    const q = query.trim().toLowerCase();
    const matched = forms
      .filter((f) => !q || f.title.toLowerCase().includes(q))
      .slice(0, 7);
    const list: Entry[] = [
      {
        id: 'new',
        group: 'Actions',
        title: 'New form',
        sub: 'Start from a template or blank',
        run: () => router.push('/dashboard/new'),
      },
      {
        id: 'browse',
        group: 'Actions',
        title: 'Student board',
        sub: 'See what students see',
        run: () => router.push('/browse'),
      },
      ...matched.map((f) => ({
        id: f.id,
        group: 'Forms',
        title: f.title || 'Untitled form',
        sub: pluralize(f.responseCount, 'response'),
        badge: <StatusBadge status={f.status} />,
        run: (edit: boolean) =>
          router.push(edit ? `/dashboard/form/${f.id}/edit` : `/dashboard/form/${f.id}`),
      })),
    ];
    return list;
  }, [forms, query, router]);

  if (!open) return null;

  const go = (edit: boolean) => {
    const e = entries[cursor];
    setOpen(false);
    e?.run(edit);
  };

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Command palette">
      <button
        aria-label="Close command palette"
        className="absolute inset-0 cursor-default bg-ink/40 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />
      <div className="absolute inset-x-4 top-[12vh] mx-auto max-w-lg overflow-hidden rounded-2xl border border-ink/10 bg-card shadow-xl">
        <div className="flex items-center gap-2.5 border-b border-ink/[0.07] px-4">
          <Search className="size-4 shrink-0 text-ink/40" aria-hidden />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, entries.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                go(e.shiftKey);
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            placeholder="Jump to a form, or start a new one…"
            aria-label="Command palette"
            className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-ink/35"
          />
          <kbd className="hidden shrink-0 rounded-md border border-ink/10 bg-ink/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-ink/50 sm:block">
            ESC
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2">
          {entries.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink/50">
              No forms match “{query}”.
            </p>
          ) : (
            (() => {
              let lastGroup = '';
              return entries.map((e, i) => {
                const head =
                  e.group !== lastGroup ? (
                    <p
                      key={e.group}
                      className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/40"
                    >
                      {e.group}
                    </p>
                  ) : null;
                lastGroup = e.group;
                return (
                  <div key={e.id + e.group}>
                    {head}
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => {
                        setOpen(false);
                        e.run(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                        cursor === i ? 'bg-ink/[0.05]' : 'bg-transparent'
                      )}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink/[0.05] text-ink/60">
                        {e.id === 'new' ? (
                          <FilePlus2 className="size-4" aria-hidden />
                        ) : e.id === 'browse' ? (
                          <LayoutGrid className="size-4" aria-hidden />
                        ) : (
                          <ArrowUpRight className="size-4" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{e.title}</span>
                        {e.sub ? (
                          <span className="block truncate text-xs text-ink/50">{e.sub}</span>
                        ) : null}
                      </span>
                      {e.badge}
                    </button>
                  </div>
                );
              });
            })()
          )}
        </div>
        <div className="hidden items-center gap-4 border-t border-ink/[0.07] px-4 py-2.5 font-mono text-[10px] text-ink/40 sm:flex">
          <span className="inline-flex items-center gap-1">
            <CornerDownLeft className="size-3" aria-hidden /> results
          </span>
          <span>⇧↵ edit</span>
          <span>↑↓ move</span>
        </div>
      </div>
    </div>
  );
}
