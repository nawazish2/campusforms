/** JPEG/PNG/WebP only — HEIC needs a decoder we don't ship. */
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MAX_EDGE = 1600;

const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function responseFilePath(formId: string, ref: string, questionId: string): string {
  return `${formId}/${ref}/${questionId}`;
}

/**
 * Re-encodes a student photo as JPEG, scaled down, so EXIF (and GPS) never
 * land in storage. Anonymous forms especially shouldn't keep a phone's
 * location in the file the warden opens.
 */
export async function preparePhoto(file: File): Promise<Blob> {
  if (!PHOTO_TYPES.has(file.type)) {
    throw new Error('Use a JPEG, PNG or WebP photo.');
  }
  if (file.size > PHOTO_MAX_BYTES) {
    throw new Error('That photo is over 5 MB. Pick a smaller one.');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Couldn’t process that photo.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.82)
  );
  if (!blob) throw new Error('Couldn’t process that photo.');
  return blob;
}
