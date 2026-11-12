/**
 * Direct-to-storage upload for media picked in the post composer / Media Studio.
 * Only uploads the file bytes; posts never save drafts.
 *
 * Prefers cloud presigned PUT when the API offers it; on 4xx (bad R2/S3 signature,
 * ACL, etc.) retries once with token/local mode so compose/publish still works.
 */
export async function uploadEditorMediaEarly(
  file: File,
  token: string,
  opts?: { preferToken?: boolean },
): Promise<{
  publicUrl: string;
  key: string;
}> {
  const sessionRes = await fetch('/api/media/upload-session', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contentType: file.type || 'application/octet-stream',
      filename: file.name,
      ...(opts?.preferToken ? { preferToken: true } : {}),
    }),
  });
  const session = await sessionRes.json().catch(() => ({}));
  if (!sessionRes.ok) throw new Error(session.error || 'Could not start upload');

  const headers: Record<string, string> = {
    ...(session.headers || {}),
  };
  if (session.mode === 'token') {
    headers.Authorization = `Bearer ${token}`;
  }

  const putRes = await fetch(session.uploadUrl, {
    method: 'PUT',
    headers,
    body: file,
  });
  if (!putRes.ok) {
    // Broken cloud credentials often 400 on the first presigned PUT — fall back to API token upload.
    if (!opts?.preferToken && session.mode === 'presigned' && putRes.status >= 400 && putRes.status < 500) {
      return uploadEditorMediaEarly(file, token, { preferToken: true });
    }
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.error || `Direct upload failed (${putRes.status})`);
  }

  if (session.mode === 'token') {
    const done = await putRes.json().catch(() => ({}));
    return { publicUrl: done.publicUrl || session.publicUrl, key: done.key || session.key };
  }

  return { publicUrl: session.publicUrl, key: session.key };
}
