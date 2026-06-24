// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
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
    await user.click(screen.getByRole('button', { name: 'Check for updates' }));
    expect(getRegistration).toHaveBeenCalled();
    expect(await screen.findByText("You're up to date")).toBeInTheDocument();
    expect(update).toHaveBeenCalled();
  });

  it('the nav entry shows for everyone', () => {
    const page = SETTINGS_PAGES.find((p) => p.to === '/settings/about')!;
    expect(page.show({ perms: {} as never, canIncident: false })).toBe(true);
  });
});
