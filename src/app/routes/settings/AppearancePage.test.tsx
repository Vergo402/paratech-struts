// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseTheme = vi.fn();
vi.mock('../../theme', () => ({ useTheme: () => mockUseTheme() }));

import { AppearancePage } from './AppearancePage';

beforeEach(() => {
  mockUseTheme.mockReturnValue({ preference: 'system', setPreference: vi.fn() });
});

describe('AppearancePage theme picker (audit W8)', () => {
  it('highlights the active theme', () => {
    mockUseTheme.mockReturnValue({ preference: 'sunlight', setPreference: vi.fn() });
    render(<AppearancePage />);
    expect(screen.getByRole('radio', { name: 'Sunlight' })).toBeChecked();
  });

  it('shows NO pill selected when Broadcast is active — not a misleading Dark', () => {
    mockUseTheme.mockReturnValue({ preference: 'broadcast', setPreference: vi.fn() });
    render(<AppearancePage />);
    for (const name of ['System', 'Light', 'Dark', 'Sunlight']) {
      expect(screen.getByRole('radio', { name })).not.toBeChecked();
    }
  });
});
