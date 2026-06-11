// L-10 — IDs that cannot collide. v3 minted IDs as `Date.now() + Math.random()`,
// which could collide within the same millisecond across devices (hardened in
// v3.8.3 / v3.9.0). v4 mints all IDs once, here.
//
// crypto.randomUUID() exists only in SECURE contexts (https / localhost). On a
// plain-http LAN origin (e.g. a phone hitting a preview at http://192.168.x.x)
// it is undefined and the data layer died at boot (Phase H gate drive,
// 2026-06-10). crypto.getRandomValues() is NOT secure-context-gated, so fall
// back to assembling an RFC 4122 v4 UUID from it — same entropy, same shape.
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40; // version 4
  b[8] = (b[8]! & 0x3f) | 0x80; // variant 10xx
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
