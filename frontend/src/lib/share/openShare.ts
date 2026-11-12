/**
 * Open the Universal Share modal from anywhere (one host, mounted once in App).
 * Call sites that already render their own <ShareModal> keep doing so; this is
 * for Share buttons that previously had their own ad-hoc navigator.share/clipboard code.
 */

import type { SharePreview } from '../../components/share/ShareContentPreview';

export interface OpenShareOptions {
  url: string;
  title?: string;
  targetType?: string;
  targetId?: string | null;
  preview?: SharePreview | null;
  allowRepost?: boolean;
  /** Stack above a full-screen overlay (e.g. the post viewer at z-420). */
  zIndex?: number;
}

type Listener = (opts: OpenShareOptions | null) => void;
const listeners = new Set<Listener>();
let current: OpenShareOptions | null = null;

export function openShare(opts: OpenShareOptions): void {
  current = opts;
  listeners.forEach((l) => l(current));
}

export function closeShare(): void {
  current = null;
  listeners.forEach((l) => l(null));
}

export function subscribeShare(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getShareState(): OpenShareOptions | null {
  return current;
}
