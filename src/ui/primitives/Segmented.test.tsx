// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Segmented } from './Segmented';

const WOODS = [
  { value: 'none', label: 'None' },
  { value: '4x4', label: '4×4' },
  { value: '6x6', label: '6×6' },
] as const;

function Harness() {
  const [v, setV] = useState<'none' | '4x4' | '6x6'>('none');
  return <Segmented options={WOODS} value={v} onChange={setV} aria-label="Header wood" />;
}

describe('Segmented', () => {
  it('is a radiogroup with exactly one checked segment', () => {
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: 'Header wood' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(radios.filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1);
  });

  it('click commits immediately', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('radio', { name: '6×6' }));
    expect(screen.getByRole('radio', { name: '6×6' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'None' })).toHaveAttribute('aria-checked', 'false');
  });

  it('roving tabindex: one tab stop on the selected segment, arrows move the selection', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Harness />
        <button>after</button>
      </>,
    );
    // Tab enters the group on the SELECTED segment…
    await user.tab();
    expect(screen.getByRole('radio', { name: 'None' })).toHaveFocus();
    // …arrows move + commit. Radix focuses the next item in a macrotask while
    // the arrow key is still down (a real press), so hold the key across it —
    // a plain {ArrowRight} fires keyup before the deferred focus and the
    // selection-follows-focus click never happens in jsdom.
    await user.keyboard('{ArrowRight>}');
    await new Promise((r) => setTimeout(r, 0));
    await user.keyboard('{/ArrowRight}');
    expect(screen.getByRole('radio', { name: '4×4' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '4×4' })).toHaveFocus();
    // …and the next Tab LEAVES the group (one stop, not three).
    await user.tab();
    expect(screen.getByRole('button', { name: 'after' })).toHaveFocus();
  });
});
