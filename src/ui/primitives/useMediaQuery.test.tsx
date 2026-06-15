// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { useMediaQuery, useIsDesktop } from './useMediaQuery';

// jsdom has no matchMedia; stub it per-test (the theme.test.tsx idiom). The
// setter simulates a viewport crossing the breakpoint (fires the listeners).
function stubMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches: initial,
    media: '',
    onchange: null,
    addEventListener: (_t: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_t: string, cb: () => void) => listeners.delete(cb),
    addListener: (cb: () => void) => listeners.add(cb),
    removeListener: (cb: () => void) => listeners.delete(cb),
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;
  vi.stubGlobal('matchMedia', vi.fn(() => mql));
  return {
    set(next: boolean) {
      (mql as { matches: boolean }).matches = next;
      listeners.forEach((cb) => cb());
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('useMediaQuery', () => {
  it('reports the current match', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('updates when the viewport crosses the breakpoint', () => {
    const mm = stubMatchMedia(false);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
    act(() => mm.set(true));
    expect(result.current).toBe(true);
  });

  it('falls back to phone (false) when matchMedia is unavailable', () => {
    // No stub — jsdom default. The guard must not throw and must default phone,
    // which is why the test env keeps every picker on the Sheet branch.
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });
});
