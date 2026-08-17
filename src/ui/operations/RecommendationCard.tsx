import { useState } from 'react';
import { BASE_PLATES, WOOD_SIZES, sysKeyOf, type StrutCombination } from '@core/load';
import type { Deductions, ShoreTypeId, WoodSizeId } from '@core/schema';
import { SHORE_TYPE_FOR_STRUTS, deductionTotalInches, strutsNeededFor, type BomSourceStatus } from '@core/shorepoint';
import { Button, Card, InchesValue, MeasurementValue, WarningGate, eighthsToParts, isEighthsExact } from '@ui/primitives';
import { SHORE_TYPE_LABELS } from './ShorePointCard';
import { SYSTEM_LABELS } from '../inventory/systemLabels';

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
  /** Operation/deploy mode — stock readiness of the full assembly (strut + plates
   *  + extensions): complete / cross-truck / missing. Shown as a chip so the
   *  officer picks with eyes open (ADR-033 decisions 5–6). Absent in Quick Find. */
  stock?: BomSourceStatus;
  /** Sheet-level single-flight lock while a deploy is in flight. */
  deployDisabled?: boolean;
  /** The shore's planning load (lbs). With it the card judges whether ONE strut's
   *  share fits the rating — the ×N struts-needed tell (accepted mockup 2026-07-01). */
  estimatedLoad?: number;
  /** Struts the shore currently has (groupTotal; 1 for a T-Shore / Quick Find). */
  currentStruts?: number;
  /** The one-tap fix: convert the shore to the type that carries the needed strut
   *  count and deploy every member (the "Add N more struts" primary). Absent →
   *  the card offers only the acknowledged short deploy. */
  onAddStruts?: (combo: StrutCombination, targetType: ShoreTypeId, targetTotal: number) => void;
  /** 'calculator' (#433, Quick Find): the COMPACT card — stripe + model-with-
   *  extension headline + connectors + quiet capacity; NO deduction ledger (the
   *  shared math lives once in the sheet's stat strip). Safety tells (unrated /
   *  over-capacity / ×N struts-needed / disclaimer) render unchanged. Default
   *  'deploy' keeps the full Operations card. */
  variant?: 'deploy' | 'calculator';
}


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
  return { label, selected, name: selected ? wood.id.replace('x', '×') : 'not selected', inches: selected ? wood.height : 0 };
}

function plateRow(label: string, id: string) {
  const plate = BASE_PLATES.find((p) => p.id === id);
  const selected = plate && plate.id !== 'none';
  return {
    label,
    selected,
    name: selected ? plate.name : 'not selected',
    // EXACT catalog height — off-grid plates (most of O&M Table 2-1) render as
    // decimals so the ledger column foots against the floored total.
    inches: selected ? plate.height : 0,
  };
}

function LedgerSlot({ row }: { row: ReturnType<typeof plateRow> | ReturnType<typeof woodRow> }) {
  return (
    <div className={`fs-rec-slot${row.selected ? '' : ' is-ns'}`}>
      <div className="fs-rec-row">
        <span className="fs-rec-slot-label">{row.label}</span>
        {row.selected ? (
          <span className="fs-rec-slot-value">
            <InchesValue inches={-row.inches} />
          </span>
        ) : (
          <span className="fs-rec-slot-value fs-rec-ns">Not recorded</span>
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
  stock,
  deployDisabled,
  estimatedLoad,
  currentStruts,
  onAddStruts,
  variant = 'deploy',
}: RecommendationCardProps) {
  // #456 — the acknowledgment is given for ONE risk picture. The sheet keys these
  // cards only on the strut/extension identity, so a peer edit of the load,
  // measurement, or deductions while the sheet is open re-renders the SAME card with
  // a different risk and would leave the old ack standing — a recorded acknowledgment
  // for a warning nobody was shown. Build the signature from RAW props only (never the
  // derived flags below) and reset during render, not in an effect: an effect fires
  // after paint, leaving one frame in which a stale ack could unlock Deploy.
  const riskKey = [
    combo.strut.model,
    combo.extensions.join('+'),
    combo.openingLength,
    combo.effectiveLength,
    combo.capacity,
    combo.unrated,
    combo.exceedsCapacity,
    estimatedLoad,
    currentStruts,
    // Value-keyed, not identity-keyed: the parent rebuilds this object each render.
    deductions.headerWood,
    deductions.footerWood,
    deductions.topPlate,
    deductions.bottomPlate,
  ].join('|');
  const [acknowledged, setAcknowledged] = useState(false);
  const [ackedRiskKey, setAckedRiskKey] = useState(riskKey);
  if (ackedRiskKey !== riskKey) {
    setAckedRiskKey(riskKey);
    setAcknowledged(false);
  }

  // Per-strut over-capacity (accepted mockup 2026-07-01): the engine returns 2–4-
  // strut combos unflagged (recommendedQty is advisory), but this card deploys ONE
  // strut per point — so judge the load against the struts the shore actually has.
  // Mutually exclusive with unrated (capacity 0) and exceeds-4 (no real combo).
  const struts = currentStruts ?? 1;
  const needed =
    combo.unrated || combo.exceedsCapacity ? struts : strutsNeededFor(estimatedLoad ?? 0, combo.capacity);
  const shortDeploy = needed > struts;
  const targetType = SHORE_TYPE_FOR_STRUTS[needed];
  const canAutoFix = shortDeploy && !!onAddStruts && !!onDeploy && !!targetType;
  const perStrutAfter = shortDeploy ? Math.ceil((estimatedLoad ?? 0) / needed) : 0;

  const gated = !!combo.unrated || !!combo.exceedsCapacity || shortDeploy;
  const color = combo.strut.color; // 'gold' | 'grey' — physical field-ID, not lifecycle status
  // Identity keys off the SYSTEM: LockStroke struts are grey-colored but carry
  // their own cyan word + stripe (sysKeyOf in struts.ts — every lk-* is color:'grey').
  const sys = sysKeyOf(combo.strut.system, color);
  const word = SYSTEM_LABELS[combo.strut.system]; // the system NAME, never the v3 color code (§8)
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
  // The exact pre-floor result (raw − exact deductions); combo.effectiveLength is
  // its ADR-012 floor. When they differ the ledger shows the floor step so the
  // column foots — rows sum to the exact line, the floor gives the total.
  const exactInches = combo.openingLength - deductionTotalInches(deductions);

  // Rated capacity is the QUIET footer (synthesis §3.4): the engine's per-strut
  // rating at the effective length (conservative-floor row, the caller's 4:1 SP
  // index). Shown only on a clean card — a gated card has no honest number to
  // print (0 for unrated; the per-strut best is meaningless once load exceeds
  // 4-strut capacity).
  const capLb = Math.floor(combo.capacity);
  // A short-deploy card in DEPLOY mode moves the honest numbers into the ×N tile
  // (mockup A); the Quick Find variant keeps the quiet footer (mockup B).
  const showCapacity = capLb > 0 && !combo.unrated && !combo.exceedsCapacity && !(shortDeploy && onDeploy);

  // Full strut identity in the button's accessible name (workflow #221 §Accessibility).
  const fx = eighthsToParts(effectiveEighths);
  const deploySrLabel = `Deploy ${model}, ${color} ${combo.strut.system}, effective ${fx.totalInches}${
    fx.n > 0 ? ` and ${fx.n}/${fx.d}` : ''
  } inches${source ? `, from ${source}` : ''}`;

  const deployBlocked = !!combo.exceedsCapacity;
  const needsAck = !!combo.unrated && !acknowledged;

  // Safety tells shared by both variants verbatim — the calculator card compacts
  // the identity, never the warnings (#433).
  const needTell = shortDeploy && (
    /* ×N struts-needed tell (accepted mockup) — the extension-tile anatomy in
       the danger pair: how many struts this load needs, and the shore type
       that carries them. */
    <div className="fs-rec-ext fs-rec-need">
      <span className="fs-rec-ext-tile fs-rec-need-tile" aria-hidden="true">
        ×{needed}
      </span>
      <div className="fs-rec-ext-amt">
        <span className="fs-rec-need-word">struts needed for this load</span>
      </div>
      <p className="fs-rec-ext-note">
        One strut is rated {capLb.toLocaleString('en-US')} lb at <MeasurementValue eighths={effectiveEighths} />.{' '}
        {targetType ? (
          <>
            {needed} struts as a <b>{SHORE_TYPE_LABELS[targetType]}</b> carry {perStrutAfter.toLocaleString('en-US')} lbs
            each — within rating.
          </>
        ) : (
          <>This load needs {needed} struts — plan additional shore sets, or consult rescue engineering.</>
        )}
      </p>
    </div>
  );
  const boundaryCaution = combo.boundaryWarning === 'fully-extended' && (
    <p className="fs-rec-caution">
      <strong>Fully extended — zero margin.</strong> Strut is at its maximum reach ({combo.adjExtended}″). No room
      to compensate if the opening grows.
    </p>
  );
  const unratedGate = combo.unrated && (
    <>
      <WarningGate use="unrated" acknowledged={acknowledged} onAcknowledge={() => setAcknowledged((a) => !a)} />
      {combo.unratedReason && <p className="fs-rec-gate-detail">{combo.unratedReason}</p>}
    </>
  );
  const overCapacityGate = combo.exceedsCapacity && (
    <>
      <WarningGate use="over-capacity" />
      {combo.exceedsCapacityReason && <p className="fs-rec-gate-detail">{combo.exceedsCapacityReason}</p>}
    </>
  );

  if (variant === 'calculator') {
    // #433 (accepted mockup qf_result_card_final): stripe · "LS 203 + 24″
    // extension" headline with the system word right-aligned (a gated card swaps
    // the tag for the danger badge) · connectors · quiet capacity · safety tail.
    return (
      <Card
        className={`fs-rec fs-rec--calc fs-rec--${sys}${gated ? ' is-gated' : ''}`}
        edge={<span className="fs-rec-bar" aria-hidden="true" />}
      >
        <div className="fs-rec-calc-head">
          <p className="fs-rec-calc-model">
            {model}
            {combo.extensions.length > 0 && ` extension${combo.extensions.length > 1 ? 's' : ''}`}
          </p>
          {gated ? (
            <span className="fs-rec-fit fs-rec-fit--no fs-rec-calc-fit">
              {combo.unrated ? 'Unrated' : 'Over capacity'}
            </span>
          ) : (
            <span className="fs-rec-calc-sys">{word}</span>
          )}
        </div>
        {specs.length > 0 && <p className="fs-rec-calc-conn">{specs.join(' · ')}</p>}
        {showCapacity && <p className="fs-rec-calc-cap">Rated {capLb.toLocaleString('en-US')} lb at this length</p>}
        {boundaryCaution}
        {needTell}
        {unratedGate}
        {overCapacityGate}
        <WarningGate use="disclaimer" />
      </Card>
    );
  }

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
          {stock && <span className={`fs-rec-stock fs-rec-stock--${stock.status}`}>{stock.detail}</span>}
        </div>
        {/* Badge only on a gated card — the #40 danger tell. A clean recommendation
            needs no "Fits" flag: being recommended IS fitting (#248). */}
        {gated && (
          <span className="fs-rec-fit fs-rec-fit--no">
            {combo.unrated ? 'Unrated' : 'Over capacity'}
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
        {!isEighthsExact(exactInches) && (
          <div className="fs-rec-row fs-rec-floor">
            <span className="fs-rec-slot-label">Exact — floored to ⅛″</span>
            <InchesValue inches={exactInches} className="fs-rec-floor-value" />
          </div>
        )}
        <div className="fs-rec-row fs-rec-effective-row">
          <span className="fs-rec-slot-label">Required strut length</span>
          <MeasurementValue eighths={effectiveEighths} className="fs-rec-effective" />
        </div>
        {shortDeploy && (
          <div className="fs-rec-row">
            <span className="fs-rec-slot-label">Estimated load</span>
            <span className="fs-rec-opening">{(estimatedLoad ?? 0).toLocaleString('en-US')} lbs</span>
          </div>
        )}
      </div>

      {needTell}

      {boundaryCaution}

      {unratedGate}
      {overCapacityGate}

      {shortDeploy && onDeploy && (
        /* Short-deploy block (accepted mockup A): the FIX is the primary action —
           convert to the right shore type and deploy every strut. Deploying short
           stays possible but demoted, locked behind the recorded acknowledgment. */
        <>
          {canAutoFix && (
            <>
              <Button
                variant="primary"
                fullWidth
                disabled={!!deployDisabled}
                onPress={() => onAddStruts!(combo, targetType!, needed)}
              >
                Add {needed - struts} more strut{needed - struts > 1 ? 's' : ''} — deploy as{' '}
                {SHORE_TYPE_LABELS[targetType!]}
              </Button>
              <p className="fs-rec-add-note">
                Converts this shore to a {SHORE_TYPE_LABELS[targetType!]} and deploys{' '}
                {needed === 2 ? 'both' : `all ${needed}`} {model}
                {source ? ` from ${source}` : ''}
              </p>
            </>
          )}
          <WarningGate
            use="over-capacity-short"
            acknowledged={acknowledged}
            onAcknowledge={() => setAcknowledged((a) => !a)}
          />
          <Button
            variant="secondary"
            fullWidth
            disabled={!acknowledged || !!deployDisabled}
            disabledReason={!acknowledged && !deployDisabled ? 'Acknowledge the over-capacity deploy first' : undefined}
            onPress={() => onDeploy(combo)}
          >
            Deploy {struts} of {needed} anyway
            <span className="fs-sr-only">{deploySrLabel.slice('Deploy'.length)}</span>
          </Button>
        </>
      )}

      {!shortDeploy && onDeploy && (
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
