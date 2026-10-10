import { useMemo } from 'react';
import type { ShorePoint } from '@core/schema';
import { deployedRigs } from '@core/shorepoint';

// The End Operation confirm's equipment section (#499), shared by BOTH end paths
// (OperationsBoard + EndOperationButton): the existing warning that shore points still
// hold equipment (non-blocking — the IC may close anyway) and the explicit "All equipment
// is back on the rigs" checkbox. Checked → the OperationEnded event carries
// `stockReleased: true`, which releases every hold the ended op still has on stock.
// Unchecked (the default) → the holds stay, so a closed op can't silently re-credit units
// that are still out on a shore.

/** Shore points whose equipment is still out (deployed, not Returned) at close, grouped by
 *  the rig it was pulled from — sorted by rig name. Empty → nothing held. */
export function useStillDeployed(shorePoints: readonly ShorePoint[]): { total: number; byRig: Array<[string, number]> } {
  return useMemo(() => {
    const m = new Map<string, number>();
    let total = 0;
    for (const sp of shorePoints) {
      if (sp.deletedAt != null || !sp.deployedBom || sp.status === 'returned') continue;
      total++;
      for (const rig of deployedRigs(sp)) m.set(rig, (m.get(rig) ?? 0) + 1);
    }
    return { total, byRig: [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])) };
  }, [shorePoints]);
}

/** The event extras for OperationEnded — `stockReleased` only when checked (RTDB rejects undefined). */
export function stockReleasedExtra(released: boolean): { stockReleased?: true } {
  return released ? { stockReleased: true } : {};
}

interface EndOperationHoldsProps {
  total: number;
  byRig: Array<[string, number]>;
  released: boolean;
  onReleasedChange: (released: boolean) => void;
}

export function EndOperationHolds({ total, byRig, released, onReleasedChange }: EndOperationHoldsProps) {
  if (total === 0) return null;
  return (
    <>
      <p className="fs-endop-warning" role="alert">
        {total} shore {total === 1 ? 'point' : 'points'} still hold equipment —{' '}
        {byRig.map(([rig, count], i) => (
          <span key={rig}>
            {i > 0 ? ', ' : ''}
            {rig} <span className="fs-endop-warning-count">({count})</span>
          </span>
        ))}
      </p>
      <label className="fs-endop-release">
        <input type="checkbox" checked={released} onChange={(e) => onReleasedChange(e.target.checked)} />
        <span>All equipment is back on the rigs</span>
      </label>
    </>
  );
}
