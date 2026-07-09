import { useElapsed } from '@ui/command';
import { StatStrip, type Stat } from '@ui/primitives';

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

/** The stat strip under the op name (craft.md §2 — was a 7-datum mono line, #432):
 *  each figure a quiet dominant numeral with its own caption. The IC label is NOT a
 *  figure — it stays in the header pill. Segments with no data drop out. Renders
 *  through the shared StatStrip primitive (unified with Command 2026-07-08). */
export function OpsMetaLine({ since, opNum, opTotal, points, crews, isDesktop }: OpsMetaLineProps) {
  const elapsed = useElapsed(since);
  const stats: Stat[] = [];
  if (since != null) stats.push({ value: elapsed, label: 'elapsed' });
  if (opTotal > 0) stats.push({ value: opTotal > 1 ? `${opNum}/${opTotal}` : String(opNum), label: 'period' });
  stats.push({ value: String(points), label: points === 1 ? 'point' : 'points' });
  if (isDesktop && crews > 0) stats.push({ value: String(crews), label: crews === 1 ? 'crew' : 'crews' });
  return <StatStrip stats={stats} className="fs-ops-metastrip" />;
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
