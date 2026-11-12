import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ReelVolumeSlider from './ReelVolumeSlider';

afterEach(() => cleanup());

describe('ReelVolumeSlider', () => {
  it('renders the mute icon without a pill background and keeps the track collapsed', () => {
    render(
      <ReelVolumeSlider
        volume={0.4}
        muted={false}
        onChange={() => {}}
        onToggleMute={() => {}}
      />,
    );
    const root = document.querySelector('[data-reel-volume]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.className).not.toMatch(/bg-black/);
    expect(root.className).not.toMatch(/rounded-full/);
    const mute = screen.getByRole('button', { name: 'Mute' });
    expect(mute).toBeTruthy();
    expect(mute.className).toMatch(/bg-transparent/);
    expect(mute.className).not.toMatch(/bg-black/);
    expect(screen.queryByRole('slider', { name: 'Volume' })).toBeNull();
  });

  it('reveals the level track on mouse hover and hides it on leave', () => {
    render(
      <ReelVolumeSlider
        volume={0.4}
        muted={false}
        onChange={() => {}}
        onToggleMute={() => {}}
      />,
    );
    const root = document.querySelector('[data-reel-volume]') as HTMLElement;
    fireEvent.pointerEnter(root, { pointerType: 'mouse' });
    expect(screen.getByRole('slider', { name: 'Volume' })).toBeTruthy();
    fireEvent.pointerLeave(root, { pointerType: 'mouse' });
    expect(screen.queryByRole('slider', { name: 'Volume' })).toBeNull();
  });

  it('toggles mute from the always-visible icon', () => {
    const onToggleMute = vi.fn();
    render(
      <ReelVolumeSlider
        volume={0.8}
        muted={false}
        onChange={() => {}}
        onToggleMute={onToggleMute}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
    expect(onToggleMute).toHaveBeenCalledOnce();
  });
});
