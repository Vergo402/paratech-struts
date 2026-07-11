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
