import { useMemo, useState } from 'react';
import type { ShorePoint, ShorePointStatus } from '@core/schema';
import { STATUS_ORDER, STATUS_LABELS } from '@core/shorepoint';
import { rollupByDivision, type RollupRow } from '@core/command/sitstat-rollup';
import { useShorePoints } from '@ui/hooks';
import { SHORE_TYPE_LABELS } from '@ui/operations/ShorePointCard';
import { AlertIcon, CaretIcon } from './icons';

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
      <tr className={`fs-rollup-row${lagging ? ' is-lagging' : ''}${expandable ? ' is-expandable' : ''}`}>
        <th scope="row" className="fs-rollup-div">
          {expandable ? (
            <button type="button" className="fs-rollup-divbtn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              <CaretIcon open={open} />
              {lagging && (
                <span className="fs-rollup-alert" aria-label="Most points awaiting equipment" title="Most points awaiting equipment">
                  <AlertIcon />
                </span>
              )}
              <span className="fs-rollup-divname">{row.label}</span>
            </button>
          ) : (
            <span className="fs-rollup-divname">
              {lagging && (
                <span className="fs-rollup-alert" aria-label="Most points awaiting equipment" title="Most points awaiting equipment">
                  <AlertIcon />
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
              {/* Status color dots (#434) — the 150-char abbreviation legend is gone;
                  the dot carries the column identity (title + sr-only name keep it
                  accessible), matching the status board's color keys beside it. */}
              {STATUS_ORDER.map((s) => (
                <th key={s} scope="col" className={`fs-rollup-colhead col-${s}`} title={STATUS_LABELS[s]}>
                  <span className={`fs-rollup-dot is-${s}`} aria-hidden="true" />
                  <span className="fs-sr-only">{STATUS_LABELS[s]}</span>
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
    </div>
  );
}
