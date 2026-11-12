import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WevSpaceIcon } from './WevSpaceIcon';

describe('WevSpaceIcon', () => {
  it('renders standard 24x24 viewBox without legacy 480x280 coordinates', () => {
    const markup = renderToStaticMarkup(React.createElement(WevSpaceIcon));
    expect(markup).toContain('viewBox="0 0 24 24"');
    expect(markup).not.toContain('480 280');
    expect(markup).not.toContain('wev-space-face');
  });

  it('respects size, className, and custom color', () => {
    const markup = renderToStaticMarkup(
      React.createElement(WevSpaceIcon, {
        size: 17,
        className: 'text-primary',
        color: '#38bdf8',
      })
    );
    expect(markup).toContain('width="17"');
    expect(markup).toContain('height="17"');
    expect(markup).toContain('class="wev-icon text-primary"');
    expect(markup).toContain('stroke="#38bdf8"');
  });

  it('renders Lucide-compliant stroke attributes and core geometry', () => {
    const markup = renderToStaticMarkup(React.createElement(WevSpaceIcon));
    expect(markup).toContain('stroke="currentColor"');
    expect(markup).toContain('stroke-width="2"');
    expect(markup).toContain('d="M23 12A11 3 0 0 1 1 12"');
    expect(markup).toContain('r="7.5"');
    expect(markup).toContain('aria-hidden="true"');
  });
});
