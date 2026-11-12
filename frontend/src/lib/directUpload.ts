import { uploadFileDirectWithProgress, type UploadWithProgressOptions } from '../components/UploadProgressToast';

export type DirectUploadResult = {
  publicUrl: string;
  key: string;
  filename: string;
  mimetype: string;
  size: number;
};

/**
 * Uploads a file directly to storage (S3/R2 presigned PUT in cloud mode, or streaming PUT in local mode).
 * Streams directly to object storage bypassing multipart serialization on Express API workers.
 */
export async function uploadDirectMedia(
  file: File,
  token: string,
  label = 'Uploading media',
  options?: UploadWithProgressOptions,
): Promise<DirectUploadResult> {
  const sessionRes = await fetch('/api/media/upload-session', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contentType: file.type || 'application/octet-stream',
      filename: file.name,
    }),
    signal: options?.signal,
  });

  const session = await sessionRes.json().catch(() => ({}));
  if (!sessionRes.ok) {
    throw new Error(session.error || 'Failed to start upload session');
  }

  const headers: Record<string, string> = {
    ...(session.headers || {}),
  };
  if (session.mode === 'token') {
    headers.Authorization = `Bearer ${token}`;
  }

  const jobId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const putRes = await uploadFileDirectWithProgress(
    session.uploadUrl,
    file,
    headers,
    jobId,
    label,
    options,
  );

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.error || 'Direct media upload failed');
  }

  let finalPublicUrl = session.publicUrl;
  let finalKey = session.key;
  if (session.mode === 'token') {
    const done = await putRes.json().catch(() => ({}));
    if (done.publicUrl) finalPublicUrl = done.publicUrl;
    if (done.key) finalKey = done.key;
  }

  return {
    publicUrl: finalPublicUrl,
    key: finalKey,
    filename: file.name,
    mimetype: file.type || 'application/octet-stream',
    size: file.size,
  };
}
