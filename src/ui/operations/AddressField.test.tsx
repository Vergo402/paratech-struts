// @vitest-environment jsdom
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AddressField } from './AddressField';
import type { AddressPick, AddressSuggestion } from '@ui/hooks';

const enabled = vi.fn(() => true);
const suggest = vi.fn<(q: string) => Promise<AddressSuggestion[]>>();
vi.mock('@ui/hooks', () => ({
  placesEnabled: () => enabled(),
  beginAddressSession: async () => ({ suggest: (q: string) => suggest(q) }),
}));

const PICK: AddressPick = { address: '123 Cascade Avenue, Seattle, WA, USA', coords: { lat: 47.6, lng: -122.3 } };
function suggestion(main: string, resolveTo: AddressPick = PICK): AddressSuggestion {
  return {
    main,
    // "123 Cascade Av" of "123 Cascade Avenue" — the typed portion renders bold
    mainMatches: [{ start: 0, end: 14 }],
    secondary: 'Seattle, WA, USA',
    resolve: () => Promise.resolve(resolveTo),
  };
}

// Stateful wrapper mirroring StartOperationModal: onChange clears coords, onPick sets them.
function Field({ onPick = () => {} }: { onPick?: (p: AddressPick) => void }) {
  const [value, setValue] = useState('');
  return (
    <AddressField label="Location / address" value={value} onChange={setValue} onPick={onPick} />
  );
}

describe('AddressField', () => {
  beforeEach(() => {
    enabled.mockReturnValue(true);
    suggest.mockReset();
  });

  it('degrades to a plain text box when autocomplete is disabled (no key)', async () => {
    enabled.mockReturnValue(false);
    const user = userEvent.setup();
    render(<Field />);
    await user.type(screen.getByLabelText('Location / address'), '123 Cascade');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(suggest).not.toHaveBeenCalled();
  });

  it('shows suggestions after typing and does not query below the min length', async () => {
    suggest.mockResolvedValue([suggestion('123 Cascade Avenue')]);
    const user = userEvent.setup();
    render(<Field />);
    const input = screen.getByLabelText('Location / address');
    await user.type(input, '12'); // below MIN_CHARS
    expect(suggest).not.toHaveBeenCalled();
    await user.type(input, '3 Cascade');
    const listbox = await screen.findByRole('listbox');
    expect(listbox).toBeInTheDocument();
    // two-line row: emphasized match + secondary locality (mockup fidelity)
    const main = listbox.querySelector('.fs-addr-opt-main');
    expect(main?.textContent).toBe('123 Cascade Avenue');
    expect(main?.querySelector('b')?.textContent).toBe('123 Cascade Av');
    expect(screen.getByText('Seattle, WA, USA')).toBeInTheDocument();
  });

  it('clicking a suggestion resolves the address + coordinates', async () => {
    suggest.mockResolvedValue([suggestion('123 Cascade Avenue')]);
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<Field onPick={onPick} />);
    await user.type(screen.getByLabelText('Location / address'), '123 Cascade');
    const [opt] = await screen.findAllByRole('option');
    await user.click(opt!);
    await waitFor(() => expect(onPick).toHaveBeenCalledWith(PICK));
    // the picked address is written back into the field
    expect(screen.getByLabelText('Location / address')).toHaveValue(PICK.address);
  });

  it('keyboard: ArrowDown then Enter selects the active suggestion', async () => {
    suggest.mockResolvedValue([suggestion('123 Cascade Avenue'), suggestion('456 Cascade Ave')]);
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<Field onPick={onPick} />);
    await user.type(screen.getByLabelText('Location / address'), '123 Cascade');
    await screen.findByRole('listbox');
    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(onPick).toHaveBeenCalledWith(PICK));
  });

  it('swallows a lookup failure and keeps typing working (offline / API error)', async () => {
    suggest.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    render(<Field />);
    await user.type(screen.getByLabelText('Location / address'), '123 Cascade');
    await waitFor(() => expect(suggest).toHaveBeenCalled());
    expect(screen.queryByRole('listbox')).toBeNull(); // no crash, no dropdown
  });
});
