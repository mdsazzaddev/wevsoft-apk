/** Avatar API client (XHR so we get upload progress + abort). */
import { apiUrl } from '../../lib/apiBase';
export type AvatarCrop = { x: number; y: number; width: number; height: number; rotation?: number };

export type AvatarPostPrivacy = 'public' | 'friends' | 'followers' | 'private';

export type UploadAvatarOptions = {
  token: string | null | undefined;
  /** Sent only when the server should crop the original (no client-side filter baked in). */
  crop?: AvatarCrop | null;
  shareToFeed?: boolean;
  privacy?: AvatarPostPrivacy;
  caption?: string;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
};

export type UploadAvatarResult = {
  ok: boolean;
  avatar: string;
  path: string;
  albumId: string | null;
  postId: string | null;
  user?: any;
};

export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif';
export const AVATAR_MAX_BYTES = 10 * 1024 * 1024;

export function validateAvatarFile(file: File): string | null {
  const type = (file.type || '').toLowerCase();
  const okType = AVATAR_ACCEPT.split(',').includes(type) || /\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name);
  if (!okType) return 'Please choose a JPG, PNG, WEBP or HEIC image.';
  if (file.size > AVATAR_MAX_BYTES) return 'Image is too large (max 10MB).';
  return null;
}

export class AvatarUploadAborted extends Error {
  constructor() { super('Upload cancelled'); this.name = 'AvatarUploadAborted'; }
}

export function uploadAvatar(file: Blob, fileName: string, opts: UploadAvatarOptions): Promise<UploadAvatarResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file, fileName);
    if (opts.crop) form.append('crop', JSON.stringify(opts.crop));
    form.append('shareToFeed', opts.shareToFeed === false ? 'false' : 'true');
    if (opts.privacy) form.append('privacy', opts.privacy);
    if (opts.caption) form.append('caption', opts.caption);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl('/api/profile/avatar'));
    if (opts.token) xhr.setRequestHeader('Authorization', `Bearer ${opts.token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: any = {};
      try { body = JSON.parse(xhr.responseText || '{}'); } catch { /* non-JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as UploadAvatarResult);
      else reject(new Error(body?.error || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading'));
    xhr.onabort = () => reject(new AvatarUploadAborted());
    if (opts.signal) {
      if (opts.signal.aborted) { xhr.abort(); return; }
      opts.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }
    xhr.send(form);
  });
}

export async function removeAvatar(token: string | null | undefined): Promise<{ ok: boolean; user?: any }> {
  const res = await fetch('/api/profile/avatar', {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || 'Could not remove profile photo');
  return body;
}
