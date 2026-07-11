// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { FieldShoreEvent } from '@core/schema';
import { captureLocation } from './locationCapture';

const enabled = vi.fn(() => true);
const convert = vi.fn<(c: { lat: number; lng: number }) => Promise<string>>();
vi.mock('@ui/hooks', () => ({
  w3wEnabled: () => enabled(),
  convertToWords: (c: { lat: number; lng: number }) => convert(c),
  useCommitMany: () => vi.fn(),
  useDeviceUid: () => () => Promise.resolve('device-test'),
}));

const FIX = { coords: { latitude: 25.874, longitude: -80.1217 } };

function stubGeolocation(behavior: 'fix' | 'deny') {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: (p: typeof FIX) => void, err: (e: { message: string }) => void) => {
        if (behavior === 'fix') ok(FIX);
        else err({ message: 'denied' });
      },
    },
  });
}

function patchesOf(commits: FieldShoreEvent[][]): Record<string, unknown>[][] {
  return commits.map((batch) => batch.map((e) => (e as { patch: Record<string, unknown> }).patch));
}

describe('captureLocation (#441)', () => {
  const commits: FieldShoreEvent[][] = [];
  const commitMany = vi.fn(async (events: FieldShoreEvent[]) => {
    commits.push(events);
    return { ok: true };
  });

  beforeEach(() => {
    commits.length = 0;
    commitMany.mockClear();
    convert.mockReset();
    enabled.mockReturnValue(true);
  });

  it('patches coords to every id, then words (online + key)', async () => {
    stubGeolocation('fix');
    convert.mockResolvedValue('filled.count.soap');
    await captureLocation(['a', 'b'], 'op1', commitMany, 'dev1');

    expect(commits).toHaveLength(2);
    // batch 1: coords fanned to both members
    expect(commits[0]!.map((e) => (e as { spId: string }).spId)).toEqual(['a', 'b']);
    expect(patchesOf(commits)[0]![0]).toEqual({ coords: { lat: 25.874, lng: -80.1217 } });
    // batch 2: the words, same fan-out
    expect(patchesOf(commits)[1]![1]).toEqual({ w3w: 'filled.count.soap' });
    expect(convert).toHaveBeenCalledTimes(1); // one conversion for the whole group
  });

  it('no GPS fix → no commits at all (the card button remains the retry path)', async () => {
    stubGeolocation('deny');
    await captureLocation(['a'], 'op1', commitMany, 'dev1');
    expect(commitMany).not.toHaveBeenCalled();
  });

  it('conversion off (no key) → coords land, words skipped', async () => {
    stubGeolocation('fix');
    enabled.mockReturnValue(false);
    await captureLocation(['a'], 'op1', commitMany, 'dev1');
    expect(commits).toHaveLength(1);
    expect(patchesOf(commits)[0]![0]).toHaveProperty('coords');
    expect(convert).not.toHaveBeenCalled();
  });

  it('conversion failure → coords still landed, error swallowed', async () => {
    stubGeolocation('fix');
    convert.mockRejectedValue(new Error('quota'));
    await expect(captureLocation(['a'], 'op1', commitMany, 'dev1')).resolves.toBeUndefined();
    expect(commits).toHaveLength(1); // coords batch only
  });
});
