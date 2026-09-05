'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { Download } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

/**
 * Scannable QR for the notice board — always rendered on a white tile so it
 * prints and scans well in both themes. PNG download for posters.
 */
export function QrShare({ link }: { link: string }) {
  const toast = useToast();

  const download = () => {
    const canvas = document.querySelector<HTMLCanvasElement>('#form-qr');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'campusforms-qr.png';
    a.click();
    toast('QR code downloaded — print it for the notice board');
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-2 self-center sm:self-start">
      <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-ink/10">
        <QRCodeCanvas
          id="form-qr"
          value={link}
          size={104}
          marginSize={2}
          fgColor="#181b25"
          bgColor="#ffffff"
          aria-label={`QR code linking to ${link}`}
        />
      </div>
      <button
        type="button"
        onClick={download}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink/45 transition hover:text-ballpoint-700 outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40 rounded"
      >
        <Download className="size-3" aria-hidden />
        PNG
      </button>
    </div>
  );
}
