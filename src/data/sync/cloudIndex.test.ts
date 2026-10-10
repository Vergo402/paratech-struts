import { describe, it, expect } from 'vitest';
import { createCloudIndex, cloudIndex } from './cloudIndex';

describe('cloudIndex — latest cloud snapshot ids → receivedAt (ADR-041)', () => {
  it('starts empty', () => {
    const idx = createCloudIndex();
    expect(idx.size()).toBe(0);
    expect(idx.has('a')).toBe(false);
    expect(idx.receivedAt('a')).toBeUndefined();
  });

  it('replace() indexes ids with their server stamps', () => {
    const idx = createCloudIndex();
    idx.replace([{ id: 'a', receivedAt: 100 }, { id: 'b', receivedAt: 200 }]);
    expect(idx.size()).toBe(2);
    expect(idx.has('a')).toBe(true);
    expect(idx.receivedAt('a')).toBe(100);
    expect(idx.receivedAt('b')).toBe(200);
  });

  it('a legacy unstamped event is present but has no receivedAt', () => {
    const idx = createCloudIndex();
    idx.replace([{ id: 'legacy' }]);
    expect(idx.has('legacy')).toBe(true); // lost-ack check still sees it
    expect(idx.receivedAt('legacy')).toBeUndefined();
  });

  it('a non-finite or non-numeric stamp is treated as no stamp', () => {
    const idx = createCloudIndex();
    idx.replace([
      { id: 'nan', receivedAt: Number.NaN },
      { id: 'sv', receivedAt: { '.sv': 'timestamp' } as unknown as number },
    ]);
    expect(idx.has('nan')).toBe(true);
    expect(idx.receivedAt('nan')).toBeUndefined();
    expect(idx.receivedAt('sv')).toBeUndefined();
  });

  it('replace() holds ONLY the latest snapshot — ids absent from it are dropped', () => {
    const idx = createCloudIndex();
    idx.replace([{ id: 'a', receivedAt: 100 }, { id: 'b', receivedAt: 200 }]);
    idx.replace([{ id: 'b', receivedAt: 250 }, { id: 'c', receivedAt: 300 }]);
    expect(idx.has('a')).toBe(false);
    expect(idx.receivedAt('b')).toBe(250);
    expect(idx.receivedAt('c')).toBe(300);
    expect(idx.size()).toBe(2);
  });

  it('replace() does not retain a reference to the caller array', () => {
    const idx = createCloudIndex();
    const snap = [{ id: 'a', receivedAt: 1 }];
    idx.replace(snap);
    snap.push({ id: 'b', receivedAt: 2 });
    expect(idx.has('b')).toBe(false);
  });

  it('clear() empties the index', () => {
    const idx = createCloudIndex();
    idx.replace([{ id: 'a', receivedAt: 1 }]);
    idx.clear();
    expect(idx.size()).toBe(0);
    expect(idx.has('a')).toBe(false);
  });

  it('instances are independent; the singleton exists', () => {
    const a = createCloudIndex();
    const b = createCloudIndex();
    a.replace([{ id: 'x', receivedAt: 1 }]);
    expect(b.has('x')).toBe(false);
    expect(typeof cloudIndex.replace).toBe('function');
  });
});
