import { useState } from 'react';
import { BASE_PLATES, WOOD_SIZES, sysKeyOf, type StrutCombination } from '@core/load';
import type { Deductions, WoodSizeId } from '@core/schema';
import { Button, Card, MeasurementValue, WarningGate, eighthsToParts } from '@ui/primitives';

/**
 * RecommendationCard — the result card (card.md §RecommendationCard; restyled
 * S12 §3). A centered identity header — system word + model, the connectors
 * line, apparatus, location — with the fit badge absolutely top-right (the
 * gated danger tell, #40). Then the extension block, the rigid deduction
 * ledger (Raw opening − deductions = Required strut length), Deploy, and a
 * QUIET rated-capacity footer demoted below the action (synthesis §3.4 — the
 * number is computed by the engine but never leads the card). Safety
 * disclosures ride the card as warning gates and never auto-dismiss: unrated
 * gates Deploy behind an explicit acknowledgment; over-capacity closes the
 * deploy path outright (#40 distinct danger treatment); the liability
 * disclaimer is permanent and always the card's last word.
 *
 * Deliberately a DIFFERENT component from ShorePointCard (Principle 12 —
 * collapsing them is the predicted tear, card.md anti-patterns). The centered
 * header is the deliberate visual split from the left-aligned ShorePointCard.
 */
export interface RecommendationCardProps {
  combo: StrutCombination;
  /** The SP's deduction SELECTIONS — names for the ledger sub-lines + the connectors line (combo.deductions is numeric-only). */
  deductions: Deductions;
  /** Apparatus the strut comes from. Operation mode only — Quick Find omits it. */
  source?: string;
  /** Shore-point identity/location (division · building · area). Operation mode only — optional. */
  location?: string;
  /** Operation mode: Deploy commits. Absent = Quick Find display-only card. */
  onDeploy?: (combo: StrutCombination) => void | Promise<void>;
  /** Sheet-level single-flight lock while a deploy is in flight. */
  deployDisabled?: boolean;
}

/** Face identity word — keyed off the strut SYSTEM, not its color: a LockStroke
 *  strut is physically grey but earns its own cyan word (S12 §3.1). */
const SYS_WORD = { gold: 'Gold', grey: 'Grey', lockstroke: 'LockStroke' } as const;

/** "LS 203" or "LS 203 + 12″" — the deployed-strut identity string (card.md cradle-to-grave). */
export function comboModel(combo: StrutCombination): string {
  if (combo.extensions.length === 0) return combo.strut.model;
  return `${combo.strut.model} + ${combo.extensions.map((e) => `${e}″`).join(' + ')}`;
}

/** The selected top/bottom connector NAMES (as catalogued), top first; empty when
 *  neither plate is selected (S12 §3.1). Each is rendered as a whole, readable unit
 *  — the card lays the pair on one line, or splits top/bottom across two (#248). */
function connectorSpecs(deductions: Deductions): string[] {
  return [deductions.topPlate, deductions.bottomPlate]
    .map((id) => BASE_PLATES.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p && p.id !== 'none')
    .map((p) => p.name);
}

// ---- Ledger rows ------------------------------------------------------------

function woodRow(label: string, id: WoodSizeId) {
  const wood = WOOD_SIZES.find((w) => w.id === id);
  const selected = wood && wood.id !== 'none';
  return { label, selected, name: selected ? wood.id.replace('x', '×') : 'not selected', eighths: selected ? Math.round(wood.height * 8) : 0 };
}

function plateRow(label: string, id: string) {
  const plate = BASE_PLATES.find((p) => p.id === id);
  const selected = plate && plate.id !== 'none';
  return {
    label,
    selected,
    name: selected ? plate.name : 'not selected',
    // Plate heights display to the nearest ⅛″; the exact spec is used in the math (ADR-012).
    eighths: selected ? Math.round(plate.height * 8) : 0,
  };
}

function LedgerSlot({ row }: { row: ReturnType<typeof plateRow> | ReturnType<typeof woodRow> }) {
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

// ---- Card -------------------------------------------------------------------

export function RecommendationCard({
  combo,
  deductions,
  source,
  location,
  onDeploy,
  deployDisabled,
}: RecommendationCardProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const gated = !!combo.unrated || !!combo.exceedsCapacity;
  const color = combo.strut.color; // 'gold' | 'grey' — physical field-ID, not lifecycle status
  // Identity keys off the SYSTEM: LockStroke struts are grey-colored but carry
  // their own cyan word + stripe (sysKeyOf in struts.ts — every lk-* is color:'grey').
  const sys = sysKeyOf(combo.strut.system, color);
  const word = SYS_WORD[sys];
  const model = comboModel(combo);
  const specs = connectorSpecs(deductions);

  // Fixed physical order — Header → Top Connector → Bottom Connector → Footer.
  // Never reorder (card.md: top of the assembly to the bottom).
  const slots = [
    woodRow('Header', deductions.headerWood),
    plateRow('Top Connector', deductions.topPlate),
    plateRow('Bottom Connector', deductions.bottomPlate),
    woodRow('Footer', deductions.footerWood),
  ];
  const effectiveEighths = Math.round(combo.effectiveLength * 8);
  const openingEighths = Math.round(combo.openingLength * 8);

  // Rated capacity is the QUIET footer (synthesis §3.4): the engine's per-strut
  // rating at the effective length (conservative-floor row, the caller's 4:1 SP
  // index). Shown only on a clean card — a gated card has no honest number to
  // print (0 for unrated; the per-strut best is meaningless once load exceeds
  // 4-strut capacity).
  const capLb = Math.floor(combo.capacity);
  const showCapacity = capLb > 0 && !combo.unrated && !combo.exceedsCapacity;

  // Full strut identity in the button's accessible name (workflow #221 §Accessibility).
  const fx = eighthsToParts(effectiveEighths);
  const deploySrLabel = `Deploy ${model}, ${color} ${combo.strut.system}, effective ${fx.totalInches}${
    fx.n > 0 ? ` and ${fx.n}/${fx.d}` : ''
  } inches${source ? `, from ${source}` : ''}`;

  const deployBlocked = !!combo.exceedsCapacity;
  const needsAck = !!combo.unrated && !acknowledged;

  return (
    <Card
      className={`fs-rec fs-rec--${sys}${gated ? ' is-gated' : ''}`}
      edge={<span className="fs-rec-bar" aria-hidden="true" />}
    >
      <div className="fs-rec-header">
        <div className="fs-rec-headcol">
          <p className="fs-rec-identity">
            <b>{word}</b> · {model}
          </p>
          {specs.length > 0 && (
            <p className="fs-rec-connectors">
              {specs.map((name, i) => (
                <span key={i} className="fs-rec-conn">
                  {name}
                </span>
              ))}
            </p>
          )}
          {source && <p className="fs-rec-apparatus">Equipment located on: {source}</p>}
          {location && <p className="fs-rec-loc">{location}</p>}
        </div>
        {/* Badge only on a gated card — the #40 danger tell. A clean recommendation
            needs no "Fits" flag: being recommended IS fitting (#248). */}
        {gated && (
          <span className="fs-rec-fit fs-rec-fit--no">
            {combo.exceedsCapacity ? 'Over capacity' : 'Unrated'}
          </span>
        )}
      </div>

      {combo.extensions.length === 0 ? (
        <p className="fs-rec-noext">No extensions needed</p>
      ) : (
        /* Design-system ext anatomy: the [+] accent tile + added length + the
           reach note (bare strut reach vs assembly reach) — replaces the chip
           row. "What extra tube to grab", stated in plain reach numbers. */
        <div className="fs-rec-ext">
          <span className="fs-rec-ext-tile" aria-hidden="true">
            +
          </span>
          <div className="fs-rec-ext-amt">
            <span className="fs-rec-ext-len">
              {combo.extensions.map((e, i) => (
                <span key={i}>
                  {i > 0 && ' + '}
                  <MeasurementValue eighths={e * 8} />
                </span>
              ))}
            </span>
            <span className="fs-rec-ext-word">
              {combo.extensions.length > 1 ? 'extensions' : 'extension'}
            </span>
          </div>
          <p className="fs-rec-ext-note">
            {combo.strut.model} alone reaches <MeasurementValue eighths={combo.strut.extended * 8} /> — extension
            takes the assembly to <MeasurementValue eighths={(combo.strut.extended + combo.extTotal) * 8} />
          </p>
        </div>
      )}

      <div className="fs-rec-ledger">
        <div className="fs-rec-row">
          <span className="fs-rec-slot-label">Raw opening</span>
          <MeasurementValue eighths={openingEighths} className="fs-rec-opening" />
        </div>
        {slots.map((row) => (
          <LedgerSlot key={row.label} row={row} />
        ))}
        <div className="fs-rec-row fs-rec-effective-row">
          <span className="fs-rec-slot-label">Required strut length</span>
          <MeasurementValue eighths={effectiveEighths} className="fs-rec-effective" />
        </div>
      </div>

      {combo.boundaryWarning === 'fully-extended' && (
        <p className="fs-rec-caution">
          <strong>Fully extended — zero margin.</strong> Strut is at its maximum reach ({combo.adjExtended}″). No room
          to compensate if the opening grows.
        </p>
      )}

      {combo.unrated && (
        <>
          <WarningGate use="unrated" acknowledged={acknowledged} onAcknowledge={() => setAcknowledged((a) => !a)} />
          {combo.unratedReason && <p className="fs-rec-gate-detail">{combo.unratedReason}</p>}
        </>
      )}
      {combo.exceedsCapacity && (
        <>
          <WarningGate use="over-capacity" />
          {combo.exceedsCapacityReason && <p className="fs-rec-gate-detail">{combo.exceedsCapacityReason}</p>}
        </>
      )}

      {onDeploy && (
        <Button
          variant="primary"
          fullWidth
          disabled={deployBlocked || needsAck || !!deployDisabled}
          disabledReason={needsAck && !deployBlocked && !deployDisabled ? 'Acknowledge the unrated zone first' : undefined}
          onPress={() => onDeploy(combo)}
        >
          Deploy
          <span className="fs-sr-only">{deploySrLabel.slice('Deploy'.length)}</span>
        </Button>
      )}

      {showCapacity && (
        <div className="fs-rec-cap">
          <span className="fs-rec-cap-label">
            Rated capacity at <MeasurementValue eighths={effectiveEighths} />
          </span>
          <span className="fs-rec-cap-val">{capLb.toLocaleString('en-US')} lb</span>
        </div>
      )}

      <WarningGate use="disclaimer" />
    </Card>
  );
}
