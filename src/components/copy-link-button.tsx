'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn, formShareText, whatsappShareHref } from '@/lib/utils';

export function CopyLinkButton({
  link,
  label = 'Copy link',
  copiedToast = 'Link copied to clipboard',
  variant = 'secondary',
}: {
  link: string;
  label?: string;
  copiedToast?: string;
  variant?: 'secondary' | 'primary';
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    toast(copiedToast);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant={copied ? 'tick' : variant} onClick={copy}>
      {copied ? <Check /> : <Link2 />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

function WhatsAppMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M12.04 2c-5.46 0-9.91 4.44-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.39-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.25 8.25-8.25zm-2.7 4.4c-.17 0-.44.06-.67.31-.23.26-.88.86-.88 2.1 0 1.24.9 2.44 1.02 2.61.13.17 1.75 2.79 4.32 3.8 2.14.85 2.58.68 3.04.64.46-.04 1.48-.6 1.69-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.3-.25-.13-1.48-.73-1.71-.82-.23-.08-.4-.13-.56.13-.17.25-.65.81-.8.98-.15.17-.3.19-.55.06-.25-.13-1.06-.39-2.02-1.25-.75-.66-1.25-1.48-1.4-1.73-.15-.25-.02-.38.11-.51.12-.12.25-.3.38-.46.12-.15.17-.26.25-.43.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.84-.2-.48-.4-.41-.56-.42z"
      />
    </svg>
  );
}

export function WhatsAppShareButton({
  title,
  url,
  className,
}: {
  title: string;
  url: string;
  className?: string;
}) {
  return (
    <a
      href={whatsappShareHref(formShareText(title, url))}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: 'secondary' }), className)}
    >
      <WhatsAppMark />
      WhatsApp
    </a>
  );
}
