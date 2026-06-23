import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDB, type FieldShoreDB } from './db';
import { getDeviceUid } from './auth';
import { buildSeedInventory, seedIfEmpty } from './seed';
import { newId } from '@core/id';
import { Inventory } from '@core/schema';
import { STRUTS, findStrutCombinations } from '@core/load';

describe('device uid (fieldshore_auth_uid)', () => {
  let db: FieldShoreDB;
  let name: string;

  beforeEach(() => {
    name = `test-auth-${newId()}`;
    db = createDB(name);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('mints a UUID once and returns the same uid on every call', async () => {
    const uid = await getDeviceUid(db);
    expect(uid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(await getDeviceUid(db)).toBe(uid);
  });

  it('survives a reboot — a fresh connection to the same database reads the same uid', async () => {
    const uid = await getDeviceUid(db);
    const reopened = createDB(name);
    expect(await getDeviceUid(reopened)).toBe(uid);
    reopened.close();
  });
});

describe('seed inventory', () => {
  let db: FieldShoreDB;

  beforeEach(() => {
    db = createDB(`test-seed-${newId()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('seeds an empty table once and never again', async () => {
    expect(await seedIfEmpty(db)).toBe(true);
    const count = await db.inventory.count();
    expect(count).toBe(buildSeedInventory().length);
    expect(await seedIfEmpty(db)).toBe(false);
    expect(await db.inventory.count()).toBe(count);
  });

  it('does NOT seed a bucket that already has events (returning user who cleared inventory)', async () => {
    // Empty inventory, but an event log exists → NOT a fresh bucket. seedIfEmpty must
    // leave it alone rather than inject 17 demo struts over real work (events = truth).
    await db.events.add({ id: newId(), opId: 'op-1', at: 1 } as never);
    expect(await seedIfEmpty(db)).toBe(false);
    expect(await db.inventory.count()).toBe(0);
  });

  it('degrades to empty inventory when seeding throws, instead of dead-ending boot (audit W6)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const throwingDb = {
      transaction: () => Promise.reject(new Error('QuotaExceededError')),
    } as unknown as FieldShoreDB;
    await expect(seedIfEmpty(throwingDb)).resolves.toBe(false);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('is schema-valid, models resolve against STRUTS, and stock is sane', () => {
    const items = buildSeedInventory();
    expect(() => Inventory.parse(items)).not.toThrow();
    for (const i of items) {
      expect(i.available).toBeLessThanOrEqual(i.quantity);
      if (i.type === 'strut') {
        expect(STRUTS.some((s) => s.model === i.model)).toBe(true);
      }
    }
  });

  // The fixture's whole job is making the #247 verification states drivable.
  // Pin each promised path against the REAL engine so a future seed edit that
  // silently breaks one fails here, not in front of Alex at the gate.
  describe('drivable verification paths (#247)', () => {
    const items = buildSeedInventory();
    const SF_4TO1 = 2;

    it('30″ → real recommendations', () => {
      const combos = findStrutCombinations(30, 0, SF_4TO1, items);
      expect(combos.some((c) => !c.unrated && !c.exceedsCapacity)).toBe(true);
    });

    it('16″ → no match (nothing seeded reaches down to 16″)', () => {
      expect(findStrutCombinations(16, 0, SF_4TO1, items)).toHaveLength(0);
    });

    it('200″ → unrated-zone warning (the #40 gate driver)', () => {
      const combos = findStrutCombinations(200, 0, SF_4TO1, items);
      expect(combos.length).toBeGreaterThan(0);
      expect(combos.every((c) => c.unrated)).toBe(true);
    });

    it('includes a zero-available rig (the no-inventory empty state)', () => {
      const squads = items.filter((i) => i.apparatusId === 'app-squad-3');
      expect(squads.length).toBeGreaterThan(0);
      expect(squads.every((i) => i.available === 0)).toBe(true);
    });
  });
});
