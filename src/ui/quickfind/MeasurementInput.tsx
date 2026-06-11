import * as RadioGroup from '@radix-ui/react-radio-group';
import { useId, useState } from 'react';
import { MAX_MEASUREMENT_EIGHTHS } from '@core/schema';
import { Fraction, MeasurementValue, eighthsToParts, tapHaptic } from '@ui/primitives';

/**
 * MeasurementInput — the gloved measurement entry (settled gate follow-ups
 * #20/#38): big ± steppers for feet and inches plus an eighths TAP-STRIP.
 * No scroll wheel, no spinner — the two most safety-critical inputs are large
 * direct taps. DELIBERATE DEVIATION (session log): input.md's 56pt numeric
 * keypad remains the doctrine baseline for free numeric entry; the slice
 * ships the strip+stepper affordance Alex locked for the build. Value is an
 * EXACT eighths int end-to-end (ADR-012) — this component never emits a
 * float and never emits outside [0, maxEighths]; bound hits surface an
 * inline message, never a toast.
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
  const [bound, setBound] = useState<'min' | 'max' | null>(null);

  const apply = (next: number) => {
    if (next < 0) {
      setBound('min');
      onChange(0);
      return;
    }
    if (next > maxEighths) {
      setBound('max');
      onChange(Math.min(value, maxEighths));
      return;
    }
    setBound(null);
    onChange(next);
  };

  const step = (deltaEighths: number) => {
    tapHaptic();
    apply(value + deltaEighths);
  };

  const boundMessage =
    bound === 'max'
      ? `Maximum opening is 30 ft (${maxEighths / 8}″)`
      : bound === 'min'
        ? 'Measurement can’t go below 0″'
        : null;

  return (
    <div className="fs-meas-input">
      <span className="fs-field-label" id={labelId}>
        {label}
      </span>
      <output className="fs-meas-readout" aria-labelledby={labelId} aria-live="polite">
        <MeasurementValue eighths={value} form="feet-inches" />
      </output>
      <div className="fs-steppers">
        <div className="fs-step-group">
          <span className="fs-step-label">Feet</span>
          <div className="fs-step-row">
            <button type="button" className="fs-step-btn" aria-label="Down one foot" onClick={() => step(-96)}>
              −
            </button>
            <button type="button" className="fs-step-btn" aria-label="Up one foot" onClick={() => step(96)}>
              +
            </button>
          </div>
        </div>
        <div className="fs-step-group">
          <span className="fs-step-label">Inches</span>
          <div className="fs-step-row">
            <button type="button" className="fs-step-btn" aria-label="Down one inch" onClick={() => step(-8)}>
              −
            </button>
            <button type="button" className="fs-step-btn" aria-label="Up one inch" onClick={() => step(8)}>
              +
            </button>
          </div>
        </div>
      </div>
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
          // Tape-measure form (KB-2): cells read 1/8 1/4 3/8 1/2 5/8 3/4 7/8 —
          // reduced for display only; the stored value stays the raw eighths int.
          const p = eighthsToParts(n);
          return (
            <RadioGroup.Item
              key={n}
              className="fs-eighth"
              value={String(n)}
              aria-label={n === 0 ? 'zero eighths' : `${p.n}/${p.d} inch`}
            >
              {n === 0 ? '0' : <Fraction n={p.n} d={p.d} />}
            </RadioGroup.Item>
          );
        })}
      </RadioGroup.Root>
      {boundMessage && (
        <span className="fs-field-msg fs-field-msg--error" role="status">
          {boundMessage}
        </span>
      )}
    </div>
  );
}
