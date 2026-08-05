// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { VisualGridPicker } from './VisualGridPicker';

const PLATES = [
  { id: 'none', name: 'None', sub: 'no deduction' },
  { id: 'rigid6', name: 'Rigid Base 6"', sub: 'deducts 1"' },
  { id: 'swivel6', name: 'Swivel Base 6"', sub: 'deducts 1.8"' },
] as const;

function Harness({ availableIds }: { availableIds?: ReadonlySet<string> }) {
  const [v, setV] = useState('none');
  return (
    <VisualGridPicker
      label="Top plate"
      options={PLATES}
      value={v}
      onSelect={setV}
      availableIds={availableIds}
    />
  );
}

const grid = () => document.body.querySelector('.fs-plate-grid') as HTMLElement;
const trigger = () => screen.getByRole('button', { name: /top plate/i });

describe('VisualGridPicker — the L-9 contract', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('grid is portaled to document.body and STAYS MOUNTED when closed (visibility toggle, never unmount)', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    // Closed at rest — but present in the DOM, directly under <body>.
    expect(grid()).not.toBeNull();
    expect(grid().parentElement).toBe(document.body);
    expect(grid().classList.contains('open')).toBe(false);

    await user.click(trigger());
    expect(grid().classList.contains('open')).toBe(true);

    await user.keyboard('{Escape}');
    // Still mounted, still under body — only the class flipped.
    expect(grid()).not.toBeNull();
    expect(grid().classList.contains('open')).toBe(false);
    expect(grid().parentElement).toBe(document.body);
  });

  it('open marks the selection and scrolls it into view (~50ms settle)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(trigger());
    const selected = grid().querySelector('.fs-plate-option.selected');
    expect(selected).not.toBeNull();
    expect(selected!.textContent).toContain('None');
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
  });

  it('tapping an option commits immediately and closes', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(trigger());
    await user.click(screen.getByRole('option', { name: /rigid base 6/i }));
    expect(grid().classList.contains('open')).toBe(false);
    expect(trigger().textContent).toContain('Rigid Base 6"');
  });

  it('scrim click and outside click both close', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(trigger());
    expect(grid().classList.contains('open')).toBe(true);
    await user.click(document.body.querySelector('.fs-plate-scrim') as HTMLElement);
    expect(grid().classList.contains('open')).toBe(false);

    await user.click(trigger());
    expect(grid().classList.contains('open')).toBe(true);
    await user.click(document.body); // outside both grid and trigger
    expect(grid().classList.contains('open')).toBe(false);
  });

  it('ops filtering: sections render, out-of-stock rows lock, "none" is always available', async () => {
    const user = userEvent.setup();
    render(<Harness availableIds={new Set(['rigid6'])} />);
    await user.click(trigger());

    expect(grid().querySelector('.fs-plate-section--available')!.textContent).toBe('Available');
    expect(grid().querySelector('.fs-plate-section--unavailable')!.textContent).toBe(
      'Not in inventory',
    );

    const swivel = screen.getByRole('option', { name: /swivel base 6/i });
    expect(swivel).toHaveClass('fs-plate-option--unavailable');
    expect(screen.getByRole('option', { name: /^none/i })).not.toHaveClass(
      'fs-plate-option--unavailable',
    );
    expect(screen.getByRole('option', { name: /rigid base 6/i })).not.toHaveClass(
      'fs-plate-option--unavailable',
    );
  });

  // #461 — the native-controls fallback (OS <select>) must keep unavailable
  // options SELECTABLE (81f79c0 intentionally dropped `disabled`, the off-book
  // deploy path) but still carry a non-blocking stock signal, mirroring the
  // sighted grid's "Not in inventory" demotion — otherwise an AT user picks
  // blind to stock.
  describe('native-controls fallback (accessibility.md)', () => {
    afterEach(() => localStorage.removeItem('fieldshore_native_controls'));

    it('marks unavailable options in their label text, without disabling them', async () => {
      localStorage.setItem('fieldshore_native_controls', 'true');
      render(<Harness availableIds={new Set(['rigid6'])} />);

      const select = screen.getByLabelText('Top plate') as HTMLSelectElement;
      const swivel = Array.from(select.options).find((o) => o.value === 'swivel6')!;
      const rigid = Array.from(select.options).find((o) => o.value === 'rigid6')!;

      expect(swivel.textContent).toBe('Swivel Base 6" — not in inventory');
      expect(swivel.disabled).toBe(false); // still pickable — the off-book path
      expect(rigid.textContent).toBe('Rigid Base 6"'); // in stock — no marker
    });
  });
});
