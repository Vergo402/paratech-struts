import { useEffect, useRef, useState } from 'react';
import type { ShorePoint } from '@core/schema';

/**
 * #435 delete fade-out. When a Pending shore point is soft-deleted, its card
 * should fade OUT of its lane rather than snap. Delete is Pending-only and only
 * ever sets `deletedAt`, so this is scoped to genuine deletes — never a status
 * advance (which changes `status`, not `deletedAt`).
 *
 * A "ghost" is the departing point with `deletedAt` nulled (so it renders as a
 * normal pending card) plus a `__leaving` marker the lane reads to fade the
 * card's wrapper. Detection happens DURING render (the documented "adjust state
 * when a prop changes" pattern) so the ghost is present the same commit the real
 * point leaves — the card keeps its key, never unmounts, and does not re-trigger
 * its enter-fade. Under reduced motion no ghost is created (instant removal).
 */
export type GhostPoint = ShorePoint & { __leaving: true };

/** True when a point rendered in a lane is a fading delete ghost. */
export function isLeaving(sp: ShorePoint): boolean {
  return (sp as Partial<GhostPoint>).__leaving === true;
}

const EXIT_MS = 200; // outlast --motion-exit (180ms) before dropping the ghost

export function useDeleteGhosts(shorePoints: ShorePoint[]): GhostPoint[] {
  const [prev, setPrev] = useState(shorePoints);
  const [ghosts, setGhosts] = useState<GhostPoint[]>([]);
  const timed = useRef<Set<string>>(new Set());

  if (shorePoints !== prev) {
    const reduce =
      typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const fresh: GhostPoint[] = [];
    if (!reduce) {
      const now = new Map(shorePoints.map((s) => [s.id, s]));
      for (const p of prev) {
        const c = now.get(p.id);
        if (p.deletedAt == null && p.status === 'pending' && c && c.deletedAt != null) {
          fresh.push({ ...p, deletedAt: undefined, __leaving: true });
        }
      }
    }
    setPrev(shorePoints);
    if (fresh.length) {
      setGhosts((g) => {
        const have = new Set(g.map((x) => x.id));
        const add = fresh.filter((x) => !have.has(x.id));
        return add.length ? [...g, ...add] : g;
      });
    }
  }

  useEffect(() => {
    for (const gh of ghosts) {
      if (timed.current.has(gh.id)) continue;
      timed.current.add(gh.id);
      window.setTimeout(() => {
        setGhosts((g) => g.filter((x) => x.id !== gh.id));
        timed.current.delete(gh.id);
      }, EXIT_MS);
    }
  }, [ghosts]);

  return ghosts;
}
