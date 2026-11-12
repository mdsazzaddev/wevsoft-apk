import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const { state, toast, ident, qrMock } = vi.hoisted(() => ({
  state: { token: 'tok', user: { id: 'me', name: 'Me Person' } } as any,
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  ident: { current: { isSpaceMode: false, active: null } as any },
  qrMock: { toDataURL: vi.fn() },
}));
vi.mock('../../store', () => ({ useStore: (sel: any) => sel(state) }));
vi.mock('../../hooks/useOverlayBack', () => ({ useOverlayBack: () => {} }));
vi.mock('../../lib/useSpaceIdentities', () => ({ useSpaceIdentities: () => ident.current }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../UserAvatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('qrcode', () => ({ default: qrMock }));

import ShareModal from '../ShareModal';

const fetchMock = vi.fn();
const openMock = vi.fn();
beforeEach(() => {
  (globalThis as any).fetch = fetchMock;
  fetchMock.mockReset();
  openMock.mockReset().mockReturnValue({});
  window.open = openMock as any;
  toast.mockReset(); toast.success.mockReset(); toast.error.mockReset();
  qrMock.toDataURL.mockReset().mockResolvedValue('data:image/png;base64,QR');
  ident.current = { isSpaceMode: false, active: null };
  delete (navigator as any).share;
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  (window as any).matchMedia = (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
});
afterEach(() => cleanup());

function setup(props: Partial<React.ComponentProps<typeof ShareModal>> = {}) {
  const onClose = vi.fn();
  const onSharedToFeed = vi.fn();
  render(<ShareModal isOpen onClose={onClose} onSharedToFeed={onSharedToFeed} url="/posts/p1" title="Hello world" targetType="link" {...props} />);
  return { onClose, onSharedToFeed };
}
const full = `${window.location.origin}/posts/p1`;

describe('ShareModal (premium share dialog)', () => {
  it('renders an accessible dialog titled Share and closes with Escape and Done', () => {
    const { onClose } = setup();
    const dialog = screen.getByRole('dialog', { name: 'Share' });
    expect(dialog).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes on backdrop mousedown but not inside the panel', () => {
    const { onClose } = setup();
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab focus inside the dialog', () => {
    setup();
    const dialog = screen.getByRole('dialog', { name: 'Share' });
    const nodes = dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), textarea');
    const first = nodes[0]; const last = nodes[nodes.length - 1];
    last.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('has no Repost and no send-to-friends section', () => {
    setup({ allowRepost: true });
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/repost/i);
    expect(text).not.toMatch(/send (directly )?to friends/i);
    expect(screen.queryByTestId('avatar')).toBeNull();
  });

  it('shows the core destinations once each', () => {
    setup();
    for (const name of ['Copy link', 'Facebook', 'WhatsApp', 'Telegram', 'X', 'Email', 'QR code', 'More apps']) {
      expect(screen.getAllByRole('listitem', { name })).toHaveLength(1);
    }
    expect(screen.queryByRole('listitem', { name: /bluetooth|nearby/i })).toBeNull();
    // Native share is hidden when the browser has no Web Share API.
    expect(screen.queryByText('Share via device')).toBeNull();
  });

  it('copy link writes the canonical URL and confirms; failure shows an error', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    setup();
    fireEvent.click(within(screen.getByRole('listitem', { name: 'Copy link' })).getByRole('button'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Link copied'));
    expect(writeText).toHaveBeenCalledWith(full);
    expect(screen.getByRole('listitem', { name: 'Copied' })).toBeTruthy();

    writeText.mockRejectedValue(new Error('denied'));
    (document as any).execCommand = vi.fn().mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it('opens social destinations with encoded URLs', () => {
    setup();
    fireEvent.click(within(screen.getByRole('listitem', { name: 'Facebook' })).getByRole('button'));
    expect(openMock).toHaveBeenCalledWith(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(full)}`, '_blank', expect.any(String));
    fireEvent.click(within(screen.getByRole('listitem', { name: 'X' })).getByRole('button'));
    expect(openMock.mock.calls[1][0]).toBe(`https://x.com/intent/post?url=${encodeURIComponent(full)}&text=${encodeURIComponent('Hello world')}`);
  });

  it('QR code view generates a code locally and can go back', async () => {
    setup();
    fireEvent.click(within(screen.getByRole('listitem', { name: 'QR code' })).getByRole('button'));
    expect(screen.getByRole('dialog', { name: 'QR code' })).toBeTruthy();
    const img = await screen.findByRole('img', { name: /QR code for/ });
    expect(img.getAttribute('src')).toBe('data:image/png;base64,QR');
    expect(qrMock.toDataURL).toHaveBeenCalledWith(full, expect.any(Object));
    expect((screen.getByRole('button', { name: /Download QR/ }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Back to share options' }));
    expect(screen.getByRole('dialog', { name: 'Share' })).toBeTruthy();
  });

  it('More apps panel lists grouped destinations and filters by search', () => {
    setup();
    fireEvent.click(within(screen.getByRole('listitem', { name: 'More apps' })).getByRole('button'));
    expect(screen.getByRole('dialog', { name: 'More apps' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Social' })).toBeTruthy();
    const search = screen.getByRole('searchbox', { name: 'Search share destinations' });
    fireEvent.change(search, { target: { value: 'linked' } });
    expect(screen.getByText('LinkedIn')).toBeTruthy();
    expect(screen.queryByText('Reddit')).toBeNull();
    fireEvent.change(search, { target: { value: 'zzzz' } });
    expect(screen.getByText(/No app matches/)).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Share' })).toBeTruthy();
  });

  it('shows native device share only when the Web Share API exists', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    (navigator as any).share = share;
    const { onClose } = setup();
    fireEvent.click(within(screen.getByRole('listitem', { name: 'More apps' })).getByRole('button'));
    fireEvent.click(screen.getByText('Share via device'));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: 'Hello world', text: 'Hello world', url: full }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('without a post target it shows a link preview and no feed publishing controls', () => {
    setup();
    expect(screen.getByRole('region', { name: 'What you are sharing' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Share now/ })).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'Caption' })).toBeNull();
  });

  it('personal mode: picks an audience and shares to feed with a caption', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const { onClose, onSharedToFeed } = setup({ targetType: 'post', targetId: 'p1' });
    expect(screen.getByText('Me Person')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Audience: Friends' }));
    fireEvent.click(screen.getByRole('option', { name: /Public/ }));
    expect(screen.getByRole('button', { name: 'Audience: Public' })).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Caption' }), { target: { value: '  look at this  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Share now/ }));
    await waitFor(() => expect(onSharedToFeed).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/posts/p1/share');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({ shareType: 'feed', caption: 'look at this', privacy: 'public' });
    expect(toast.success).toHaveBeenCalledWith('Shared to your feed');
    expect(onClose).toHaveBeenCalled();
  });

  it('reels share to the reel endpoint and server errors are shown', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'Not allowed' }) });
    const { onClose } = setup({ targetType: 'reel', targetId: 'r9' });
    fireEvent.click(screen.getByRole('button', { name: /Share now/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Not allowed'));
    expect(fetchMock.mock.calls[0][0]).toBe('/api/reels/r9/share');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('space mode: publishes as the Space and is always Public', async () => {
    ident.current = { isSpaceMode: true, active: { kind: 'space', id: 's1', name: 'Dhaka Travel' } };
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    setup({ targetType: 'post', targetId: 'p1' });
    expect(screen.getByText('Dhaka Travel')).toBeTruthy();
    expect(screen.getByLabelText(/Audience: Public/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Audience:/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Share now/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ shareType: 'feed', caption: null, privacy: 'public', spaceId: 's1' });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Shared to Dhaka Travel'));
  });
});
