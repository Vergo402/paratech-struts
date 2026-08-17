import { describe, expect, it, vi, afterEach } from 'vitest';
import { convertToWords, w3wEnabled } from './w3w';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('w3w client (#441)', () => {
  it('w3wEnabled is false without a key (test env has none) — conversion stays off', () => {
    expect(w3wEnabled()).toBe(false);
  });

  it('convertToWords returns the words for a fix', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toContain('convert-to-3wa');
        expect(url).toContain(encodeURIComponent('25.874,-80.1217'));
        return { ok: true, json: async () => ({ words: 'filled.count.soap' }) };
      }),
    );
    await expect(convertToWords({ lat: 25.874, lng: -80.1217 })).resolves.toBe('filled.count.soap');
  });

  it('throws on an HTTP error (callers treat it as words-still-pending)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })));
    await expect(convertToWords({ lat: 1, lng: 2 })).rejects.toThrow('HTTP 401');
  });

  it('throws when the body has no words (API error payload)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ error: { code: 'QuotaExceeded' } }) })),
    );
    await expect(convertToWords({ lat: 1, lng: 2 })).rejects.toThrow('QuotaExceeded');
  });
});

// Permanent-failure latch — module-level state, so each test isolates via
// vi.resetModules() + a fresh dynamic import (same pattern as nativeControls.test.ts).
describe('w3w permanent-failure latch (#441 follow-up)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('one 401 alone does not latch — w3wEnabled stays whatever it was', async () => {
    vi.resetModules();
    const { convertToWords: convert, w3wUnavailable } = await import('./w3w');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })));
    await expect(convert({ lat: 1, lng: 2 })).rejects.toThrow('HTTP 401');
    expect(w3wUnavailable()).toBe(false);
  });

  it('two consecutive 401/402/403 failures latch w3wEnabled off', async () => {
    vi.resetModules();
    const { convertToWords: convert, w3wUnavailable } = await import('./w3w');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) })));
    await expect(convert({ lat: 1, lng: 2 })).rejects.toThrow('HTTP 403');
    expect(w3wUnavailable()).toBe(false);
    await expect(convert({ lat: 1, lng: 2 })).rejects.toThrow('HTTP 403');
    expect(w3wUnavailable()).toBe(true);
  });

  it('402 then 401 (mixed permanent codes) also latches after 2', async () => {
    vi.resetModules();
    const { convertToWords: convert, w3wUnavailable } = await import('./w3w');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 402, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(convert({ lat: 1, lng: 2 })).rejects.toThrow('HTTP 402');
    await expect(convert({ lat: 1, lng: 2 })).rejects.toThrow('HTTP 401');
    expect(w3wUnavailable()).toBe(true);
  });

  it('a transient 500 never latches, even repeated', async () => {
    vi.resetModules();
    const { convertToWords: convert, w3wUnavailable } = await import('./w3w');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    await expect(convert({ lat: 1, lng: 2 })).rejects.toThrow('HTTP 500');
    await expect(convert({ lat: 1, lng: 2 })).rejects.toThrow('HTTP 500');
    await expect(convert({ lat: 1, lng: 2 })).rejects.toThrow('HTTP 500');
    expect(w3wUnavailable()).toBe(false);
  });

  it('a transient 429 never latches', async () => {
    vi.resetModules();
    const { convertToWords: convert, w3wUnavailable } = await import('./w3w');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) })));
    await expect(convert({ lat: 1, lng: 2 })).rejects.toThrow('HTTP 429');
    await expect(convert({ lat: 1, lng: 2 })).rejects.toThrow('HTTP 429');
    expect(w3wUnavailable()).toBe(false);
  });

  it('a success clears the latch immediately (a later paid key needs zero code changes)', async () => {
    vi.resetModules();
    const { convertToWords: convert, w3wUnavailable } = await import('./w3w');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ words: 'filled.count.soap' }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(convert({ lat: 1, lng: 2 })).rejects.toThrow('HTTP 403');
    await expect(convert({ lat: 1, lng: 2 })).rejects.toThrow('HTTP 403');
    expect(w3wUnavailable()).toBe(true);
    await expect(convert({ lat: 1, lng: 2 })).resolves.toBe('filled.count.soap');
    expect(w3wUnavailable()).toBe(false);
  });
});
