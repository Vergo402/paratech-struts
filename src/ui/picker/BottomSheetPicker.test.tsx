// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { BottomSheetPicker } from './BottomSheetPicker';

const LEVELS = [
  { value: 'i', label: 'Level I' },
  { value: 'ii', label: 'Level II' },
  { value: 'iii', label: 'Level III' },
  { value: 'iv', label: 'Level IV' },
  { value: 'v', label: 'Level V' },
] as const;

function Harness() {
  const [v, setV] = useState<'i' | 'ii' | 'iii' | 'iv' | 'v'>('iv');
  return <BottomSheetPicker label="Incident level" options={LEVELS} value={v} onSelect={setV} />;
}

describe('BottomSheetPicker', () => {
  it('collapsed trigger always shows the current value', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /incident level/i }).textContent).toContain(
      'Level IV',
    );
  });

  it('a row tap commits immediately and dismisses the sheet — no Apply', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /incident level/i }));

    const sheet = await screen.findByRole('dialog', { name: 'Incident level' });
    expect(sheet).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'Level II' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: /incident level/i }).textContent).toContain(
      'Level II',
    );
  });
});
