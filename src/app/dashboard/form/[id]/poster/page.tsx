'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { useEditableForm, useRequireAuth } from '@/lib/db/hooks';
import { CATEGORIES, CATEGORY_ACCENT } from '@/lib/constants';
import { cn, deadlineInfo, estimateFillMinutes } from '@/lib/utils';

/**
 * An A4 sheet for the notice board: the form, a big scannable QR and nothing
 * else. Browsers' "Save as PDF" turns Print into the download.
 */
export default function PosterPage() {
  const params = useParams<{ id: string }>();
  const { form, loading, signedOut } = useEditableForm(params.id);
  useRequireAuth(signedOut);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16" aria-hidden>
        <div className="skeleton mx-auto h-[720px] w-full max-w-[640px] rounded-lg" />
      </main>
    );
  }

  if (!form) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Form not found</h1>
        <p className="mt-2 text-sm text-ink/60">It may have been deleted.</p>
        <Link
          href="/dashboard"
          className={cn('mt-6 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-ballpoint-700')}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to dashboard
        </Link>
      </main>
    );
  }

  const shareLink =
    typeof window !== 'undefined' ? `${window.location.origin}/f/${form.id}` : '';
  const dl = deadlineInfo(form.deadline);
  const Icon = CATEGORIES[form.category].icon;

  return (
    <div className="min-h-svh bg-paper px-4 py-6 sm:py-10 print:bg-white print:px-0 print:py-0">
      {/* Screen-only toolbar */}
      <div className="mx-auto mb-4 flex max-w-[640px] flex-wrap items-center justify-between gap-2 sm:mb-6 print:hidden">
        <Link
          href={`/dashboard/form/${form.id}`}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-ink/60 transition hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to results
        </Link>
        <Button onClick={() => window.print()}>
          <Printer />
          Print or save as PDF
        </Button>
      </div>

      {/* The sheet */}
      <div className="mx-auto flex max-w-[640px] flex-col items-center slip px-5 py-8 text-center sm:px-10 sm:py-12 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <Logo />
        <span
          className={cn(
            'mt-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold',
            CATEGORY_ACCENT[form.category].band
          )}
        >
          <Icon className="size-4" aria-hidden />
          {CATEGORIES[form.category].label} form
        </span>

        <h1 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {form.title}
        </h1>
        {form.description ? (
          <p className="mt-4 text-[15px] leading-relaxed text-ink/60">{form.description}</p>
        ) : null}

        <div className="mt-8 w-full max-w-[304px] rounded-lg border-2 border-ink/10 bg-white p-4 sm:mt-10 sm:p-5">
          <QRCodeCanvas
            value={shareLink}
            size={264}
            style={{ width: '100%', height: 'auto' }}
            marginSize={1}
            fgColor="#181b25"
            bgColor="#ffffff"
            aria-label={`QR code for ${form.title}`}
          />
        </div>

        <p className="mt-8 font-display text-xl font-semibold tracking-tight sm:text-2xl">
          Scan to fill — takes ~{estimateFillMinutes(form.questions)} min
        </p>
        <p className="mt-2 break-all font-mono text-[13px] text-ink/60">{shareLink}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 font-mono text-[12px] text-ink/60">
          <span>No sign-in needed</span>
          {form.anonymous ? (
            <span className="rounded-full border border-ballpoint-300 bg-ballpoint-50 px-3 py-1 font-semibold text-ballpoint-800">
              Anonymous — names aren’t collected
            </span>
          ) : null}
          {dl.label ? (
            <span
              className={cn(
                'rounded-full border border-ink/10 px-3 py-1',
                dl.label.startsWith('Closes today') && 'border-warn-bd font-semibold text-warn-tx'
              )}
            >
              {dl.label}
            </span>
          ) : null}
        </div>

        <div className="mt-12 border-t border-ink/10 pt-6 text-xs text-ink/60">
          Run on CampusForms — every campus form, one link.
        </div>
      </div>
    </div>
  );
}
