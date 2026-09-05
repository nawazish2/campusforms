'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, EyeOff } from 'lucide-react';
import { CategoryBadge } from '@/components/category-badge';
import { StarInput } from '@/components/stars';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const ISSUES = [
  'Water leak in bathroom',
  'Fan not working',
  'Wi-Fi is down',
  'Housekeeping missed a day',
];

const BARS = [10, 14, 9, 17, 13, 20, 24];

/** Signature hero moment: a live mini form that gets stamped on submit. */
export function HeroDemo() {
  const [issue, setIssue] = useState<string | null>(null);
  const [urgency, setUrgency] = useState(0);
  const [details, setDetails] = useState('');
  const [stamped, setStamped] = useState(false);

  useEffect(() => {
    if (!stamped) return;
    const t = setTimeout(() => setStamped(false), 3400);
    return () => clearTimeout(t);
  }, [stamped]);

  return (
    <div className="relative mx-auto w-full max-w-md pt-12 pb-10">
      {/* Floating response-stats chip */}
      <div className="animate-float-a absolute -right-3 -top-4 z-10 rotate-2 rounded-2xl border border-ink/[0.08] bg-card px-4 py-3 shadow-lg shadow-ink/[0.06] sm:-right-8">
        <p className="font-mono text-[10px] uppercase tracking-wider text-ink/45">
          This week
        </p>
        <div className="mt-1.5 flex items-end gap-3">
          <p className="font-display text-xl font-bold leading-none">128</p>
          <div className="flex items-end gap-[3px]">
            {BARS.map((h, i) => (
              <span
                key={i}
                className={cn(
                  'w-[5px] rounded-sm',
                  i === BARS.length - 1
                    ? 'bg-ballpoint-600'
                    : 'bg-ballpoint-200'
                )}
                style={{ height: h }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating anonymous chip */}
      <div className="animate-float-b absolute -bottom-2 -left-2 z-10 -rotate-2 rounded-full border border-ink/[0.08] bg-card px-4 py-2.5 shadow-lg shadow-ink/[0.06] sm:-left-7">
        <p className="flex items-center gap-2 text-[13px] font-medium text-ink/70">
          <EyeOff className="size-3.5 text-ballpoint-600" aria-hidden />
          Anonymous mess feedback on
        </p>
      </div>

      <div className="relative rotate-[1.2deg] rounded-2xl border border-ink/[0.08] bg-card p-6 shadow-xl shadow-ink/[0.07] transition-transform duration-300 hover:rotate-0">
        <div className="flex items-center justify-between">
          <CategoryBadge category="hostel" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
            HST-01 · Open
          </span>
        </div>
        <h3 className="mt-3.5 font-display text-lg font-bold tracking-tight">
          Hostel Maintenance Complaint
        </h3>

        <p className="mt-5 text-sm font-semibold">
          What’s the issue? <span className="text-red-500">*</span>
        </p>
        <div className="mt-2 grid gap-1.5">
          {ISSUES.map((opt) => {
            const checked = issue === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setIssue(opt)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3.5 py-2 text-sm transition',
                  checked
                    ? 'border-ballpoint-500 bg-ballpoint-50 font-medium text-ballpoint-900 ring-1 ring-ballpoint-500'
                    : 'border-ink/10 bg-card text-ink/80 hover:border-ink/25 hover:bg-ink/[0.02]'
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid size-[16px] shrink-0 place-items-center rounded-full border-2 transition',
                    checked ? 'border-ballpoint-600' : 'border-ink/25'
                  )}
                >
                  {checked ? <span className="size-2 rounded-full bg-ballpoint-600" /> : null}
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        <p className="mt-5 text-sm font-semibold">
          How urgent is it? <span className="text-red-500">*</span>
        </p>
        <div className="mt-1.5">
          <StarInput value={urgency} onChange={setUrgency} max={5} />
        </div>

        <Textarea
          rows={2}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Describe it (optional)…"
          className="mt-5"
        />

        <Button className="mt-5 w-full" variant={stamped ? 'tick' : 'primary'} onClick={() => setStamped(true)}>
          {stamped ? <CheckCircle2 /> : null}
          {stamped ? 'Response recorded' : 'Submit response'}
        </Button>

        {stamped ? (
          <div className="animate-stamp pointer-events-none absolute inset-0 grid place-items-center">
            <div className="rounded-xl border-[3px] border-tick bg-card/85 px-6 py-2.5 text-center backdrop-blur-[1px]">
              <p className="font-mono text-lg font-bold uppercase tracking-[0.2em] text-tick">
                Submitted
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-tick/80">
                Received by hostel office
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
