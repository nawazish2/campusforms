'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Download, ExternalLink, Printer } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { DashboardHeader } from '@/components/dashboard-header';
import { CopyLinkButton, WhatsAppShareButton } from '@/components/copy-link-button';
import { buttonVariants } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useEditableForm, useRequireAuth } from '@/lib/db/hooks';
import { cn } from '@/lib/utils';

/**
 * Where Publish lands: the link and the QR, big, and nothing else. Results
 * live one click away — the first thing an organizer needs after publishing
 * is getting the form in front of students.
 */
export default function SharePage() {
  const params = useParams<{ id: string }>();
  const { form, loading, signedOut } = useEditableForm(params.id);
  useRequireAuth(signedOut);
  const toast = useToast();

  if (loading) {
    return (
      <div className="min-h-svh">
        <DashboardHeader />
        <main className="mx-auto max-w-2xl px-4 py-10" aria-hidden>
          <div className="skeleton h-[520px] w-full rounded-lg" />
        </main>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-svh">
        <DashboardHeader />
        <main className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Form not found</h1>
          <p className="mt-2 text-sm text-ink/60">It may have been deleted.</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-ballpoint-700"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to your forms
          </Link>
        </main>
      </div>
    );
  }

  const shareLink = `${window.location.origin}/f/${form.id}`;
  const live = form.status === 'open';

  const downloadQr = () => {
    const canvas = document.querySelector<HTMLCanvasElement>('#share-qr');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'campusforms-qr.png';
    a.click();
    toast('QR code downloaded');
  };

  return (
    <div className="min-h-svh">
      <DashboardHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:py-10">
        <ol className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/50">
          <li>1 · Pick</li>
          <li aria-hidden>→</li>
          <li>2 · Edit</li>
          <li aria-hidden>→</li>
          <li className="rounded-full bg-accent-solid px-2.5 py-1 text-on-accent">3 · Share</li>
        </ol>

        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {live ? 'Your form is live.' : 'Your form is not live yet.'}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/60">
          {live
            ? 'Send this link or show the QR code. Students open it and fill it in — no account needed.'
            : 'It is saved as a draft, so students who open the link will see that it isn’t accepting responses. Publish it from the results page.'}
        </p>

        <section className="mt-7 slip p-4 sm:p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
            Step 1 · Send the link
          </p>
          <p className="mt-3 break-all rounded-md border border-ink/10 bg-paper px-3.5 py-3 font-mono text-[14px]">
            {shareLink}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 [&>*]:max-sm:w-full">
            <CopyLinkButton link={shareLink} label="Copy link" variant="primary" />
            <WhatsAppShareButton title={form.title} url={shareLink} />
            <a
              href={shareLink}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'ghost' })}
            >
              <ExternalLink />
              Open the form
            </a>
          </div>
        </section>

        <section className="mt-4 flex flex-col items-center gap-5 slip p-5 sm:flex-row sm:p-6">
          <div className="rounded-lg bg-white p-3 ring-1 ring-ink/10">
            <QRCodeCanvas
              id="share-qr"
              value={shareLink}
              size={176}
              marginSize={2}
              fgColor="#1d1a16"
              bgColor="#ffffff"
              aria-label={`QR code linking to ${shareLink}`}
            />
          </div>
          <div className="text-center sm:text-left">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
              Step 2 · Or show the QR code
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink/60">
              Students scan it with their phone camera. Put it on a slide, a
              notice board or the mess door.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start [&>*]:max-sm:w-full">
              <button
                type="button"
                onClick={downloadQr}
                className={buttonVariants({ variant: 'secondary' })}
              >
                <Download />
                Download QR
              </button>
              <Link
                href={`/dashboard/form/${form.id}/poster`}
                className={buttonVariants({ variant: 'secondary' })}
              >
                <Printer />
                Print poster
              </Link>
            </div>
          </div>
        </section>

        <Link
          href={`/dashboard/form/${form.id}`}
          className={cn(buttonVariants({ variant: 'ghost' }), 'mt-6 max-sm:h-auto max-sm:min-h-10 max-sm:whitespace-normal')}
        >
          Step 3 · Watch responses come in
          <ArrowRight />
        </Link>
      </main>
    </div>
  );
}
