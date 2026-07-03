import { useState } from 'react';
import { BASE_PLATES, WOOD_SIZES, plateHeight, woodHeight } from '@core/load';
import { effectiveLengthFrom } from '@core/shorepoint';
import type { Deductions } from '@core/schema';
import { MeasurementValue } from '@ui/primitives';
import { InlineSegmented, PlateThumb, VisualGridPicker } from '@ui/picker';

/**
 * DeductionPicker — the fixed-order deduction ledger (card.md / input.md):
 * Raw opening → Header wood → Top plate → Bottom plate → Footer wood →
 * Required strut length. The order is the build order of the shore, top-down,
 * and never re-sorts. All math comes from core (`effectiveLengthFrom`, exact
 * catalog heights — L-2 deduct-once); the ledger never holds its own constants.
 * Required strut length floors to ⅛″ and turns --danger when the deductions
 * consume the opening.
 * Deductions read as signed measurements — −3½″, never "deducts 3.5″" (KB-4);
 * nearest ⅛″ with ≈ when the catalog height isn't eighths-exact. The editable
 * ledger KEEPS the ≈ (picking-transparency — Alex, 2026-06-13); the read-only
 * RecommendationCard DROPPED it in the #248 declutter. Intentional split, not
 * an inconsistency to reconcile — the exact spec drives the math either way.
 */
export interface DeductionPickerProps {
  /** The opening measurement the ledger deducts from (exact eighths). */
  measurementEighths: number;
  value: Deductions;
  onChange: (next: Deductions) => void;
  /**
   * Collapse the editable pickers behind a "Deductions" toggle, keeping the
   * Required strut length + applied-summary + any danger warning always visible
   * (#349, Add Shore Point only; Principle 7 honored). Default off — Quick Find
   * and the gallery keep the ledger fully expanded, where it IS the task.
   */
  collapsible?: boolean;
  /**
   * #409 (Idea 409): plate ids in stock. Sorts those plates under an "Available"
   * header in the picker grid and dims the rest — visibly demoted, still
   * selectable (crews borrow parts; blocking would be wrong). Absent → the flat
   * unfiltered catalog, as before.
   */
  availablePlateIds?: ReadonlySet<string>;
  /**
   * Names the stock scope in the off-stock warning — a rig ("Rescue 1") when the
   * shore point has an assigned resource, absent → "in inventory".
   */
  stockLabel?: string;
}

function DeductionAmount({ heightInches }: { heightInches: number }) {
  return (
    <>
      {(heightInches * 8) % 1 !== 0 && <span className="fs-ledger-approx">≈</span>}
      <MeasurementValue eighths={-Math.round(heightInches * 8)} />
    </>
  );
}

const WOOD_OPTIONS = WOOD_SIZES.map((w) => ({ value: w.id, label: w.id === 'none' ? 'None' : w.id.replace('x', '×') }));

const PLATE_OPTIONS = BASE_PLATES.map((p) => ({
  id: p.id,
  name: p.name,
  sub: <DeductionAmount heightInches={p.height} />,
}));

// Disclosure chevron for the collapsible toggle — points down when open, rotates
// to point right when collapsed (CSS, on the button's aria-expanded). Mirrors the
// board's `.fs-lane-chevron` idiom (operations.css).
function LedgerChevron() {
  return (
    <svg className="fs-ledger-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Option-B collapsed summary (#349): the non-default deductions in build order
// (Header → plates → Footer), or "No deductions" when every slot is empty. Names
// the wood size and plate so an auto-applied 6×6 (3-Post) or a non-standard plate
// announces itself without opening the section.
function appliedSummary(value: Deductions): string {
  const parts: string[] = [];
  if (value.headerWood !== 'none') parts.push(`Header ${value.headerWood.replace('x', '×')}`);
  if (value.topPlate !== 'none') parts.push(BASE_PLATES.find((p) => p.id === value.topPlate)?.name ?? 'Top plate');
  if (value.bottomPlate !== 'none') parts.push(BASE_PLATES.find((p) => p.id === value.bottomPlate)?.name ?? 'Bottom plate');
  if (value.footerWood !== 'none') parts.push(`Footer ${value.footerWood.replace('x', '×')}`);
  return parts.length ? parts.join(' · ') : 'No deductions';
}

export function DeductionPicker({
  measurementEighths,
  value,
  onChange,
  collapsible = false,
  availablePlateIds,
  stockLabel,
}: DeductionPickerProps) {
  const effectiveInches = effectiveLengthFrom(measurementEighths, value);
  const effectiveEighths = Math.round(effectiveInches * 8); // exact — already ⅛″-floored
  // Only a danger once a real opening is entered — a blank (0) measurement is the
  // empty state, not "deductions consume the opening" (and must not force-open #349).
  const impossible = measurementEighths > 0 && effectiveInches <= 0;

  const [expanded, setExpanded] = useState(false);
  // impossible force-opens: you can't fix a wood/plate you can't see (Principle 7).
  const isOpen = !collapsible || expanded || impossible;
  const hasDeductions =
    value.headerWood !== 'none' || value.topPlate !== 'none' || value.bottomPlate !== 'none' || value.footerWood !== 'none';
  // The toggle's own subtitle carries the state (folded in from the old separate
  // summary) — and, when empty + collapsed, an explicit "tap to add" so the bordered
  // row reads as a control, not a heading (SIM-IV follow-up, Alex 2026-07-02).
  const toggleState = hasDeductions ? appliedSummary(value) : isOpen ? 'None' : 'None — tap to add';

  const set = <K extends keyof Deductions>(key: K, v: Deductions[K]) =>
    onChange({ ...value, [key]: v });

  // #409: selected plates that aren't in the provided stock — warns, never blocks
  // (the deploy step double-checks; mutual aid happens). 'none' is always in stock.
  const offStockCount = availablePlateIds
    ? [value.topPlate, value.bottomPlate].filter((id) => id !== 'none' && !availablePlateIds.has(id)).length
    : 0;

  return (
    <div className="fs-ledger">
      {collapsible && (
        <button
          type="button"
          className="fs-ledger-toggle"
          aria-expanded={isOpen}
          onClick={() => setExpanded((e) => !e)}
        >
          <span className="fs-ledger-toggle-text">
            <span className="fs-ledger-toggle-label">Deductions</span>
            <span className="fs-ledger-toggle-state">{toggleState}</span>
          </span>
          <LedgerChevron />
        </button>
      )}
      {isOpen && (
        <>
          <div className="fs-ledger-row fs-ledger-raw">
            <span className="fs-ledger-label">Raw opening</span>
            <MeasurementValue eighths={measurementEighths} className="fs-ledger-value" />
          </div>
          <InlineSegmented
            label="Header wood"
            options={WOOD_OPTIONS}
            value={value.headerWood}
            onChange={(v) => set('headerWood', v)}
            trailing={
              <span className="fs-ledger-value">
                <DeductionAmount heightInches={woodHeight(value.headerWood)} />
              </span>
            }
          />
          <VisualGridPicker
            label="Top plate"
            options={PLATE_OPTIONS}
            value={value.topPlate}
            onSelect={(id) => set('topPlate', id)}
            availableIds={availablePlateIds}
            renderThumb={(opt) => <PlateThumb {...opt} />}
            trailing={
              <span className="fs-ledger-value">
                <DeductionAmount heightInches={plateHeight(value.topPlate)} />
              </span>
            }
          />
          <VisualGridPicker
            label="Bottom plate"
            options={PLATE_OPTIONS}
            value={value.bottomPlate}
            onSelect={(id) => set('bottomPlate', id)}
            availableIds={availablePlateIds}
            renderThumb={(opt) => <PlateThumb {...opt} />}
            trailing={
              <span className="fs-ledger-value">
                <DeductionAmount heightInches={plateHeight(value.bottomPlate)} />
              </span>
            }
          />
          <InlineSegmented
            label="Footer wood"
            options={WOOD_OPTIONS}
            value={value.footerWood}
            onChange={(v) => set('footerWood', v)}
            trailing={
              <span className="fs-ledger-value">
                <DeductionAmount heightInches={woodHeight(value.footerWood)} />
              </span>
            }
          />
        </>
      )}
      <div className={`fs-ledger-row fs-ledger-effective${impossible ? ' fs-ledger-effective--danger' : ''}`}>
        <span className="fs-ledger-label">Required strut length</span>
        <MeasurementValue eighths={effectiveEighths} className="fs-ledger-value fs-ledger-value--big" />
      </div>
      {impossible && (
        <span className="fs-field-msg fs-field-msg--error" role="status">
          Deductions consume the whole opening — check the wood and plate selections
        </span>
      )}
      {offStockCount > 0 && (
        <span className="fs-field-msg fs-field-msg--error" role="status">
          ⚠ Selected {offStockCount === 1 ? 'plate is' : 'plates are'} not{' '}
          {stockLabel ? `on ${stockLabel}` : 'in inventory'} — confirm before deploying
        </span>
      )}
    </div>
  );
}
