import { describe, it, expect } from 'vitest';
import { assembleBom, bomModelLabel, bomSourceStatus, deployedRigs, hasUntracked } from './bom';
import type { StrutCombination } from '../load';
import type { InventoryItem, ShorePoint } from '../schema';

// assembleBom only reads strut.model/system + extensions + extensionSources off the
// combo, so a minimal cast keeps these tests focused on the sourcing logic.
const combo = (over: Partial<StrutCombination>): StrutCombination =>
  ({ strut: { model: 'LS 203', system: 'LongShore' }, extensions: [], extensionSources: undefined, ...over }) as unknown as StrutCombination;

const plateRow = (id: string, apparatus: string, available: number): InventoryItem => ({
  id, type: 'plate', plateId: 'plate-x', apparatus, apparatusId: `app-${apparatus}`, quantity: available, available,
});
const strutSrc = { apparatus: 'Rescue 2', inventoryId: 'inv-strut' };
const sp = (bom: ShorePoint['deployedBom']): ShorePoint => ({ deployedBom: bom }) as unknown as ShorePoint;

describe('assembleBom — ADR-033 deploy assembly', () => {
  it('same plate at both ends with ONE unit in stock → one tracked, one untracked (no double-claim)', () => {
    // The HIGH bug: a single shared plate unit must not be claimed twice, which
    // would force the all-or-nothing deploy transaction to abort a valid shore.
    const bom = assembleBom(combo({}), { topPlate: 'plate-x', bottomPlate: 'plate-x' }, strutSrc, [
      plateRow('inv-p', 'Rescue 2', 1),
    ]);
    const plates = bom.filter((c) => c.role === 'top-plate' || c.role === 'bottom-plate');
    expect(plates).toHaveLength(2);
    expect(plates.filter((p) => p.inventoryId === 'inv-p')).toHaveLength(1); // exactly one drew the unit
    const untracked = plates.filter((p) => p.inventoryId === undefined);
    expect(untracked).toHaveLength(1);
    expect(untracked[0]!.source).toBe('untracked');
  });

  it('same plate at both ends with TWO units → both tracked from the row', () => {
    const bom = assembleBom(combo({}), { topPlate: 'plate-x', bottomPlate: 'plate-x' }, strutSrc, [
      plateRow('inv-p', 'Rescue 2', 2),
    ]);
    const plates = bom.filter((c) => c.role === 'top-plate' || c.role === 'bottom-plate');
    expect(plates.every((p) => p.inventoryId === 'inv-p')).toBe(true);
  });

  it('plate auto-source prefers the strut’s rig over another rig that also stocks it', () => {
    const bom = assembleBom(combo({}), { topPlate: 'plate-x', bottomPlate: 'none' }, strutSrc, [
      plateRow('inv-a', 'Engine 4', 1),
      plateRow('inv-b', 'Rescue 2', 1),
    ]);
    expect(bom.find((c) => c.role === 'top-plate')!.inventoryId).toBe('inv-b'); // Rescue 2 = strut rig
  });

  it('an extension with no resolved source is recorded UNTRACKED, never dropped', () => {
    const bom = assembleBom(combo({ extensions: [12] }), { topPlate: 'none', bottomPlate: 'none' }, strutSrc, []);
    const ext = bom.find((c) => c.role === 'extension');
    expect(ext).toBeDefined();
    expect(ext!.length).toBe(12);
    expect(ext!.inventoryId).toBeUndefined();
    expect(ext!.source).toBe('untracked');
  });

  it('pairs each extension length with the engine-resolved source row', () => {
    const bom = assembleBom(
      combo({ extensions: [12], extensionSources: [{ length: 12, inventoryId: 'inv-ext' }] }),
      { topPlate: 'none', bottomPlate: 'none' },
      strutSrc,
      [{ id: 'inv-ext', type: 'extension', length: 12, system: 'LongShore', apparatus: 'Ladder 1', apparatusId: 'app-l1', quantity: 1, available: 1 }],
    );
    const ext = bom.find((c) => c.role === 'extension')!;
    expect(ext.inventoryId).toBe('inv-ext');
    expect(ext.source).toBe('Ladder 1');
  });
});

describe('bomSourceStatus — card stock readiness (decisions 5–6)', () => {
  const ded = { topPlate: 'plate-x', bottomPlate: 'none' };

  it('complete: strut + plate both on the strut’s rig', () => {
    const s = bomSourceStatus(combo({}), ded, strutSrc, [plateRow('inv-p', 'Rescue 2', 1)]);
    expect(s.status).toBe('complete');
    expect(s.detail).toBe('All on Rescue 2');
  });

  it('cross-truck: a piece is on scene but on another rig', () => {
    const s = bomSourceStatus(combo({}), ded, strutSrc, [plateRow('inv-p', 'Engine 4', 1)]);
    expect(s.status).toBe('cross-truck');
    expect(s.detail).toBe('Base plate from Engine 4');
  });

  it('missing: a needed piece is in no on-scene rig’s stock', () => {
    const s = bomSourceStatus(combo({}), ded, strutSrc, []);
    expect(s.status).toBe('missing');
    expect(s.detail).toBe('Base plate not on scene');
  });
});

describe('bomModelLabel + helpers', () => {
  it('reconstructs the combined strut + extension identity', () => {
    expect(bomModelLabel(sp([
      { role: 'strut', model: 'LS 406', source: 'R2', inventoryId: 'x' },
      { role: 'extension', length: 12, source: 'R2', inventoryId: 'y' },
    ]))).toBe('LS 406 + 12″');
  });

  it('is the bare model when there are no extensions', () => {
    expect(bomModelLabel(sp([{ role: 'strut', model: 'LS 406', source: 'R2', inventoryId: 'x' }]))).toBe('LS 406');
  });

  it('hasUntracked + deployedRigs read the BOM correctly', () => {
    const point = sp([
      { role: 'strut', model: 'LS 406', source: 'Rescue 2', inventoryId: 'x' },
      { role: 'top-plate', plateId: 'plate-x', source: 'Engine 4', inventoryId: 'y' },
      { role: 'bottom-plate', plateId: 'plate-x', source: 'untracked' }, // untracked
    ]);
    expect(hasUntracked(point)).toBe(true);
    expect(deployedRigs(point).sort()).toEqual(['Engine 4', 'Rescue 2']); // tracked rigs only
  });
});
