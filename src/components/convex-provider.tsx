'use client';

import type { ReactNode } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ConvexAuthNextjsProvider } from '@convex-dev/auth/nextjs';
import { CONVEX_URL, isConvexConfigured } from '@/lib/db/env';

// `new ConvexReactClient('')` throws, which would take down every route during
// prerender. Without a URL the app renders its "not connected" state against a
// placeholder address that nothing ever queries (every hook skips).
const client = new ConvexReactClient(CONVEX_URL || 'http://127.0.0.1:1');

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!isConvexConfigured()) {
    return <ConvexProvider client={client}>{children}</ConvexProvider>;
  }
  return <ConvexAuthNextjsProvider client={client}>{children}</ConvexAuthNextjsProvider>;
}
