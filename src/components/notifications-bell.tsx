'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { listMyForms, listRecentResponses } from '@/lib/db/forms';
import { useDb } from '@/lib/db/hooks';
import { avatarColor, cn, initials, timeAgo } from '@/lib/utils';
import type { FormResponse } from '@/lib/types';

const SEEN_KEY = 'campusforms-notifs-seen-v1';

/** Per-user "last time I looked at the bell" marker. */
function lastSeenAt(userId: string): number {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const all: unknown = raw ? JSON.parse(raw) : {};
    const v = (all as Record<string, string>)[userId];
    return v ? new Date(v).getTime() : 0;
  } catch {
    return 0;
  }
}

function markAllSeen(userId: string): void {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const all: unknown = raw ? JSON.parse(raw) : {};
    (all as Record<string, string>)[userId] = new Date().toISOString();
    localStorage.setItem(SEEN_KEY, JSON.stringify(all));
  } catch {
    // Ignore — worst case the badge keeps counting.
  }
}

/**
 * The dashboard's doorbell: an unseen-response count plus the recent list.
 * Deliberately in-app only — no email service, no keys — and the "seen"
 * marker lives in localStorage, so it's per browser like everything else
 * client-side.
 */
export function NotificationsBell() {
  const { user, ready, configured } = useAuth();
  const db = useDb();
  const [open, setOpen] = useState(false);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [titles, setTitles] = useState<Map<string, string>>(new Map());
  const wrap = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [recent, forms] = await Promise.all([
        listRecentResponses(db, 15),
        listMyForms(db, user.id),
      ]);
      setResponses(recent);
      setTitles(new Map(forms.map((f) => [f.id, f.title])));
    } catch {
      // The bell is a nicety — a failed poll just leaves it quiet.
    }
  }, [db, user]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets state from the fetch result, not synchronously; the rule can't see past the await.
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [user, load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!configured || !ready || !user) return null;

  const seen = lastSeenAt(user.id);
  const unread = responses.filter((r) => new Date(r.submittedAt).getTime() > seen).length;

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications — ${unread} unseen` : 'Notifications'}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'relative grid size-9 place-items-center rounded-lg text-ink/55 transition outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40',
          open ? 'bg-ink/[0.05] text-ink' : 'hover:bg-ink/[0.05] hover:text-ink'
        )}
      >
        <Bell className="size-[18px]" />
        {unread > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-ballpoint-600 px-1 text-[10px] font-bold leading-4 text-white"
            aria-hidden
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-pop absolute right-0 top-11 z-50 w-80 rounded-2xl border border-ink/10 bg-card p-1.5 shadow-lg"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-[13px] font-semibold">Recent responses</p>
            {unread > 0 ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => markAllSeen(user.id)}
                className="text-[12px] font-medium text-ballpoint-700 transition hover:text-ballpoint-800"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          {responses.length === 0 ? (
            <p className="px-3 pb-3 pt-1 text-[13px] leading-relaxed text-ink/45">
              Responses land here the moment students submit.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {responses.map((r) => {
                const unseen = new Date(r.submittedAt).getTime() > seen;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/dashboard/form/${r.formId}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-ink/[0.04]',
                        unseen && 'bg-ballpoint-50/60'
                      )}
                    >
                      <span
                        className={cn(
                          'grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                          avatarColor(r.respondentName)
                        )}
                        aria-hidden
                      >
                        {initials(r.respondentName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          {r.respondentName ?? 'Anonymous student'}
                        </span>
                        <span className="block truncate text-xs text-ink/45">
                          {titles.get(r.formId) ?? 'A form'}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-ink/40">
                        {timeAgo(r.submittedAt)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
