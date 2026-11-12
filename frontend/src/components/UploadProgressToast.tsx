import { useEffect, useState } from 'react';
import { X, CheckCircle2, Upload, AlertCircle } from 'lucide-react';
import { apiUrl, isBackendRelativePath } from '../lib/apiBase';

/** XHR is not covered by the fetch interceptor; route relative /api paths to the API origin. */
const xhrUrl = (u: string) => (isBackendRelativePath(u) ? apiUrl(u) : u);

export type UploadJob = {
  id: string;
  label: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
};

const _listeners: Set<() => void> = new Set();
const _jobs: Map<string, UploadJob> = new Map();

function notify() {
  _listeners.forEach((fn) => fn());
}

export function startUpload(id: string, label: string): void {
  _jobs.set(id, { id, label, progress: 0, status: 'uploading' });
  notify();
}

export function updateUploadProgress(id: string, progress: number): void {
  const job = _jobs.get(id);
  if (job) {
    job.progress = Math.min(100, Math.max(0, progress));
    notify();
  }
}

export function finishUpload(id: string): void {
  const job = _jobs.get(id);
  if (job) {
    job.progress = 100;
    job.status = 'done';
    notify();
    setTimeout(() => {
      _jobs.delete(id);
      notify();
    }, 3000);
  }
}

export function failUpload(id: string, error?: string): void {
  const job = _jobs.get(id);
  if (job) {
    job.status = 'error';
    job.error = error || 'Upload failed';
    notify();
    setTimeout(() => {
      _jobs.delete(id);
      notify();
    }, 5000);
  }
}

export type UploadWithProgressOptions = {
  signal?: AbortSignal;
};

export function uploadWithProgress(
  url: string,
  formData: FormData,
  token: string | null,
  jobId: string,
  label: string,
  options?: UploadWithProgressOptions,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    startUpload(jobId, label);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', xhrUrl(url));
    xhr.timeout = 0;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    const onAbort = () => {
      try {
        xhr.abort();
      } catch {
        /* ignore */
      }
    };
    if (options?.signal) {
      if (options.signal.aborted) {
        failUpload(jobId, 'Upload cancelled');
        reject(new Error('Upload cancelled'));
        return;
      }
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        updateUploadProgress(jobId, Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      options?.signal?.removeEventListener('abort', onAbort);
      const fakeResponse = new Response(xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: { 'Content-Type': 'application/json' },
      });
      if (xhr.status >= 200 && xhr.status < 300) {
        finishUpload(jobId);
      } else {
        let message = xhr.status === 413
          ? 'Video is too large to upload'
          : `Server returned ${xhr.status}`;
        try {
          const parsed = JSON.parse(xhr.responseText);
          if (parsed?.error) message = String(parsed.error);
        } catch { /* keep fallback */ }
        failUpload(jobId, message);
      }
      resolve(fakeResponse);
    });

    xhr.addEventListener('error', () => {
      options?.signal?.removeEventListener('abort', onAbort);
      failUpload(jobId, 'Network error');
      reject(new Error('Network error'));
    });

    xhr.addEventListener('timeout', () => {
      options?.signal?.removeEventListener('abort', onAbort);
      failUpload(jobId, 'Upload timed out');
      reject(new Error('Upload timed out'));
    });

    xhr.addEventListener('abort', () => {
      options?.signal?.removeEventListener('abort', onAbort);
      failUpload(jobId, 'Upload cancelled');
      reject(new Error('Upload cancelled'));
    });

    xhr.send(formData);
  });
}

export function uploadFileDirectWithProgress(
  uploadUrl: string,
  file: File | Blob,
  headers: Record<string, string>,
  jobId: string,
  label: string,
  options?: UploadWithProgressOptions,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    startUpload(jobId, label);
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', xhrUrl(uploadUrl));
    xhr.timeout = 0;
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }

    const onAbort = () => {
      try {
        xhr.abort();
      } catch {
        /* ignore */
      }
    };
    if (options?.signal) {
      if (options.signal.aborted) {
        failUpload(jobId, 'Upload cancelled');
        reject(new Error('Upload cancelled'));
        return;
      }
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        updateUploadProgress(jobId, Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      options?.signal?.removeEventListener('abort', onAbort);
      const fakeResponse = new Response(xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: { 'Content-Type': 'application/json' },
      });
      if (xhr.status >= 200 && xhr.status < 300) {
        finishUpload(jobId);
      } else {
        let message = `Direct upload returned ${xhr.status}`;
        try {
          const parsed = JSON.parse(xhr.responseText);
          if (parsed?.error) message = String(parsed.error);
        } catch { /* keep fallback */ }
        failUpload(jobId, message);
      }
      resolve(fakeResponse);
    });

    xhr.addEventListener('error', () => {
      options?.signal?.removeEventListener('abort', onAbort);
      failUpload(jobId, 'Network error during direct upload');
      reject(new Error('Network error during direct upload'));
    });

    xhr.addEventListener('timeout', () => {
      options?.signal?.removeEventListener('abort', onAbort);
      failUpload(jobId, 'Upload timed out');
      reject(new Error('Upload timed out'));
    });

    xhr.addEventListener('abort', () => {
      options?.signal?.removeEventListener('abort', onAbort);
      failUpload(jobId, 'Upload cancelled');
      reject(new Error('Upload cancelled'));
    });

    xhr.send(file);
  });
}

function useUploadJobs(): UploadJob[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);
  return Array.from(_jobs.values());
}

export default function UploadProgressToast() {
  const jobs = useUploadJobs();
  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[9999] flex flex-col gap-2 w-72 pointer-events-auto">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="bg-card border border-border rounded-xl shadow-xl p-3 space-y-1.5 animate-in slide-in-from-right"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {job.status === 'uploading' && <Upload size={14} className="text-primary animate-pulse shrink-0" />}
              {job.status === 'done' && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
              {job.status === 'error' && <AlertCircle size={14} className="text-rose-500 shrink-0" />}
              <span className="text-xs font-semibold truncate">{job.label}</span>
            </div>
            <span className="text-[11px] font-bold text-muted-foreground shrink-0">
              {job.status === 'uploading' ? `${job.progress}%` : job.status === 'done' ? 'Done' : 'Failed'}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                job.status === 'error'
                  ? 'bg-rose-500'
                  : job.status === 'done'
                    ? 'bg-emerald-500'
                    : 'bg-primary'
              }`}
              style={{ width: `${job.progress}%` }}
            />
          </div>
          {job.error && <p className="text-[10px] text-rose-500">{job.error}</p>}
        </div>
      ))}
    </div>
  );
}
