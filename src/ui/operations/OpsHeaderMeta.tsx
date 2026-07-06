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
  points: number;
  crews: number;
  isDesktop: boolean;
}

/** One stat-strip figure: dominant numeral over a micro-label (craft.md §1–2). */
function Stat({ v, k }: { v: string; k: string }) {
  return (
    <span className="fs-ops-stat">
      <span className="fs-ops-stat-v">{v}</span>
      <span className="fs-ops-stat-k">{k}</span>
    </span>
  );
}

/** The stat strip under the op name (craft.md §2 — was a 7-datum mono line, #432):
 *  each figure a quiet dominant numeral with its own micro-label. The IC label is
 *  NOT a figure — it stays in the header pill. Segments with no data drop out. */
export function OpsMetaLine({ since, opNum, opTotal, points, crews, isDesktop }: OpsMetaLineProps) {
  const elapsed = useElapsed(since);
  return (
    <div className="fs-ops-stats">
      {since != null && <Stat v={elapsed} k="elapsed" />}
      {opTotal > 0 && <Stat v={opTotal > 1 ? `${opNum}/${opTotal}` : String(opNum)} k="period" />}
      <Stat v={String(points)} k={points === 1 ? 'point' : 'points'} />
      {isDesktop && crews > 0 && <Stat v={String(crews)} k={crews === 1 ? 'crew' : 'crews'} />}
    </div>
  );
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

/** The header chip — IC on desktop, YOUR role on phone. Quiet ink on the chrome
 *  surface (#432): a permanent readout never spends the gold budget (craft.md §5). */
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
