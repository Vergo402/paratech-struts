import type { DeployedComponent } from '@core/schema';
import { BASE_PLATES } from '@core/load';

// Shared BOM-piece naming + extension-set matching. Extracted from
// DeployResolution so the deploy "Review sources" step and the read-only Quick
// View (ShorePointDetail) name a piece identically and match a deployed assembly
// the same way — one source of truth for both.

/** A base plate's catalog name, or the generic fallback. */
export function plateName(id?: string): string {
  return BASE_PLATES.find((p) => p.id === id)?.name ?? 'Base plate';
}

/** The piece's field-readable identity — "LS 406", "12″ extension", "6\" Swivel Base". */
export function pieceIdentity(c: DeployedComponent): string {
  if (c.role === 'strut') return c.model ?? 'Strut';
  if (c.role === 'extension') return `${c.length}″ extension`;
  return plateName(c.plateId);
}

/** True when two extension length lists are the same multiset (order-independent). */
export function sameExtensions(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const x = [...a].sort((m, n) => m - n);
  const y = [...b].sort((m, n) => m - n);
  return x.every((v, i) => v === y[i]);
}
