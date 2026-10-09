import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { salvageArray, salvageRecord } from './stateSync';

const Item = z.object({ id: z.string(), n: z.number() });

describe('salvageArray (#481 per-element salvage)', () => {
  const Parse = salvageArray(Item, 'test');

  it('keeps good elements and drops only the bad ones, preserving order', () => {
    const out = Parse.parse([{ id: 'a', n: 1 }, { id: 'bad' }, null, 7, { id: 'b', n: 2 }]);
    expect(out).toEqual([{ id: 'a', n: 1 }, { id: 'b', n: 2 }]);
  });

  it('returns the parsed (stripped/defaulted) data, not the raw element', () => {
    expect(Parse.parse([{ id: 'a', n: 1, extra: true }])).toEqual([{ id: 'a', n: 1 }]);
  });

  it('degrades a non-array input to []', () => {
    for (const v of [null, undefined, 42, 'x', { id: 'a', n: 1 }]) expect(Parse.parse(v)).toEqual([]);
  });

  it('yields [] when the sole element is bad', () => {
    expect(Parse.parse([{ id: 'x' }])).toEqual([]);
  });
});

describe('salvageRecord (#481 per-key salvage)', () => {
  const Parse = salvageRecord(Item, 'test');

  it('keeps good keys and drops only the bad ones', () => {
    expect(Parse.parse({ a: { id: 'a', n: 1 }, b: { id: 'b' }, c: { id: 'c', n: 3 } })).toEqual({
      a: { id: 'a', n: 1 },
      c: { id: 'c', n: 3 },
    });
  });

  it('degrades a non-record input to {}', () => {
    for (const v of [null, undefined, 42, 'x']) expect(Parse.parse(v)).toEqual({});
  });
});
