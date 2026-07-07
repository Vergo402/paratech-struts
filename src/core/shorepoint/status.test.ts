import { describe, it, expect } from 'vitest';
import { cuttingQueueCount } from './status';

describe('cuttingQueueCount — the Cutting Station workstation numeral (#434)', () => {
  it('counts live cutting points only', () => {
    expect(
      cuttingQueueCount([
        { status: 'cutting' },
        { status: 'cutting', deletedAt: null },
        { status: 'cutting', deletedAt: 42 }, // deleted → excluded
        { status: 'runner' }, //                 other status → excluded
        { status: 'pending' },
      ]),
    ).toBe(2);
  });

  it('is 0 for an empty board', () => {
    expect(cuttingQueueCount([])).toBe(0);
  });
});
