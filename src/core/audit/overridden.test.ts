import { describe, it, expect } from 'vitest';
import { NO_DEDUCTIONS, type FieldShoreEvent, type ShorePoint } from '@core/schema';
import { seedOrgState } from '@core/org';
import { describeOverridden } from './overridden';

const sp: ShorePoint = {
  id: 'sp1', opId: 'op1', label: 'Alpha', division: '1', shoreType: 't-shore', measurementEighths: 320,
  deductions: NO_DEDUCTIONS, status: 'pending',
};
const positions = seedOrgState('op1', 'dev-A').positions;
const e = (x: object) => ({ opId: 'op1', ...x }) as unknown as FieldShoreEvent;

describe('describeOverridden (#499)', () => {
  it('a lost status change reads "<point> — now <state>" with the peer line and the winner time', () => {
    const lost = e({ type: 'ShorePointStatusChanged', id: 'l1', at: 100, by: 'A', spId: 'sp1', from: 'process', to: 'strutset' });
    const win = e({ type: 'EquipmentReturned', id: 'w1', at: 200, by: 'B', spId: 'sp1' });
    const [row] = describeOverridden([lost], {
      shorePoints: [sp], positions, events: [lost, win],
      outcomes: new Map([['l1', 'no-effect'], ['w1', 'applied']]),
    });
    expect(row).toMatchObject({
      title: 'Alpha — now Pending Equipment',
      line: 'Your Strut Set had no effect. Another device returned equipment to inventory while you were offline.',
      at: 200,
      who: 'another device',
    });
  });

  it('omits the peer line when no winner is found, and falls back to the lost change', () => {
    const lost = e({ type: 'EquipmentDeployed', id: 'l1', at: 100, by: 'A', spId: 'sp1' });
    const [row] = describeOverridden([lost], { shorePoints: [sp], positions, events: [lost], outcomes: new Map([['l1', 'no-effect']]) });
    expect(row).toMatchObject({ line: 'Your deploy had no effect.', at: 100, who: 'this device' });
  });

  it('transfer rows name the Incident Commander of record', () => {
    const lost = e({ type: 'CommandTransferCancelled', id: 'l1', at: 100, by: 'A' });
    const [row] = describeOverridden([lost], { shorePoints: [], positions, events: [lost], outcomes: new Map([['l1', 'no-effect']]) });
    expect(row!.title).toMatch(/^Incident Commander — /);
    expect(row!.line).toBe('Your cancel had no effect.');
  });

  it('other types get the generic line; newest first', () => {
    const a = e({ type: 'PositionRenamed', id: 'a', at: 1, by: 'A', positionId: 'p', title: 'Ops' });
    const b = e({ type: 'PositionRenamed', id: 'b', at: 2, by: 'A', positionId: 'p', title: 'Ops 2' });
    const rows = describeOverridden([a, b], { shorePoints: [], positions, events: [a, b], outcomes: new Map() });
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
    expect(rows[0]!.line).toBe('Your change had no effect.');
  });
});
