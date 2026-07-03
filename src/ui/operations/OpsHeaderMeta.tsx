import { useElapsed } from '@ui/command';

/**
 * The Operations header instrument line + role pill (tri-view prototype look,
 * Alex 2026-07-02). All values are reused from existing state — no new store.
 * The pill is persona-split: the phone floor-inputter sees their OWN role
 * ("YOU · RUNNER"); the desktop command post sees the incident commander
 * ("IC · BC Reyes"). The elapsed clock lives in this small leaf so its 1 Hz tick
 * re-renders only the meta line, not the whole board (useElapsed's discipline).
 */

export interface OpsMetaLineProps {
  /** Op start (epoch ms) for the elapsed clock — operation.periods[0]?.startedAt. */
  since: number | undefined;
  opNum: number;
  opTotal: number;
  /** Incident commander display label, or null when the IC node is unstaffed. */
  icLabel: string | null;
  points: number;
  crews: number;
  isDesktop: boolean;
}

/** The mono, muted instrument line under the op name. Segments with no data drop out. */
export function OpsMetaLine({ since, opNum, opTotal, icLabel, points, crews, isDesktop }: OpsMetaLineProps) {
  const elapsed = useElapsed(since);
  const segs: string[] = [];
  if (since != null) segs.push(elapsed);
  if (opTotal > 0) segs.push(`OP ${opNum}/${opTotal}`);
  if (icLabel) segs.push(icLabel);
  segs.push(`${points} ${points === 1 ? 'point' : 'points'}`);
  if (isDesktop && crews > 0) segs.push(`${crews} ${crews === 1 ? 'crew' : 'crews'}`);
  return <p className="fs-ops-meta">{segs.join(' · ')}</p>;
}

export interface HeaderPillProps {
  isDesktop: boolean;
  /** Incident commander label (desktop pill). */
  icLabel: string | null;
  /** This device's declared role title (phone pill). */
  myRoleTitle: string | null;
  /** Open the declare-role sheet when the phone pill has no role yet. */
  onSetRole: () => void;
}

/** The gold header pill — IC on desktop, YOUR role on phone. */
export function HeaderPill({ isDesktop, icLabel, myRoleTitle, onSetRole }: HeaderPillProps) {
  if (isDesktop) {
    if (!icLabel) return null;
    return (
      <span className="fs-ops-pill">
        <span className="fs-ops-pill-dot" aria-hidden="true" />
        <span className="fs-ops-pill-k">IC</span>
        <b className="fs-ops-pill-v">{icLabel}</b>
      </span>
    );
  }
  if (myRoleTitle) {
    return (
      <span className="fs-ops-pill">
        <span className="fs-ops-pill-dot" aria-hidden="true" />
        <span className="fs-ops-pill-k">You</span>
        <b className="fs-ops-pill-v">{myRoleTitle}</b>
      </span>
    );
  }
  // No role declared → a quiet tap-to-set that opens the existing MyRoleSheet.
  return (
    <button type="button" className="fs-ops-pill fs-ops-pill--set" onClick={onSetRole}>
      <span className="fs-ops-pill-dot is-empty" aria-hidden="true" />
      Set role
    </button>
  );
}
