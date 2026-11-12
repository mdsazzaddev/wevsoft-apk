const LINK_ID = 'wev-story-studio-fonts';

/** Extra display fonts used by studio text layers. Inter ships with the app; the rest load on demand. */
export function ensureStudioFonts(): void {
  if (typeof document === 'undefined' || document.getElementById(LINK_ID)) return;
  const link = document.createElement('link');
  link.id = LINK_ID;
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Poppins:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Space+Grotesk:wght@400;700&display=swap';
  document.head.appendChild(link);
}
