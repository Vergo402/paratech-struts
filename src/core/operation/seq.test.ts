import { describe, expect, it } from 'vitest';
import { nextSeqBase } from './seq';

describe('nextSeqBase — stable created-order numbering', () => {
  it('starts at 0 for an empty operation (first add becomes #1)', () => {
    expect(nextSeqBase([])).toBe(0);
  });

  it('returns the highest existing seq', () => {
    expect(nextSeqBase([{ seq: 1 }, { seq: 2 }, { seq: 3 }])).toBe(3);
  });

  it('SURVIVES deletion — a deleted number is never reused', () => {
    // {1,2,3} with #2 deleted → base is still 3, so the next add is #4 (not #2).
    expect(nextSeqBase([{ seq: 1 }, { seq: 3 }])).toBe(3);
  });

  it('uses max, not count — order-independent and gap-tolerant', () => {
    expect(nextSeqBase([{ seq: 3 }, { seq: 1 }])).toBe(3);
    expect(nextSeqBase([{ seq: 10 }])).toBe(10); // one point, but next is #11
  });

  it('treats points without a seq (pre-feature) as 0', () => {
    expect(nextSeqBase([{ seq: undefined }, { seq: 5 }, {}])).toBe(5);
    expect(nextSeqBase([{}, {}])).toBe(0);
  });
});
