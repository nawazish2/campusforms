'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useSyncExternalStore,
} from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'cf-theme';

/**
 * Theme lives on `<html data-theme>` — the inline head script sets it before
 * first paint, so the snapshot below always reads the already-correct DOM.
 * Server snapshot is 'light', matching the SSR'd toggle icon; useSyncExternalStore
 * re-syncs to the real value after hydration without a mismatch error.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    observer.disconnect();
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function getServerSnapshot(): Theme {
  return 'light';
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private mode — theme just won't persist */
  }
}

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'light',
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Re-apply after React's dev Strict Mode remount clears the attributes the
  // inline script set; also persists the system preference on first visit.
  // Runs before paint, so there is no visible flicker.
  useLayoutEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        applyTheme(stored);
      } else {
        applyTheme(
          window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        );
      }
    } catch {
      /* private mode — DOM already carries the right theme */
    }
  }, []);

  const toggle = useCallback(() => {
    applyTheme(getSnapshot() === 'dark' ? 'light' : 'dark');
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
