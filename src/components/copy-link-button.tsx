'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

export function CopyLinkButton({
  link,
  label = 'Copy link',
  variant = 'secondary',
}: {
  link: string;
  label?: string;
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
    toast('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant={copied ? 'tick' : variant} onClick={copy}>
      {copied ? <Check /> : <Link2 />}
      {copied ? 'Copied' : label}
    </Button>
  );
}
