import { useMemo } from 'react';
import type { FieldShoreEvent, ShorePoint, WoodSizeId } from '@core/schema';
import { BASE_PLATES, WOOD_SIZES } from '@core/load';
import { divisionLabel } from '@core/operation';
import {
  componentLabel,
  deductionTotalInches,
  deployedRigs,
  effectiveLengthInches,
  hasUntracked,
  isUntracked,
  STATUS_LABELS,
} from '@core/shorepoint';
import { Badge, MeasurementValue } from '@ui/primitives';
import { useInventory, useShorePointHistory } from '@ui/hooks';
import { pieceIdentity } from './pieceIdentity';
import { SHORE_TYPE_LABELS } from './ShorePointCard';
import { shoreSafety } from './shoreSafety';

/**
 * ShorePointDetail — the read-only Quick View body for a DEPLOYED shore (ADR-019
 * drawer content; ADR-033 BOM). The full bill of materials with each piece's
 * source + off-book markers, the measurement/deduction ledger, a who-&-when
 * timeline, and a re-verified safety determination. Presentational: every number
 * comes from the same core helpers the card and recommendation use, so the detail
 * never disagrees with the board. Data arrives via @ui/hooks only (boundary).
 */
export interface ShorePointDetailProps {
  sp: ShorePoint;
}

// ---- deduction ledger rows (mirror RecommendationCard's fs-rec-ledger) -------
// ponytail: duplicated from RecommendationCard's local woodRow/plateRow rather
// than extracting a shared LedgerSlot — 20 catalog-lookup lines, and extracting
// would couple the detail to the card. Reuse the .fs-rec-* CSS so they read alike.
function woodRow(label: string, id: WoodSizeId) {
  const wood = WOOD_SIZES.find((w) => w.id === id);
  const selected = !!wood && wood.id !== 'none';
  return { label, selected, name: selected ? wood.id.replace('x', '×') : 'not selected', eighths: selected ? Math.round(wood.height * 8) : 0 };
}
function plateRow(label: string, id: string) {
  const plate = BASE_PLATES.find((p) => p.id === id);
  const selected = !!plate && plate.id !== 'none';
  return { label, selected, name: selected ? plate.name : 'not selected', eighths: selected ? Math.round(plate.height * 8) : 0 };
}
function LedgerSlot({ row }: { row: ReturnType<typeof plateRow> }) {
  return (
    <div className={`fs-rec-slot${row.selected ? '' : ' is-ns'}`}>
      <div className="fs-rec-row">
        <span className="fs-rec-slot-label">{row.label}</span>
        {row.selected ? (
          <span className="fs-rec-slot-value">
            <MeasurementValue eighths={-row.eighths} />
          </span>
        ) : (
          <span className="fs-rec-slot-value fs-rec-ns">N/S</span>
        )}
      </div>
      <span className="fs-rec-slot-name">{row.name}</span>
    </div>
  );
}

// ---- timeline ----------------------------------------------------------------
/** One logged event → a plain-language line, or null for events that don't read
 *  as shore-point history (operation-level events never target an spId anyway). */
function eventLine(e: FieldShoreEvent): string | null {
  switch (e.type) {
    case 'ShorePointAdded':
      return 'Created';
    case 'EquipmentDeployed':
    case 'StrutDeployed':
      return 'Equipment deployed';
    case 'EquipmentReturned':
    case 'StrutReturned':
    case 'EquipmentReclaimed':
      return 'Equipment returned';
    case 'ComponentResourced':
      return 'Component re-sourced';
    case 'ShorePointStatusChanged':
      return STATUS_LABELS[e.to];
    case 'ShorePointEdited':
      return e.patch.cuttingDone === true ? 'Marked cut done' : e.patch.cuttingDone === false ? 'Cleared cut done' : 'Edited';
    case 'ShorePointDeleted':
      return 'Deleted';
    case 'ShorePointRestored':
      return 'Restored';
    default:
      return null;
  }
}

function whenLabel(at: number): string {
  return new Date(at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// The one-word safety verdict that leads the strip — carries the determination
// without relying on color (Principle 9). Maps 1:1 to safety.kind; UNVERIFIED is
// visually distinct from SAFE by word AND the absence of the green border.
const SAFETY_WORD = { ok: 'Safe', warn: 'Check', unknown: 'Unverified' } as const;

export function ShorePointDetail({ sp }: ShorePointDetailProps) {
  const inventory = useInventory();
  const { events, deviceUid } = useShorePointHistory(sp.id);

  const bom = sp.deployedBom ?? [];
  const rigs = deployedRigs(sp);

  const where = [...(sp.building ? [sp.building] : []), divisionLabel(sp.division), ...(sp.area ? [sp.area] : [])].join(' · ');

  const ledger = [
    woodRow('Header', sp.deductions.headerWood),
    plateRow('Top Connector', sp.deductions.topPlate),
    plateRow('Bottom Connector', sp.deductions.bottomPlate),
    woodRow('Footer', sp.deductions.footerWood),
  ];
  const effectiveEighths = Math.round(effectiveLengthInches(sp) * 8);
  const hasDeductions = deductionTotalInches(sp.deductions) > 0;
  const estLoad = sp.estimatedLoad; // blank renders as "—", not "0 lbs" (undefined ≠ 0)
  // One label for the hero figure AND the ledger's final row, so they agree.
  // Secured/returned shores show the as-built "Set length"; with deductions the
  // number is the deducted "Effective length"; with none, raw == effective so it
  // is just the "Opening length" (no twin-number duplicate).
  const lengthLabel =
    sp.status === 'secured' || sp.status === 'returned'
      ? 'Set length'
      : hasDeductions
        ? 'Effective length'
        : 'Opening length';

  // Safety — a CONFIRMED re-verification, not a guess (decision F). The verdict is
  // computed by the shared shoreSafety() helper so the Quick View hero and the
  // board's verify surface (red edge / banner / Division rail) read identically.
  const safety = useMemo(() => shoreSafety(sp, inventory), [sp, inventory]);

  // Only an actual FLAG (over-capacity / unrated) earns a spot in the hero, loud
  // and assertive. A clean pass or an unverifiable read is reference, not an
  // exception — it drops to the bottom of the panel (Alex). Surface the exception,
  // not the non-event.
  const safetyFlagged = safety.kind === 'warn';

  return (
    <div className="fs-spd">
      {/* HERO — the 2-second answer: where · status · the one length number · is it safe */}
      <section className="fs-spd-hero">
        <div className="fs-spd-hero-top">
          <p className="fs-spd-where">{where || SHORE_TYPE_LABELS[sp.shoreType]}</p>
          <Badge variant="status" status={sp.status} />
        </div>
        {sp.assignedResource && (
          <p className="fs-spd-assigned">
            <span className="fs-spd-assigned-label">Assigned</span> {sp.assignedResource}
          </p>
        )}
        <div className="fs-spd-hero-figure">
          <span className="fs-spd-hero-cap">{lengthLabel}</span>
          <MeasurementValue eighths={effectiveEighths} className="fs-spd-hero-num" />
        </div>
        {/* Only a FLAG rides in the hero — loud + role=alert. The leading word
            carries the verdict without color (Principle 9). Clean/unverifiable
            reads drop to the bottom Safety section. */}
        {safetyFlagged && (
          <p className={`fs-spd-safety fs-spd-safety--${safety.kind}`} role="alert">
            <span className="fs-spd-safety-word">{SAFETY_WORD[safety.kind]}</span>
            {safety.msg}
          </p>
        )}
      </section>

      {/* Measurement & deduction ledger — the math behind the hero number */}
      <section className="fs-spd-section">
        <h3 className="fs-spd-h">Measurement &amp; load</h3>
        <div className="fs-rec-ledger">
          {hasDeductions && (
            <>
              <div className="fs-rec-row">
                <span className="fs-rec-slot-label">Raw opening</span>
                <MeasurementValue eighths={sp.measurementEighths} className="fs-rec-opening" />
              </div>
              {ledger.map((row) => (
                <LedgerSlot key={row.label} row={row} />
              ))}
            </>
          )}
          <div className="fs-rec-row fs-rec-effective-row">
            <span className="fs-rec-slot-label">{lengthLabel}</span>
            <MeasurementValue eighths={effectiveEighths} className="fs-rec-effective" />
          </div>
          <div className="fs-rec-row">
            <span className="fs-rec-slot-label">Estimated load</span>
            <span className="fs-rec-opening">{estLoad != null ? `${estLoad.toLocaleString()} lbs` : '—'}</span>
          </div>
        </div>
      </section>

      {/* Bill of materials — the single canonical home for the strut model */}
      <section className="fs-spd-section">
        <h3 className="fs-spd-h">Bill of materials</h3>
        {bom.length === 0 ? (
          <p className="fs-spd-empty">No equipment on record.</p>
        ) : (
          <>
            <ul className="fs-resolve-list">
              {bom.map((c, i) => (
                <li key={i} className="fs-resolve-piece">
                  <div className="fs-resolve-piece-head">
                    <span className="fs-resolve-piece-kind">{componentLabel(c)}</span>
                    <span className="fs-resolve-piece-id">{pieceIdentity(c)}</span>
                  </div>
                  {isUntracked(c) ? (
                    <p className="fs-resolve-piece-offbook">Off-book — not drawn from stock</p>
                  ) : (
                    <p className="fs-resolve-piece-src">{c.source}</p>
                  )}
                </li>
              ))}
            </ul>
            {rigs.length > 0 && (
              <p className="fs-spd-rollup">
                {rigs.length === 1 ? `All tracked pieces on ${rigs[0]}` : `Sourced from ${rigs.join(', ')}`}
                {hasUntracked(sp) ? ' · includes off-book pieces' : ''}
              </p>
            )}
          </>
        )}
      </section>

      {/* Timeline — the audit trail, quietest, last */}
      <section className="fs-spd-section">
        <h3 className="fs-spd-h">Timeline</h3>
        {events.length === 0 ? (
          <p className="fs-spd-empty">No history yet.</p>
        ) : (
          <ul className="fs-spd-timeline">
            {events.map((e) => {
              const label = eventLine(e);
              if (!label) return null;
              const who = deviceUid === undefined ? '—' : e.by === deviceUid ? 'this device' : 'another device';
              return (
                <li key={e.id} className="fs-spd-event">
                  <span className="fs-spd-event-label">{label}</span>
                  <span className="fs-spd-event-meta">
                    {whenLabel(e.at)} · {who}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Safety — at the bottom UNLESS flagged (a flag rides in the hero, above).
          A clean pass / unverifiable read is reference, kept quiet here, no alert. */}
      {!safetyFlagged && (
        <section className="fs-spd-section">
          <h3 className="fs-spd-h">Safety</h3>
          <p className={`fs-spd-safety fs-spd-safety--${safety.kind}`}>
            <span className="fs-spd-safety-word">{SAFETY_WORD[safety.kind]}</span>
            {safety.msg}
          </p>
        </section>
      )}
    </div>
  );
}
