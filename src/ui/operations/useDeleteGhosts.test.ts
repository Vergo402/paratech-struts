// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShorePoint } from '@core/schema';
import { useDeleteGhosts, isLeaving } from './useDeleteGhosts';

// The hook only reads id / status / deletedAt — a minimal cast is enough.
const sp = (id: string, over: Partial<ShorePoint> = {}): ShorePoint =>
  ({ id, status: 'pending', deletedAt: undefined, ...over }) as unknown as ShorePoint;

function media(matches: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches,
    media: q,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  }));
}

describe('useDeleteGhosts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    media(false); // motion allowed by default
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('creates a fading ghost when a pending point is soft-deleted', () => {
    const a = sp('a');
    const { result, rerender } = renderHook(({ pts }) => useDeleteGhosts(pts), {
      initialProps: { pts: [a] as ShorePoint[] },
    });
    expect(result.current).toHaveLength(0);
    rerender({ pts: [{ ...a, deletedAt: 123 }] as ShorePoint[] });
    expect(result.current).toHaveLength(1);
    const ghost = result.current[0]!;
    expect(ghost.id).toBe('a');
    expect(isLeaving(ghost)).toBe(true);
    expect(ghost.deletedAt).toBeUndefined(); // renders as a normal pending card while it fades
  });

  it('drops the ghost after the exit duration', () => {
    const a = sp('a');
    const { result, rerender } = renderHook(({ pts }) => useDeleteGhosts(pts), {
      initialProps: { pts: [a] as ShorePoint[] },
    });
    rerender({ pts: [{ ...a, deletedAt: 123 }] as ShorePoint[] });
    expect(result.current).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toHaveLength(0);
  });

  it('does NOT fade on a status advance (deletedAt stays null)', () => {
    const a = sp('a');
    const { result, rerender } = renderHook(({ pts }) => useDeleteGhosts(pts), {
      initialProps: { pts: [a] as ShorePoint[] },
    });
    rerender({ pts: [{ ...a, status: 'process' }] as ShorePoint[] });
    expect(result.current).toHaveLength(0);
  });

  it('does NOT fade a non-pending point that gains deletedAt', () => {
    const a = sp('a', { status: 'process' });
    const { result, rerender } = renderHook(({ pts }) => useDeleteGhosts(pts), {
      initialProps: { pts: [a] as ShorePoint[] },
    });
    rerender({ pts: [{ ...a, deletedAt: 123 }] as ShorePoint[] });
    expect(result.current).toHaveLength(0);
  });

  it('creates no ghost under reduced motion', () => {
    media(true);
    const a = sp('a');
    const { result, rerender } = renderHook(({ pts }) => useDeleteGhosts(pts), {
      initialProps: { pts: [a] as ShorePoint[] },
    });
    rerender({ pts: [{ ...a, deletedAt: 123 }] as ShorePoint[] });
    expect(result.current).toHaveLength(0);
  });
});
