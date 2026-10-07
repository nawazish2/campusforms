'use client';

import { useSyncExternalStore } from 'react';
import { isDarkDocument } from '@/lib/theme-dom';

/** Follows `data-theme` and `.dark` on `<html>` without a hydration mismatch. */
export function useDarkTheme(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme'],
      });
      return () => observer.disconnect();
    },
    isDarkDocument,
    () => false
  );
}
