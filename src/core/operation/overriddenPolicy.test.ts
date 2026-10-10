import { describe, it, expect } from 'vitest';
import { isTellWorthy } from './overriddenPolicy';
import type { FieldShoreEvent } from '../schema';

const base = { id: 'x', opId: 'op', at: 1, by: 'dev' } as const;

describe('isTellWorthy — which lost own events are worth the "had no effect" tell (ADR-041)', () => {
  it('intent-carrying events are tell-worthy', () => {
    const e: FieldShoreEvent = { type: 'ShorePointStatusChanged', ...base, spId: 'sp', from: 'process', to: 'strutset' };
    expect(isTellWorthy(e)).toBe(true);
    expect(isTellWorthy({ type: 'CommandTransferCancelled', ...base })).toBe(true);
    expect(isTellWorthy({ type: 'EquipmentReturned', ...base, spId: 'sp' })).toBe(true);
  });
  it('idempotent bookkeeping is not', () => {
    expect(isTellWorthy({ type: 'DivisionAdded', ...base, division: 2 })).toBe(false);
    expect(isTellWorthy({ type: 'SawAdded', ...base, sawId: 'B' })).toBe(false);
    expect(isTellWorthy({ type: 'ChecklistItemChecked', ...base, checklistId: 'c', instanceId: 'i', itemId: 'k', role: 'safety' } as FieldShoreEvent)).toBe(false);
  });
  it('a ShorePointEdited is tell-worthy only when it carries a sizing field', () => {
    expect(isTellWorthy({ type: 'ShorePointEdited', ...base, spId: 'sp', patch: { w3w: 'a.b.c' } } as FieldShoreEvent)).toBe(false);
    expect(isTellWorthy({ type: 'ShorePointEdited', ...base, spId: 'sp', patch: { measurementEighths: 600 } } as FieldShoreEvent)).toBe(true);
  });
});
