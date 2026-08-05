// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';

describe('nativeControls — #460 in-memory fallback when storage writes fail', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('applies the toggle for the session even when localStorage.setItem throws', async () => {
    const { setNativeControls, useNativeControls } = await import('./nativeControls');
    const { result } = renderHook(() => useNativeControls());
    expect(result.current).toBe(false);

    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    act(() => setNativeControls(true));

    // Before #460 this reverted to false: the write silently failed and the
    // useSyncExternalStore snapshot re-read localStorage, which never changed.
    expect(result.current).toBe(true);
    // Confirm the write really did fail (proving `true` came from the
    // in-memory fallback, not a successful persist).
    expect(localStorage.getItem('fieldshore_native_controls')).toBeNull();
  });

  it('clears the fallback once a write succeeds again, restoring storage as the source of truth', async () => {
    const { setNativeControls } = await import('./nativeControls');
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    setNativeControls(true); // fails — falls back to memory
    setItemSpy.mockRestore(); // storage works again
    setNativeControls(false); // succeeds — should persist for real
    expect(localStorage.getItem('fieldshore_native_controls')).toBe('false');
  });
});
