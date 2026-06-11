import { describe, it, expect, vi, afterEach } from 'vitest';
import { newId } from './id';

// RFC 4122 v4: version nibble = 4, variant nibble = 8/9/a/b.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId (L-10)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns RFC 4122 v4 UUIDs that do not repeat', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });

  // Phase H gate drive (2026-06-10): on a plain-http LAN origin (phone →
  // http://192.168.x.x preview) crypto.randomUUID is undefined — only secure
  // contexts expose it — and boot died with DATA LAYER ERROR. The fallback
  // builds the UUID from crypto.getRandomValues, which insecure contexts allow.
  it('falls back to getRandomValues when randomUUID is missing (insecure context)', () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', {
      getRandomValues: real.getRandomValues.bind(real),
    });
    expect(typeof crypto.randomUUID).toBe('undefined');
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });
});
