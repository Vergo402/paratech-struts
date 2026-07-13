import { useMemo } from 'react';
import type { FieldShoreEvent, ShorePoint, WoodSizeId } from '@core/schema';
import { BASE_PLATES, WOOD_SIZES } from '@core/load';
import {
  componentLabel,
  deductionTotalInches,
  deployedRigs,
  effectiveLengthInches,
  hasUntracked,
  isUntracked,
  STATUS_LABELS,
} from '@core/shorepoint';
import { Badge, InchesValue, MeasurementValue, WarningGate, isEighthsExact } from '@ui/primitives';
import { useShorePointHistory } from '@ui/hooks';
import { pieceIdentity } from './pieceIdentity';
import { dateClock } from '../util/time';
import { cardLocation } from './cardParts';
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
  /** Struts ACTUALLY STANDING in this point's group (H1/#415) — the board computes it
   *  from the full shore-point list so the verdict divides the load by the deployed
   *  count, not the planned groupTotal. Omit → planned fallback (shoreSafety's default). */
  deployedCount?: number;
}

// ---- deduction ledger rows (mirror RecommendationCard's fs-rec-ledger) -------
// ponytail: duplicated from RecommendationCard's local woodRow/plateRow rather
// than extracting a shared LedgerSlot — 20 catalog-lookup lines, and extracting
// would couple the detail to the card. Reuse the .fs-rec-* CSS so they read alike.
function woodRow(label: string, id: WoodSizeId) {
  const wood = WOOD_SIZES.find((w) => w.id === id);
  const selected = !!wood && wood.id !== 'none';
  return { label, selected, name: selected ? wood.id.replace('x', '×') : 'not selected', inches: selected ? wood.height : 0 };
}
function plateRow(label: string, id: string) {
  const plate = BASE_PLATES.find((p) => p.id === id);
  const selected = !!plate && plate.id !== 'none';
  // EXACT catalog height — off-grid plates render as decimals so the column foots.
  return { label, selected, name: selected ? plate.name : 'not selected', inches: selected ? plate.height : 0 };
}
function LedgerSlot({ row }: { row: ReturnType<typeof plateRow> }) {
  return (
    <div className={`fs-rec-slot${row.selected ? '' : ' is-ns'}`}>
      <div className="fs-rec-row">
        <span className="fs-rec-slot-label">{row.label}</span>
        {row.selected ? (
          <span className="fs-rec-slot-value">
            <InchesValue inches={-row.inches} />
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

// The one-word safety verdict that leads the strip — carries the determination
// without relying on color (Principle 9). Maps 1:1 to safety.kind; UNVERIFIED is
// visually distinct from SAFE by word AND the absence of the green border.
const SAFETY_WORD = { ok: 'Safe', warn: 'Check', unknown: 'Unverified' } as const;

export function ShorePointDetail({ sp, deployedCount }: ShorePointDetailProps) {
  const { events, deviceUid } = useShorePointHistory(sp.id);

  const bom = sp.deployedBom ?? [];
  const rigs = deployedRigs(sp);

  const where = cardLocation(sp);

  const ledger = [
    woodRow('Header', sp.deductions.headerWood),
    plateRow('Top Connector', sp.deductions.topPlate),
    plateRow('Bottom Connector', sp.deductions.bottomPlate),
    woodRow('Footer', sp.deductions.footerWood),
  ];
  const effectiveEighths = Math.round(effectiveLengthInches(sp) * 8);
  const hasDeductions = deductionTotalInches(sp.deductions) > 0;
  // The exact pre-floor result; the hero/ledger total is its ADR-012 floor. When
  // they differ the ledger shows the floor step so the column foots.
  const exactInches = sp.measurementEighths / 8 - deductionTotalInches(sp.deductions);
  const estLoad = sp.estimatedLoad; // blank renders as "—", not "0 lbs" (undefined ≠ 0)
  // One label for the hero figure AND the ledger's final row, so they agree — and
  // it names the number the ledger actually computes: raw − deductions = the STRUT
  // length needed. Vocabulary matches the S12 §3.2 rename shipped on the Quick Find
  // ledger + Recommendation card. NOT "Set length": that term is the board card's
  // WOOD cut length (cutLengthInches, #361), a different number; reusing it here
  // collided two distinct figures under one word (2026-07-02 audit #8). With no
  // deductions raw == required, so one label holds — and "Raw opening" can't be
  // reused here anyway (it's the ledger's own top row when deductions exist).
  const lengthLabel = 'Required strut length';

  // Safety — a CONFIRMED re-verification, not a guess (decision F). Computed by the
  // shared shoreSafety() helper so the Quick View hero AND the board's verify surface
  // (red edge / banner / Division rail) read identically. Catalog mode (the helper
  // passes no live inventory): a strut's rating is physics — system + length — not a
  // function of what's left in stock, so deploying the LAST unit must not turn a real
  // over-capacity / unrated warning into "not re-verifiable" (2026-07-02 audit; #408/#410).
  const safety = useMemo(() => shoreSafety(sp, deployedCount), [sp, deployedCount]);

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
              {!isEighthsExact(exactInches) && (
                <div className="fs-rec-row fs-rec-floor">
                  <span className="fs-rec-slot-label">Exact — floored to ⅛″</span>
                  <InchesValue inches={exactInches} className="fs-rec-floor-value" />
                </div>
              )}
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

      {/* #441 — the point's radio-callout location: what3words + raw coordinates.
          Only when a fix exists; a point with neither simply has no section. */}
      {(sp.w3w || sp.coords) && (
        <section className="fs-spd-section">
          <h3 className="fs-spd-h">Location</h3>
          <div className="fs-rec-ledger">
            {sp.w3w && (
              <div className="fs-rec-row">
                <span className="fs-rec-slot-label">what3words</span>
                <span className="fs-spd-w3w-words">{'///'}{sp.w3w}</span>
              </div>
            )}
            {sp.coords && (
              <div className="fs-rec-row">
                <span className="fs-rec-slot-label">Coordinates</span>
                <span className="fs-spd-w3w-coords">
                  {sp.coords.lat.toFixed(5)}, {sp.coords.lng.toFixed(5)}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

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
                    {dateClock(e.at)} · {who}
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

      {/* The standing liability disclaimer — the drawer is the one v4 surface that
          states capacity AS A VERDICT (the RecommendationCard's is a pre-deploy
          recommendation), so it carries the same permanent, unsoftened last word
          every recommendation card does (2026-07-02 audit #3). */}
      <WarningGate use="disclaimer" />
    </div>
  );
}
