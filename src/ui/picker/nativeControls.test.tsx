// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { setNativeControls } from '@ui/primitives';
import { InlineSegmented } from './InlineSegmented';
import { BottomSheetPicker } from './BottomSheetPicker';
import { VisualGridPicker } from './VisualGridPicker';

const LEVELS = [
  { value: 'i', label: 'Level I' },
  { value: 'ii', label: 'Level II' },
] as const;

beforeEach(() => setNativeControls(false));

describe('Native-controls picker fallback (Power Select)', () => {
  it('InlineSegmented falls back to a native <select> when on, custom otherwise', () => {
    const { rerender } = render(
      <InlineSegmented label="Level" options={LEVELS} value="i" onChange={() => {}} />,
    );
    // Off: the custom Segmented radiogroup, no native combobox.
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('radiogroup')).toBeTruthy();

    setNativeControls(true);
    rerender(<InlineSegmented label="Level" options={LEVELS} value="i" onChange={() => {}} />);
    const select = screen.getByRole('combobox', { name: /level/i }) as HTMLSelectElement;
    expect(select.value).toBe('i');
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('BottomSheetPicker falls back to a native <select> carrying every option', () => {
    setNativeControls(true);
    render(<BottomSheetPicker label="Level" options={LEVELS} value="ii" onSelect={() => {}} />);
    const select = screen.getByRole('combobox', { name: /level/i }) as HTMLSelectElement;
    expect(select.value).toBe('ii');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Level I', 'Level II']);
  });

  it('VisualGridPicker fallback keeps out-of-stock rows selectable (off-book deploy path)', () => {
    // 81f79c0 lifted the v3 #121 hard-disable: not-in-stock plates resolve at
    // deploy (ADR-033 quick-add / off-book / drop-plate), so the fallback must
    // not lock them out either.
    const PLATES = [
      { id: 'a', name: 'Acme Base' },
      { id: 'b', name: 'Steel Base' },
    ];
    const onSelect = vi.fn();
    setNativeControls(true);
    render(
      <VisualGridPicker
        label="Base plate"
        options={PLATES}
        value="a"
        onSelect={onSelect}
        availableIds={new Set(['a'])}
      />,
    );
    const opts = screen.getAllByRole('option') as HTMLOptionElement[];
    expect(opts.every((o) => !o.disabled)).toBe(true);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('is reactive: flipping the toggle swaps the surface live', () => {
    function Harness() {
      const [v, setV] = useState<'i' | 'ii'>('i');
      return <InlineSegmented label="Level" options={LEVELS} value={v} onChange={setV} />;
    }
    render(<Harness />);
    expect(screen.queryByRole('combobox')).toBeNull();
    act(() => setNativeControls(true));
    expect(screen.getByRole('combobox', { name: /level/i })).toBeTruthy();
  });
});
