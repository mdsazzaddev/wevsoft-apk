import React from 'react';

type P = { className?: string };

export function GoogleIcon({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function FacebookIcon({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="22" fill="#1877F2" />
      <path fill="#fff" d="M30.2 30.4l.9-6H25.4v-3.9c0-1.6.8-3.2 3.4-3.2h2.6v-5.1s-2.4-.4-4.6-.4c-4.7 0-7.8 2.8-7.8 8v4.6h-5.2v6h5.2V44.6a20.6 20.6 0 0 0 6.4 0V30.4z" />
    </svg>
  );
}

export function YouTubeIcon({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FF0000" d="M44.5 14.2c-.5-1.9-2-3.4-3.9-3.9C37.1 9.4 24 9.4 24 9.4s-13.1 0-16.6.9c-1.9.5-3.4 2-3.9 3.9-.9 3.5-.9 9.8-.9 9.8s0 6.3.9 9.8c.5 1.9 2 3.4 3.9 3.9 3.5.9 16.6.9 16.6.9s13.1 0 16.6-.9c1.9-.5 3.4-2 3.9-3.9.9-3.5.9-9.8.9-9.8s0-6.3-.9-9.8z" />
      <path fill="#fff" d="M19.8 30.3 30.7 24l-10.9-6.3z" />
    </svg>
  );
}

/** WevChat: two-bubble chat mark (green), as in the console reference. */
export function WevChatIcon({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#1f2937" d="M18.5 8C9.9 8 3 13.8 3 21c0 4 2.1 7.6 5.5 10l-1.4 4.3 5-2.6c1.9.6 4.1.9 6.4.9h.9c-.4-1.2-.6-2.5-.6-3.8 0-7.4 7-13.3 15.7-13.3h.9C34.1 11.4 27 8 18.5 8z" />
      <circle cx="13" cy="18" r="2" fill="#fff" />
      <circle cx="23.5" cy="18" r="2" fill="#fff" />
      <path fill="#22c55e" d="M45 29.6c0-6-6-10.9-13.3-10.9S18.4 23.6 18.4 29.6s6 10.9 13.3 10.9c1.7 0 3.3-.3 4.8-.7l4.2 2.2-1.1-3.6c3.3-2 5.4-5 5.4-7.8z" />
      <circle cx="27" cy="27.6" r="1.7" fill="#fff" />
      <circle cx="36.4" cy="27.6" r="1.7" fill="#fff" />
    </svg>
  );
}

export const PLATFORM_BRANDS: Record<string, { name: string; Icon: React.ComponentType<P> }> = {
  google: { name: 'Google', Icon: GoogleIcon },
  facebook: { name: 'Facebook', Icon: FacebookIcon },
  youtube: { name: 'YouTube', Icon: YouTubeIcon },
  wevchat: { name: 'WevChat', Icon: WevChatIcon },
};
