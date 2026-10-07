import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import { demoForm, isDemoFormId } from '@/lib/demo';
import { isConvexConfigured } from './env';
import type { FormSummary } from './schema';

/**
 * The public form for server-rendered metadata and share images. The demo
 * form lives in the client and never reaches Convex; anything that fails
 * (no deployment configured, bad id, network) is just "no form".
 */
export async function getPublicFormOnServer(id: string): Promise<FormSummary | null> {
  if (isDemoFormId(id)) return demoForm();
  if (!isConvexConfigured()) return null;
  try {
    return await fetchQuery(api.forms.get, { id });
  } catch {
    return null;
  }
}
