import { useMemo, useState } from 'react';
import type { ShorePoint, ShorePointStatus } from '@core/schema';
import { STATUS_ORDER, STATUS_LABELS } from '@core/shorepoint';
import { rollupByDivision, type RollupRow } from '@core/command/sitstat-rollup';
import { useShorePoints } from '@ui/hooks';
import { SHORE_TYPE_LABELS } from '@ui/operations/ShorePointCard';

// Abbreviated column headers — the full STATUS_LABELS words are too wide for a
// 7-column table at phone width, so the header row uses these and a one-line
// legend maps each abbreviation back to its full label (below the table).
const STATUS_ABBR: Record<ShorePointStatus, string> = {
  pending: 'Pend',
  process: 'Assign',
  strutset: 'Set',
  cutting: 'Cut',
  runner: 'Run',
  secured: 'Secured',
  returned: "Ret'd",
};

const LEGEND = STATUS_ORDER.map((s) => `${STATUS_ABBR[s]} = ${STATUS_LABELS[s]}`).join(' · ');

function CountCells({ counts, colored }: { counts: Record<ShorePointStatus, number>; colored?: boolean }) {
  return (
    <>
      {STATUS_ORDER.map((s) => (
        <td
          key={s}
          className={`fs-rollup-cell${colored ? ` col-${s}` : ''}`}
          data-zero={counts[s] === 0 || undefined}
        >
          {counts[s]}
        </td>
      ))}
    </>
  );
}

function DivisionRow({ row, lagging }: { row: RollupRow; lagging: boolean }) {
  const [open, setOpen] = useState(false);
  const expandable = row.groups.length > 0;
  return (
    <>
      <tr
        className={`fs-rollup-row${lagging ? ' is-lagging' : ''}${expandable ? ' is-expandable' : ''}`}
        aria-expanded={expandable ? open : undefined}
      >
        <th scope="row" className="fs-rollup-div">
          {expandable ? (
            <button type="button" className="fs-rollup-divbtn" onClick={() => setOpen((v) => !v)}>
              <span className="fs-rollup-caret" aria-hidden="true">
                {open ? '▾' : '▸'}
              </span>
              {lagging && (
                <span className="fs-rollup-alert" aria-label="Most points awaiting equipment" title="Most points awaiting equipment">
                  ⚠
                </span>
              )}
              <span className="fs-rollup-divname">{row.label}</span>
            </button>
          ) : (
            <span className="fs-rollup-divname">
              {lagging && (
                <span className="fs-rollup-alert" aria-label="Most points awaiting equipment" title="Most points awaiting equipment">
                  ⚠
                </span>
              )}
              {row.label}
            </span>
          )}
        </th>
        <CountCells counts={row.counts} />
        <td className="fs-rollup-cell fs-rollup-total">{row.total}</td>
      </tr>
      {open &&
        row.groups.map((g) => (
          <tr key={g.key} className="fs-rollup-subrow">
            <th scope="row" className="fs-rollup-grouplabel">
              {g.label}
            </th>
            <CountCells counts={g.counts} />
            <td className="fs-rollup-cell fs-rollup-total">{g.total}</td>
          </tr>
        ))}
    </>
  );
}

/**
 * The By-Division roll-up table (#353) — one row per Division (top-floor-first),
 * a 7-status grid + Total, a bottom "All divisions" totals row, and the lagging
 * Division flagged. Each Division row taps open to its grouped shores. Pure
 * display of the active shore points; the aggregation is core/command. Rendered
 * inline in the command rail on desktop and inside a Sheet on phone.
 */
export function SitStatRollup() {
  const shorePoints = useShorePoints();
  const rollup = useMemo(
    () => rollupByDivision(shorePoints, (sp: ShorePoint) => SHORE_TYPE_LABELS[sp.shoreType]),
    [shorePoints],
  );

  if (rollup.rows.length === 0) {
    return <p className="fs-rollup-empty">No shore points yet.</p>;
  }

  return (
    <div className="fs-rollup">
      <div className="fs-rollup-scroll">
        <table className="fs-rollup-table">
          <caption className="fs-rollup-caption">Shore points by Division and status</caption>
          <thead>
            <tr>
              <th scope="col" className="fs-rollup-corner">
                Division
              </th>
              {STATUS_ORDER.map((s) => (
                <th key={s} scope="col" className={`fs-rollup-colhead col-${s}`} title={STATUS_LABELS[s]}>
                  {STATUS_ABBR[s]}
                </th>
              ))}
              <th scope="col" className="fs-rollup-colhead">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rollup.rows.map((row) => (
              <DivisionRow key={row.division} row={row} lagging={row.division === rollup.laggingDivision} />
            ))}
          </tbody>
          <tfoot>
            <tr className="fs-rollup-row fs-rollup-allrow">
              <th scope="row" className="fs-rollup-div">
                <span className="fs-rollup-divname">All divisions</span>
              </th>
              <CountCells counts={rollup.totals} colored />
              <td className="fs-rollup-cell fs-rollup-total">{rollup.grandTotal}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="fs-rollup-legend">{LEGEND}</p>
    </div>
  );
}
