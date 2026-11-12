/**
 * Optional DASH attach for UniversalVideoPlayer (W5).
 * dash.js is dynamically imported — zero cost when unused.
 */
import { isDashUrl } from './videoAbrPrefs';

export type AttachDashResult = {
  destroy: () => void;
};

export { isDashUrl };

export async function attachDashToVideo(
  video: HTMLVideoElement,
  src: string,
  opts: {
    preferredQuality?: string | null;
    onFatalError?: () => void;
  } = {},
): Promise<AttachDashResult> {
  let destroyed = false;
  let player: { reset: () => void; destroy?: () => void } | null = null;

  const destroy = () => {
    destroyed = true;
    try {
      player?.reset();
      player?.destroy?.();
    } catch {
      /* ignore */
    }
    player = null;
    try {
      video.removeAttribute('src');
      video.load();
    } catch {
      /* ignore */
    }
  };

  try {
    const dashjs = await import('dashjs');
    if (destroyed) return { destroy };
    const MediaPlayer = dashjs.MediaPlayer;
    const instance = MediaPlayer().create();
    player = instance;
    instance.initialize(video, src, false);
    instance.updateSettings({
      streaming: {
        abr: {
          autoSwitchBitrate: { video: true, audio: true },
        },
      },
    });

    const maxH = (() => {
      const key = String(opts.preferredQuality || '').trim().toLowerCase();
      if (!key || key === 'auto') return null;
      const m = key.match(/(\d{3,4})/);
      return m ? Number(m[1]) : null;
    })();
    if (maxH != null && typeof (instance as any).setMaxAllowedBitrateFor === 'function') {
      // Approximate Mbps cap from height ladder.
      const kbps =
        maxH <= 360 ? 800 : maxH <= 480 ? 1500 : maxH <= 720 ? 3000 : maxH <= 1080 ? 6000 : 12000;
      try {
        (instance as any).setMaxAllowedBitrateFor('video', kbps);
      } catch {
        /* optional */
      }
    }

    instance.on(dashjs.MediaPlayer.events.ERROR, () => {
      opts.onFatalError?.();
    });

    void video.play().catch(() => {
      if (!video.muted) {
        video.muted = true;
        void video.play().catch(() => {});
      }
    });
  } catch {
    opts.onFatalError?.();
  }

  return { destroy };
}
