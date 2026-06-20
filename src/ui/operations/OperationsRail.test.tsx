// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { OperationsRail } from './OperationsRail';
import { buildRailTree } from './railTree';
import type { ShorePoint } from '@core/schema';

function sp(over: Partial<ShorePoint> & { id: string }): ShorePoint {
  return {
    opId: 'op-1',
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 480,
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
    status: 'pending',
    ...over,
  };
}

const POINTS = [
  sp({ id: 'a', division: '2', area: 'A' }),
  sp({ id: 'b', division: '2', area: 'B' }),
  sp({ id: 'c', division: '1' }),
];

function renderRail(over: Partial<Parameters<typeof OperationsRail>[0]> = {}) {
  const onSelect = vi.fn();
  render(
    <OperationsRail
      tree={buildRailTree(POINTS)}
      filterBuilding={null}
      filterDivision={null}
      filterArea={null}
      onSelect={onSelect}
      {...over}
    />,
  );
  return { onSelect };
}

describe('OperationsRail', () => {
  it('selecting a division applies its exact path', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderRail();
    await user.click(screen.getByRole('button', { name: /^Div 2/ }));
    expect(onSelect).toHaveBeenCalledWith({ building: null, division: '2', area: null });
  });

  it('the root "All" clears every filter', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderRail({ filterDivision: '2' });
    await user.click(screen.getByRole('button', { name: /All shore points/ }));
    expect(onSelect).toHaveBeenCalledWith({ building: null, division: null, area: null });
  });

  it('marks the active node from the current filter props', () => {
    renderRail({ filterDivision: '2' });
    const active = screen.getByRole('button', { name: /^Div 2/ });
    expect(active).toHaveAttribute('aria-current', 'true');
    expect(active.className).toContain('is-active');
  });

  it('expanding a division reveals its areas, and an area applies division + area', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderRail();
    await user.click(screen.getByRole('button', { name: /Expand Div 2/ }));
    await user.click(screen.getByRole('button', { name: /^A\b/ }));
    expect(onSelect).toHaveBeenCalledWith({ building: null, division: '2', area: 'A' });
  });
});
