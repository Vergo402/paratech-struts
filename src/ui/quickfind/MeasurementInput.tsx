import * as RadioGroup from '@radix-ui/react-radio-group';
import { useId, useState } from 'react';
import { MAX_MEASUREMENT_EIGHTHS } from '@core/schema';
import { eighthsToParts, tapHaptic } from '@ui/primitives';

/**
 * MeasurementInput — the gloved measurement entry (KB-3).
 * Feet and inches are TYPED directly (numeric keyboard — faster than the old
 * +/- steppers, #248 re-drive); the eighths tap-strip sets the fraction. Value
 * is EXACT eighths int end-to-end (ADR-012) — never float, never above the
 * ceiling; an over-max entry surfaces inline and keeps the last good value.
 */
export interface MeasurementInputProps {
  label?: string;
  /** Exact eighths-of-an-inch. */
  value: number;
  onChange: (eighths: number) => void;
  maxEighths?: number;
}

const EIGHTHS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export function MeasurementInput({
  label = 'Measurement',
  value,
  onChange,
  maxEighths = MAX_MEASUREMENT_EIGHTHS,
}: MeasurementInputProps) {
  const labelId = useId();
  const feetId = useId();
  const inchesId = useId();
  const [overMax, setOverMax] = useState(false);

  // value (exact eighths) splits into whole feet + whole inches + the eighths
  // remainder. The two fields own feet/inches; the strip owns the remainder.
  const feet = Math.floor(value / 96);
  const inches = Math.floor((value % 96) / 8);
  const frac = value % 8;

  // Typed entry never goes negative (parseInt + max 0), so the only bound that
  // can trip is the ceiling. Over-max keeps the last good value, never a toast.
  const apply = (next: number) => {
    if (next > maxEighths) {
      setOverMax(true);
      onChange(Math.min(value, maxEighths));
      return;
    }
    setOverMax(false);
    onChange(next);
  };

  const onFeet = (s: string) => apply(Math.max(0, parseInt(s, 10) || 0) * 96 + inches * 8 + frac);
  const onInches = (s: string) => apply(feet * 96 + Math.max(0, parseInt(s, 10) || 0) * 8 + frac);

  return (
    <div className="fs-meas-input">
      <span className="fs-field-label" id={labelId}>
        {label}
      </span>

      {/* Typed feet + inches — the fast path (#248): no steppers, no keypad modal. */}
      <div className="fs-meas-fields" role="group" aria-labelledby={labelId}>
        <div className="fs-meas-field">
          <input
            id={feetId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="fs-meas-field-input"
            value={feet > 0 ? String(feet) : ''}
            placeholder="0"
            onChange={(e) => onFeet(e.target.value)}
            aria-label="Feet"
            aria-invalid={overMax}
          />
          <label htmlFor={feetId} className="fs-meas-unit">
            ft
          </label>
        </div>
        <div className="fs-meas-field">
          <input
            id={inchesId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="fs-meas-field-input"
            value={inches > 0 ? String(inches) : ''}
            placeholder="0"
            onChange={(e) => onInches(e.target.value)}
            aria-label="Inches"
            aria-invalid={overMax}
          />
          <label htmlFor={inchesId} className="fs-meas-unit">
            in
          </label>
        </div>
      </div>

      {/* Eighths tap-strip — the fraction (KB-2): 1/8 1/4 3/8 1/2 5/8 3/4 7/8. */}
      <RadioGroup.Root
        className="fs-eighths-strip"
        aria-label={`${label} — eighths of an inch`}
        value={String(value % 8)}
        onValueChange={(v) => {
          tapHaptic();
          apply(value - (value % 8) + Number(v));
        }}
      >
        {EIGHTHS.map((n) => {
          const p = eighthsToParts(n);
          return (
            <RadioGroup.Item
              key={n}
              className="fs-eighth"
              value={String(n)}
              aria-label={n === 0 ? 'zero eighths' : `${p.n}/${p.d} inch`}
            >
              {n === 0 ? '0' : `${p.n}/${p.d}`}
            </RadioGroup.Item>
          );
        })}
      </RadioGroup.Root>

      {overMax && (
        <span className="fs-field-msg fs-field-msg--error" role="status">
          Maximum opening is 30 ft ({maxEighths / 8} inches)
        </span>
      )}
    </div>
  );
}
