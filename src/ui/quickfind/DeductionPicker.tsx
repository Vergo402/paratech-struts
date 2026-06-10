import { BASE_PLATES, WOOD_SIZES } from '@core/load';
import { effectiveLengthFrom } from '@core/shorepoint';
import type { Deductions } from '@core/schema';
import { MeasurementValue } from '@ui/primitives';
import { InlineSegmented, VisualGridPicker } from '@ui/picker';

/**
 * DeductionPicker — the fixed-order deduction ledger (card.md / input.md):
 * Opening → Header wood → Top plate → Bottom plate → Footer wood → Effective.
 * The order is the build order of the shore, top-down, and never re-sorts.
 * All math comes from core (`effectiveLengthFrom`, exact catalog heights —
 * L-2 deduct-once); the ledger never holds its own constants. Effective
 * floors to ⅛″ and turns --danger when the deductions consume the opening.
 */
export interface DeductionPickerProps {
  /** The opening measurement the ledger deducts from (exact eighths). */
  measurementEighths: number;
  value: Deductions;
  onChange: (next: Deductions) => void;
  /** Ops mode: stocked plate ids — passed through to the plate pickers. */
  plateAvailability?: ReadonlySet<string>;
}

const WOOD_OPTIONS = WOOD_SIZES.map((w) => ({ value: w.id, label: w.id === 'none' ? 'None' : w.id.replace('x', '×') }));

const PLATE_OPTIONS = BASE_PLATES.map((p) => ({
  id: p.id,
  name: p.name,
  sub: p.height > 0 ? `deducts ${p.height}″` : 'no deduction',
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
      <div className="fs-ledger-row">
        <span className="fs-ledger-label">Opening</span>
        <MeasurementValue eighths={measurementEighths} className="fs-ledger-value" />
      </div>
      <InlineSegmented
        label="Header wood"
        options={WOOD_OPTIONS}
        value={value.headerWood}
        onChange={(v) => set('headerWood', v)}
      />
      <VisualGridPicker
        label="Top plate"
        options={PLATE_OPTIONS}
        value={value.topPlate}
        onSelect={(id) => set('topPlate', id)}
        availableIds={plateAvailability}
      />
      <VisualGridPicker
        label="Bottom plate"
        options={PLATE_OPTIONS}
        value={value.bottomPlate}
        onSelect={(id) => set('bottomPlate', id)}
        availableIds={plateAvailability}
      />
      <InlineSegmented
        label="Footer wood"
        options={WOOD_OPTIONS}
        value={value.footerWood}
        onChange={(v) => set('footerWood', v)}
      />
      <div className={`fs-ledger-row fs-ledger-effective${impossible ? ' fs-ledger-effective--danger' : ''}`}>
        <span className="fs-ledger-label">
          Effective
          <span className="fs-ledger-note"> floored to ⅛″</span>
        </span>
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
