'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, TriangleAlert } from 'lucide-react';

export type ToastTone = 'info' | 'error';

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(
  () => {}
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback((message: string, tone: ToastTone = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, tone });
    // Errors need longer than a confirmation — they have to be read and acted on.
    timer.current = setTimeout(() => setToast(null), tone === 'error' ? 5000 : 2800);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      {toast ? (
        <div
          key={toast.id}
          className="animate-toast pointer-events-none fixed bottom-6 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:w-auto"
          role={toast.tone === 'error' ? 'alert' : 'status'}
          aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
        >
          <div className="flex items-start gap-2.5 rounded-2xl bg-ink py-2.5 pl-3.5 pr-5 text-sm font-medium text-paper shadow-lg shadow-black/20 sm:rounded-full sm:items-center">
            {toast.tone === 'error' ? (
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400 sm:mt-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400 sm:mt-0" />
            )}
            {toast.message}
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
