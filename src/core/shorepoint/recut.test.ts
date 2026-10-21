import { describe, it, expect } from 'vitest';
import {
  NO_DEDUCTIONS,
  ShorePointPatch,
  FieldShoreEvent as FieldShoreEventSchema,
  type ShorePoint,
  type FieldShoreEvent,
} from '../schema';
import { shorePointReducer, cutLengthEighths, cutRecordOf, needsRecut } from './reducer';

// Re-cut flag (Alex 2026-10-20). Mark Cut Done records what was cut; a later cut-length
// change on that leg (grouped sizing past Pending, remote/replayed edits) DERIVES a flag
// that clears on Re-cut Done (re-record), clear Cut Done, or a step back to Strut Set.

const W4: ShorePoint['deductions'] = { headerWood: '4x4', footerWood: '4x4', topPlate: 'none', bottomPlate: 'none' };
const W6: ShorePoint['deductions'] = { headerWood: '6x6', footerWood: '6x6', topPlate: 'none', bottomPlate: 'none' };
// The accepted mockup's numbers: a 54″ opening cuts 45½″ on 4×4, 41½″ on 6×6.
const OPEN = 54 * 8;
const R4 = { eighths: 45.5 * 8, headerWood: '4x4', footerWood: '4x4' } as const;
const R6 = { eighths: 41.5 * 8, headerWood: '6x6', footerWood: '6x6' } as const;

const meta = { id: 'e1', opId: 'op1', at: 1, by: 'tester' };
const edit = (patch: Record<string, unknown>, spId = 'sp1'): FieldShoreEvent =>
  ({ type: 'ShorePointEdited', ...meta, spId, patch }) as FieldShoreEvent;

function cutting(over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id: 'sp1',
    opId: 'op1',
    division: '1',
    shoreType: 't-shore',
    measurementEighths: OPEN,
    deductions: W4,
    status: 'cutting',
    cuttingStartedAt: 10,
    ...over,
  };
}

describe('re-cut flag — the cut record (reducer)', () => {
  it('cutRecordOf records the cut length in eighths + the resolved wood (a legacy none → the standard)', () => {
    expect(cutRecordOf(cutting())).toEqual(R4);
    expect(cutLengthEighths(cutting())).toBe(R4.eighths);
    expect(cutRecordOf(cutting({ deductions: { ...W4, headerWood: '6x6' } }))).toEqual({
      eighths: 43.5 * 8,
      headerWood: '6x6',
      footerWood: '4x4',
    });
    // The T-Shore standard is 4×4 — a point saved with no wood records what the cut used.
    expect(cutRecordOf(cutting({ deductions: NO_DEDUCTIONS }))).toEqual(R4);
  });

  it('Mark Cut Done with a record sets both cuttingDone and cutRecord', () => {
    const next = shorePointReducer(cutting(), edit({ cuttingDone: true, cutRecord: R4 }));
    expect(next.cuttingDone).toBe(true);
    expect(next.cutRecord).toEqual(R4);
    expect(needsRecut(next)).toBe(false);
  });

  it('Re-cut Done re-records on an already cut-done point; cuttingDone stays true', () => {
    const point = cutting({ deductions: W6, cuttingDone: true, cutRecord: R4 });
    expect(needsRecut(point)).toBe(true);
    const next = shorePointReducer(point, edit({ cuttingDone: true, cutRecord: R6 }));
    expect(next).not.toBe(point);
    expect(next.cuttingDone).toBe(true);
    expect(next.cutRecord).toEqual(R6);
    expect(needsRecut(next)).toBe(false);
  });

  it('an identical record (a fresh object) is no effect — the SAME point (ADR-041)', () => {
    const point = cutting({ cuttingDone: true, cutRecord: { ...R4 } });
    expect(shorePointReducer(point, edit({ cuttingDone: true, cutRecord: { ...R4 } }))).toBe(point);
  });

  it('a record without cuttingDone:true is ignored', () => {
    const point = cutting();
    expect(shorePointReducer(point, edit({ cutRecord: R4 }))).toBe(point);
    const done = cutting({ cuttingDone: true, cutRecord: R4 });
    expect(shorePointReducer(done, edit({ cutRecord: R6 }))).toBe(done);
  });

  it("an older build's bare cuttingDone:true keeps an existing record and records nothing new", () => {
    const done = cutting({ cuttingDone: true, cutRecord: R4 });
    expect(shorePointReducer(done, edit({ cuttingDone: true }))).toBe(done);
    const fresh = shorePointReducer(cutting(), edit({ cuttingDone: true }));
    expect(fresh.cuttingDone).toBe(true);
    expect('cutRecord' in fresh).toBe(false);
    expect(needsRecut({ ...fresh, deductions: W6 })).toBe(false); // no record → never flags
  });

  it('clear Cut Done (cuttingDone:false) clears the record with the flag', () => {
    const next = shorePointReducer(cutting({ cuttingDone: true, cutRecord: R4 }), edit({ cuttingDone: false }));
    expect('cuttingDone' in next).toBe(false);
    expect('cutRecord' in next).toBe(false);
  });

  it('stepping back cutting → strutset clears the record; cutting ↔ runner keeps it', () => {
    const status = (point: ShorePoint, from: ShorePoint['status'], to: ShorePoint['status']) =>
      shorePointReducer(point, { type: 'ShorePointStatusChanged', ...meta, spId: point.id, from, to } satisfies FieldShoreEvent);
    const done = cutting({ cuttingDone: true, cutRecord: R4 });
    const back = status(done, 'cutting', 'strutset');
    expect('cutRecord' in back).toBe(false);
    expect('cuttingDone' in back).toBe(false);
    const runner = status(done, 'cutting', 'runner');
    expect(runner.cutRecord).toEqual(R4);
    expect(status(runner, 'runner', 'cutting').cutRecord).toEqual(R4);
  });

  it('a replayed/remote deductions edit on a cut GROUPED leg lands, keeps the record, and flags', () => {
    const leg = cutting({ groupId: 'g', groupIndex: 1, groupTotal: 2, cuttingDone: true, cutRecord: R4 });
    const next = shorePointReducer(leg, edit({ deductions: W6 }));
    expect(next.deductions).toEqual(W6); // the edit still goes through (Alex 2026-10-20)
    expect(next.cuttingDone).toBe(true);
    expect(next.cutRecord).toEqual(R4); // what was cut is untouched
    expect(cutLengthEighths(next)).toBe(R6.eighths);
    expect(needsRecut(next)).toBe(true);
  });

  it('a grouped re-measure that moves the cut also flags', () => {
    const leg = cutting({ groupId: 'g', cuttingDone: true, cutRecord: R4 });
    expect(needsRecut(shorePointReducer(leg, edit({ measurementEighths: OPEN + 8 })))).toBe(true);
  });
});

describe('re-cut flag — needsRecut derivation', () => {
  it('changed → flag', () => {
    expect(needsRecut(cutting({ deductions: W6, cuttingDone: true, cutRecord: R4 }))).toBe(true);
  });
  it('unchanged → none (same length on different wood is not a re-cut — the flag is the LENGTH)', () => {
    expect(needsRecut(cutting({ cuttingDone: true, cutRecord: R4 }))).toBe(false);
    expect(needsRecut(cutting({ cuttingDone: true, cutRecord: { ...R4, headerWood: '6x6' } }))).toBe(false);
  });
  it('no record → none (cut before this shipped, or by an older build)', () => {
    expect(needsRecut(cutting({ deductions: W6, cuttingDone: true }))).toBe(false);
  });
  it('not cut done → none', () => {
    expect(needsRecut(cutting({ deductions: W6, cutRecord: R4 }))).toBe(false);
  });
});

// The client Zod parse is the strict gate for event payloads (the RTDB rules validate
// only the event envelope — see core/schema/rules.ts EVENT_ENVELOPE_VALIDATE).
describe('re-cut flag — the cutRecord patch shape (client schema gate)', () => {
  const ev = (patch: unknown) => ({ type: 'ShorePointEdited', ...meta, spId: 'sp1', patch });

  it('a well-formed record parses on the patch and the event', () => {
    expect(ShorePointPatch.safeParse({ cuttingDone: true, cutRecord: R4 }).success).toBe(true);
    expect(FieldShoreEventSchema.safeParse(ev({ cuttingDone: true, cutRecord: R4 })).success).toBe(true);
  });

  it('a malformed record is rejected', () => {
    const bad = [
      { ...R4, eighths: 45.5 }, // not an integer eighths count
      { ...R4, eighths: -8 }, // negative
      { ...R4, eighths: '364' }, // wrong type
      { ...R4, headerWood: '8x8' }, // unknown wood id
      { eighths: 364, headerWood: '4x4' }, // missing footer
      null, // no null form — it clears with cuttingDone:false
    ];
    for (const cutRecord of bad) {
      expect(ShorePointPatch.safeParse({ cuttingDone: true, cutRecord }).success).toBe(false);
      expect(FieldShoreEventSchema.safeParse(ev({ cuttingDone: true, cutRecord })).success).toBe(false);
    }
  });

  it('an older build (a patch schema without the key) strips it and still applies cuttingDone', () => {
    const oldPatch = ShorePointPatch.omit({ cutRecord: true });
    const parsed = oldPatch.parse({ cuttingDone: true, cutRecord: R4 });
    expect(parsed).toEqual({ cuttingDone: true });
    const next = shorePointReducer(cutting(), edit(parsed));
    expect(next.cuttingDone).toBe(true);
    expect('cutRecord' in next).toBe(false);
  });
});
