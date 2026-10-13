// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@core/version', () => ({ APP_VERSION: 'v4.0.0-slice.1' }));

import { AboutPage } from './AboutPage';
import { SETTINGS_PAGES } from '../../shell/settingsPages';

const getRegistration = vi.fn();
const realSW = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');

beforeEach(() => {
  getRegistration.mockReset();
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration, addEventListener: vi.fn(), removeEventListener: vi.fn() },
  });
});
afterEach(() => {
  if (realSW) Object.defineProperty(navigator, 'serviceWorker', realSW);
});

describe('AboutPage (50-settings §6)', () => {
  it('shows the app name and version', () => {
    render(<AboutPage />);
    expect(screen.getByText('FieldShore')).toBeInTheDocument();
    expect(screen.getByText('Version 4.0.0-slice.1')).toBeInTheDocument();
  });

  it('the check button drives the service-worker registration update', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    getRegistration.mockResolvedValue({ update, installing: null, waiting: null });
    const user = userEvent.setup();
    render(<AboutPage />);
    await user.click(screen.getByRole('button', { name: /Check for updates/ }));
    expect(getRegistration).toHaveBeenCalled();
    expect(await screen.findByText("You're up to date")).toBeInTheDocument();
    expect(update).toHaveBeenCalled();
  });

  it('has a way back to the public welcome page, opened in this window so an installed app stays in its shell', () => {
    render(<AboutPage />);
    const group = within(screen.getByRole('region', { name: 'Welcome page' }));
    const link = group.getByRole('link', { name: /See what FieldShore does/ });
    expect(link).toHaveAttribute('href', '/welcome.html');
    expect(link).not.toHaveAttribute('target');
  });

  it('the nav entry shows for everyone', () => {
    const page = SETTINGS_PAGES.find((p) => p.to === '/settings/about')!;
    expect(page.show({ perms: {} as never, canIncident: false })).toBe(true);
  });
});
