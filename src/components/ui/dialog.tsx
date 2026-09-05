'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function Dialog({ open, onClose, title, description, children }: DialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount flag: the client-only branch must not render during SSR/hydration.
    setMounted(true);
  }, []);

  const panel = useRef<HTMLDivElement>(null);

  // Callers pass an inline arrow, so `onClose` changes identity on every
  // parent render. Keeping it in a ref stops the focus effect below from
  // tearing down and stealing focus back mid-interaction.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const focusables = useCallback(
    () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => !el.hasAttribute('disabled')),
    []
  );

  useEffect(() => {
    if (!open) return;
    // Keyboard and screen-reader users have to end up inside the dialog, stay
    // inside it while it's open, and come back to whatever opened it.
    const opener = document.activeElement as HTMLElement | null;
    const first = focusables()[0] ?? panel.current;
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const edge = e.shiftKey ? items[0] : items[items.length - 1];
      if (document.activeElement === edge || !panel.current?.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? items[items.length - 1] : items[0]).focus();
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      opener?.focus?.();
    };
  }, [open, focusables]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-[#0d1017]/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panel}
        tabIndex={-1}
        className="animate-pop relative w-full max-w-md rounded-2xl border border-ink/10 bg-card p-6 shadow-xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-ink/40 transition hover:bg-ink/[0.05] hover:text-ink"
        >
          <X className="size-4" />
        </button>
        <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
        {description ? <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{description}</p> : null}
        <div className="mt-5 flex justify-end gap-2.5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
