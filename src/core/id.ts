// L-10 — IDs that cannot collide. v3 minted IDs as `Date.now() + Math.random()`,
// which could collide within the same millisecond across devices (hardened in
// v3.8.3 / v3.9.0). v4 uses crypto.randomUUID() at every ID site, once, here.
export function newId(): string {
  return crypto.randomUUID();
}
