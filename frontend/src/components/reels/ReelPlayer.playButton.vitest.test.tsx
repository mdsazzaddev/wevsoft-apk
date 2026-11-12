import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ReelPlayer from './ReelPlayer';
import type { ReelsSettings } from '../../lib/reelsPrefs';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

vi.mock('../video/UniversalVideoPlayer', () => ({
  default: ({ src, onError }: { src: string; onError?: () => void }) => (
    <video data-testid="reel-video" src={src} onError={() => onError?.()} />
  ),
}));

const settings = {
  autoplayMode: 'always',
  soundMode: 'muted',
  defaultVolume: 0.8,
  playbackSpeed: 1,
  loopVideo: true,
  autoNext: false,
  dataSaver: true,
  hdOnlyWifi: false,
  disablePreload: false,
  autoCaptions: false,
  captionLanguage: 'en',
  captionFontSize: 'md',
  highContrast: false,
  infiniteScroll: true,
  showWatched: true,
  cinematicMode: false,
  showNavIndicator: true,
  showProgressBar: false,
  autoHideChrome: false,
  preferredQuality: 'Auto',
} satisfies ReelsSettings;

const reel = {
  id: 'reel-1',
  videoUrl: 'https://cdn.example.test/media/reels/a.mp4',
  thumbnailUrl: '/media/reels/a.jpg',
  durationSec: 8,
  mediaFiles: [],
};

function playerProps(playing: boolean, onTogglePlay: (() => void) | undefined = () => {}) {
  return {
    reel,
    isActive: true as const,
    shouldLoad: true as const,
    isMuted: true as const,
    playbackRate: 1,
    volume: 1,
    brightness: 1,
    loop: true as const,
    autoplay: false as const,
    settings,
    cinematic: false as const,
    showProgress: false as const,
    zoom: 1,
    onTime: () => {},
    onEnded: () => {},
    videoRef: { current: null as HTMLVideoElement | null },
    playing,
    onTogglePlay,
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ReelPlayer play control', () => {
  it('keeps the center icon hidden while idle (paused or playing)', () => {
    const { unmount } = render(<ReelPlayer {...playerProps(false)} />);
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
    expect(document.querySelector('[data-reel-play-flash]')).toBeNull();
    expect(screen.queryByText(/Playing|Paused/)).toBeNull();
    unmount();

    render(<ReelPlayer {...playerProps(true)} />);
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
    expect(document.querySelector('[data-reel-play-flash]')).toBeNull();
  });

  it('flashes Pause then hides when playback stops', () => {
    vi.useFakeTimers();
    const { rerender } = render(<ReelPlayer {...playerProps(true)} />);

    rerender(<ReelPlayer {...playerProps(false)} />);
    expect(document.querySelector('[data-reel-play-flash="pause"]')).toBeTruthy();
    expect(document.querySelector('.rounded-full.bg-black\\/40')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(document.querySelector('[data-reel-play-flash]')).toBeNull();
  });

  it('flashes Play then hides on a user resume (not the first autoplay)', () => {
    vi.useFakeTimers();
    const { rerender } = render(<ReelPlayer {...playerProps(false)} />);

    // First play after mount = autoplay seam → no flash
    rerender(<ReelPlayer {...playerProps(true)} />);
    expect(document.querySelector('[data-reel-play-flash]')).toBeNull();

    rerender(<ReelPlayer {...playerProps(false)} />);
    expect(document.querySelector('[data-reel-play-flash="pause"]')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(700);
    });

    rerender(<ReelPlayer {...playerProps(true)} />);
    expect(document.querySelector('[data-reel-play-flash="play"]')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(document.querySelector('[data-reel-play-flash]')).toBeNull();
  });

  it('tries the API media path before the CDN url, then the CDN url after an error', () => {
    render(<ReelPlayer {...playerProps(true)} />);
    const video = screen.getByTestId('reel-video') as HTMLVideoElement;
    expect(video.getAttribute('src')).toBe('http://localhost:3001/media/reels/a.mp4');
    fireEvent.error(video);
    expect(screen.getByTestId('reel-video').getAttribute('src')).toBe(
      'https://cdn.example.test/media/reels/a.mp4',
    );
    expect(screen.queryByText(/Couldn't load this reel/)).toBeNull();
    fireEvent.error(screen.getByTestId('reel-video'));
    expect(screen.getByText(/Couldn't load this reel/)).toBeTruthy();
  });
});
