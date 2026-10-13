// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SettingsRow } from './SettingsRows';

// SettingsRow href: a page on this origin (like /welcome.html, its own HTML entry rather than a
// router route) must open in the SAME window, or an installed app is thrown out to the system
// browser and "Open FieldShore" starts a second instance. Only links that leave the app get a tab.

const link = (href: string) => {
  render(<SettingsRow label="Guide" href={href} trailing="external" />);
  return screen.getByRole('link', { name: 'Guide' });
};

describe('SettingsRow href', () => {
  it.each(['https://www.fema.gov/guide', 'http://example.com/guide.pdf'])(
    'opens the absolute URL %s in a new tab, detached from the app',
    (href) => {
      const a = link(href);
      expect(a).toHaveAttribute('href', href);
      expect(a).toHaveAttribute('target', '_blank');
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    },
  );

  it.each(['/welcome.html', '/'])('opens the same-origin page %s in this window', (href) => {
    const a = link(href);
    expect(a).toHaveAttribute('href', href);
    expect(a).not.toHaveAttribute('target');
    expect(a).not.toHaveAttribute('rel');
  });

  // These start with "/" but name another host (protocol-relative; browsers read "/\" the same
  // way), so they must still leave the app in a new tab.
  it.each(['//example.com/guide.pdf', '/\\example.com/guide.pdf'])(
    'treats %s as external even though it starts with a slash',
    (href) => {
      const a = link(href);
      expect(a).toHaveAttribute('target', '_blank');
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    },
  );
});
