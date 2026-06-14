import { BASE_PLATES, WOOD_SIZES, plateHeight, woodHeight } from '@core/load';
import { effectiveLengthFrom } from '@core/shorepoint';
import type { Deductions } from '@core/schema';
import { MeasurementValue } from '@ui/primitives';
import { InlineSegmented, VisualGridPicker } from '@ui/picker';

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
  /** Ops mode: stocked plate ids — passed through to the plate pickers. */
  plateAvailability?: ReadonlySet<string>;
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

export function DeductionPicker({
  measurementEighths,
  value,
  onChange,
  plateAvailability,
}: DeductionPickerProps) {
  const effectiveInches = effectiveLengthFrom(measurementEighths, value);
  const effectiveEighths = Math.round(effectiveInches * 8); // exact — already ⅛″-floored
  const impossible = effectiveInches <= 0;

  const set = <K extends keyof Deductions>(key: K, v: Deductions[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="fs-ledger">
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
        availableIds={plateAvailability}
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
        availableIds={plateAvailability}
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
      <div className={`fs-ledger-row fs-ledger-effective${impossible ? ' fs-ledger-effective--danger' : ''}`}>
        <span className="fs-ledger-label">Required strut length</span>
        <MeasurementValue eighths={effectiveEighths} className="fs-ledger-value fs-ledger-value--big" />
      </div>
      {impossible && (
        <span className="fs-field-msg fs-field-msg--error" role="status">
          Deductions consume the whole opening — check the wood and plate selections
        </span>
      )}
    </div>
  );
}
