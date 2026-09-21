'use client';

import { useEffect, useState } from 'react';
import { isDarkDocument, observeDarkTheme } from '@/lib/theme-dom';

/** Follows `data-theme` and `.dark` on `<html>` after mount. */
export function useDarkTheme(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(isDarkDocument());
    return observeDarkTheme(setDark);
  }, []);

  return dark;
}
