/** Cover API client (XHR for upload progress + abort). Mirrors features/avatar/avatarApi. */
import type { AvatarCrop } from '../avatar/avatarApi';
import { apiUrl } from '../../lib/apiBase';

export type CoverCrop = AvatarCrop;
export type CoverAdjustments = { brightness: number; contrast: number; saturation: number };
export const DEFAULT_COVER_ADJUSTMENTS: CoverAdjustments = { brightness: 100, contrast: 100, saturation: 100 };
export const isDefaultCoverAdjustments = (a: CoverAdjustments) => a.brightness === 100 && a.contrast === 100 && a.saturation === 100;
export const coverFilterCss = (a: CoverAdjustments) =>
  isDefaultCoverAdjustments(a) ? '' : `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%)`;

export const COVER_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif';
/** Cover input also accepts video (handled by the legacy coverVideo path). */
export const COVER_INPUT_ACCEPT = `${COVER_IMAGE_ACCEPT},video/mp4,video/webm,video/quicktime`;
export const COVER_MAX_BYTES = 12 * 1024 * 1024;
/** Stored cover aspect (server outputs 1920x1080). */
export const COVER_ASPECT = 16 / 9;
/** Desktop header aspect (820x312); shown as a guide band in the editor. */
export const COVER_DESKTOP_ASPECT = 820 / 312;

export function validateCoverFile(file: File): string | null {
  const type = (file.type || '').toLowerCase();
  const ok = COVER_IMAGE_ACCEPT.split(',').includes(type) || /\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name);
  if (!ok) return 'Please choose a JPG, PNG, WEBP or HEIC image.';
  if (file.size > COVER_MAX_BYTES) return 'Image is too large (max 12MB).';
  return null;
}

export class CoverUploadAborted extends Error {
  constructor() { super('Upload cancelled'); this.name = 'CoverUploadAborted'; }
}

export type UploadCoverResult = { ok: boolean; cover: string; path: string; coverPhotoConfig?: any; user?: any };

export function uploadCover(
  file: Blob,
  fileName: string,
  opts: { token: string | null | undefined; crop?: CoverCrop | null; adjustments?: CoverAdjustments | null; onProgress?: (pct: number) => void; signal?: AbortSignal },
): Promise<UploadCoverResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file, fileName);
    if (opts.crop) form.append('crop', JSON.stringify(opts.crop));
    if (opts.adjustments && !isDefaultCoverAdjustments(opts.adjustments)) form.append('adjustments', JSON.stringify(opts.adjustments));
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl('/api/profile/cover'));
    if (opts.token) xhr.setRequestHeader('Authorization', `Bearer ${opts.token}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      let body: any = {};
      try { body = JSON.parse(xhr.responseText || '{}'); } catch { /* non-JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as UploadCoverResult);
      else reject(new Error(body?.error || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading'));
    xhr.onabort = () => reject(new CoverUploadAborted());
    if (opts.signal) {
      if (opts.signal.aborted) { xhr.abort(); return; }
      opts.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }
    xhr.send(form);
  });
}

export async function removeCover(token: string | null | undefined): Promise<{ ok: boolean; user?: any }> {
  const res = await fetch('/api/profile/cover', { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || 'Could not remove cover photo');
  return body;
}