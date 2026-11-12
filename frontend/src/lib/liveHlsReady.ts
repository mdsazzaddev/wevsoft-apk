/**
 * Poll until MediaMTX (via /live-media) serves a real playlist.
 * UVP mounts once at Go Live — before OBS connects — so we remount when ready.
 */
export async function probeLiveHls(url: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store', signal });
    if (!res.ok) return false;
    const text = await res.text();
    if (!text.includes('#EXTM3U')) return false;
    if (/no stream is available|session not found|"status"\s*:\s*"error"/i.test(text)) return false;
    // Need a media playlist or variant line — not an empty shell.
    return /#EXTINF|STREAM-INF|main_stream|\.ts|\.m3u8/i.test(text);
  } catch {
    return false;
  }
}

export function watchLiveHlsReady(
  url: string | null | undefined,
  onReady: (ready: boolean) => void,
  opts?: { intervalMs?: number; timeoutMs?: number },
): () => void {
  if (!url) {
    onReady(false);
    return () => {};
  }
  const intervalMs = opts?.intervalMs ?? 2000;
  const timeoutMs = opts?.timeoutMs ?? 10 * 60 * 1000;
  const ac = new AbortController();
  let timer: ReturnType<typeof setInterval> | null = null;
  let done = false;

  const finish = (ready: boolean) => {
    if (done) return;
    done = true;
    if (timer) clearInterval(timer);
    timer = null;
    onReady(ready);
  };

  const tick = async () => {
    if (ac.signal.aborted) return;
    if (await probeLiveHls(url, ac.signal)) finish(true);
  };

  onReady(false);
  void tick();
  timer = setInterval(() => void tick(), intervalMs);
  const timeout = setTimeout(() => finish(false), timeoutMs);

  return () => {
    ac.abort();
    if (timer) clearInterval(timer);
    clearTimeout(timeout);
    done = true;
  };
}
