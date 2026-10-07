'use client';

import { useCallback, useMemo } from 'react';
import { ConvexError } from 'convex/values';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { AnswerValue, FormDefinition, FormStatus, ResponseStatus } from '@/lib/types';

/**
 * Writes. Authorization and every business rule live in the Convex functions
 * these call; nothing here is trusted. Convex mutations re-run the live
 * queries that read the same data, so none of these need a "refresh".
 */

/** The sentence a ConvexError carries, or the plain error text. */
export function errorMessage(e: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (e instanceof ConvexError) return typeof e.data === 'string' ? e.data : fallback;
  if (e instanceof Error) return e.message;
  return fallback;
}

/** 16 lowercase hex chars — the public receipt a student can type back. */
export function newResponseRef(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Everything an organizer can do to their forms and responses. */
export function useOrganizerActions() {
  const create = useMutation(api.forms.create);
  const update = useMutation(api.forms.update);
  const setStatus = useMutation(api.forms.setStatus);
  const setPinned = useMutation(api.forms.setPinned);
  const duplicate = useMutation(api.forms.duplicate);
  const remove = useMutation(api.forms.remove);
  const setResponseStatus = useMutation(api.responses.setStatus);
  const setResponseNote = useMutation(api.responses.setNote);
  const removeResponse = useMutation(api.responses.remove);

  return useMemo(
    () => ({
      /** Creates a form and returns its id. */
      createForm: (form: Omit<FormDefinition, 'id' | 'createdAt' | 'pinned'>) =>
        create({
          title: form.title,
          description: form.description,
          category: form.category,
          status: form.status,
          anonymous: form.anonymous,
          deadline: form.deadline,
          questions: form.questions,
          maxResponses: form.maxResponses,
        }),
      updateForm: (id: string, form: Omit<FormDefinition, 'id' | 'createdAt' | 'pinned'>) =>
        update({
          id,
          title: form.title,
          description: form.description,
          category: form.category,
          status: form.status,
          anonymous: form.anonymous,
          deadline: form.deadline,
          questions: form.questions,
          maxResponses: form.maxResponses,
        }),
      setFormStatus: (id: string, status: FormStatus) => setStatus({ id, status }),
      setFormPinned: (id: string, pinned: boolean) => setPinned({ id, pinned }),
      duplicateForm: (id: string) => duplicate({ id }),
      deleteForm: (id: string) => remove({ id }),
      setResponseStatus: (id: string, status: ResponseStatus) =>
        setResponseStatus({ id, status }),
      setResponseNote: (id: string, note: string) =>
        setResponseNote({ id, note: note.slice(0, 280) }),
      deleteResponse: (id: string) => removeResponse({ id }),
    }),
    [create, update, setStatus, setPinned, duplicate, remove, setResponseStatus, setResponseNote, removeResponse]
  );
}

/** What a student can do: upload a photo, then file the response. */
export function useResponseActions() {
  const generateUploadUrl = useMutation(api.responses.generateUploadUrl);
  const submit = useMutation(api.responses.submit);

  /** Uploads one photo and returns its storage id — the value the answer stores. */
  const uploadResponsePhoto = useCallback(
    async (formId: string, blob: Blob): Promise<string> => {
      const url = await generateUploadUrl({ formId });
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
        body: blob,
      });
      if (!res.ok) throw new Error('The photo didn’t upload. Try again.');
      const { storageId } = (await res.json()) as { storageId: string };
      return storageId;
    },
    [generateUploadUrl]
  );

  /**
   * Files a student's submission and returns its public REF. The ref is made
   * here, not by the server, so the confirmation screen can show it without a
   * read — a visitor can't read a response row.
   */
  const addResponse = useCallback(
    async (input: {
      formId: string;
      respondentName: string | null;
      respondentEmail: string | null;
      answers: Record<string, AnswerValue>;
      ref?: string;
    }): Promise<string> => {
      const send = (ref: string) => submit({ ...input, ref });
      try {
        return await send(input.ref ?? newResponseRef());
      } catch (e) {
        // A 64-bit collision is vanishingly rare; retry once with a new ref.
        if (errorMessage(e) !== 'That reference code is already used') throw e;
        return await send(newResponseRef());
      }
    },
    [submit]
  );

  return { uploadResponsePhoto, addResponse };
}

export function useRequestOrganizerAccess() {
  const create = useMutation(api.organizerRequests.create);
  return useCallback((email: string, note: string) => create({ email, note }), [create]);
}
