import * as RadioGroup from '@radix-ui/react-radio-group';
import { useId, useState, useRef, useEffect } from 'react';
import { MAX_MEASUREMENT_EIGHTHS } from '@core/schema';
import { Fraction, MeasurementValue, eighthsToParts, tapHaptic } from '@ui/primitives';
import { MeasurementEntryModal } from './MeasurementEntryModal';
import { parseMeasurement } from './parseMeasurement';

/**
 * MeasurementInput — the gloved measurement entry (KB-3, S10).
 * Phone: readout is a button that opens MeasurementEntryModal (56pt keypad).
 * Desktop: readout is a focusable field for hardware typing (parser on blur/Enter).
 * Both: steppers (feet/inches) and eighths strip for quick-adjust.
 * Value is EXACT eighths int end-to-end (ADR-012) — never float, never outside bounds;
 * bound hits surface inline, never toast.
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
  const inputId = useId();
  const [bound, setBound] = useState<'min' | 'max' | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hardwareInput, setHardwareInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect phone vs desktop by checking media query
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      setIsPhone(false);
      return;
    }
    const media = window.matchMedia('(max-width: 768px)');
    setIsPhone(media.matches);
    const handler = (e: MediaQueryListEvent) => setIsPhone(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

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

  const onReadoutClick = () => {
    if (isPhone) {
      setSheetOpen(true);
    }
  };

  const onHardwareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHardwareInput(e.target.value);
  };

  const onHardwareBlur = () => {
    if (hardwareInput.trim()) {
      const parsed = parseMeasurement(hardwareInput);
      if (parsed !== null) {
        apply(parsed);
      } else {
        setBound('max');
      }
      setHardwareInput('');
    }
  };

  const onHardwareKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onHardwareBlur();
    }
  };

  const boundMessage =
    bound === 'max'
      ? `Maximum opening is 30 ft (${maxEighths / 8} inches)`
      : bound === 'min'
        ? 'Measurement cannot go below 0 inches'
        : null;

  return (
    <div className="fs-meas-input">
      <span className="fs-field-label" id={labelId}>
        {label}
      </span>

      {/* Phone: readout is a button that opens the entry sheet */}
      {isPhone ? (
        <button
          type="button"
          className="fs-meas-readout fs-meas-readout--button"
          onClick={onReadoutClick}
          aria-labelledby={labelId}
        >
          <MeasurementValue eighths={value} form="feet-inches" />
        </button>
      ) : (
        /* Desktop: readout is a focusable input field for hardware typing */
        <input
          ref={inputRef}
          type="text"
          id={inputId}
          className="fs-meas-readout fs-meas-readout--input"
          placeholder="Type 68, 5 8 5/8, etc."
          value={hardwareInput}
          onChange={onHardwareChange}
          onBlur={onHardwareBlur}
          onKeyDown={onHardwareKeyDown}
          aria-labelledby={labelId}
          aria-invalid={bound === 'max' || bound === 'min'}
        />
      )}

      {/* Steppers: quick-adjust via +/- buttons (both phone and desktop) */}
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

      {/* Eighths strip: quick-adjust (both phone and desktop) */}
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
          // Tape-measure form (KB-2): cells read 1/8 1/4 3/8 1/2 5/8 3/4 7/8
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

      {/* Phone: the big-key entry modal (ft/in slots + 56pt dialer keypad) */}
      {isPhone && (
        <MeasurementEntryModal
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          value={value}
          onChange={apply}
          maxEighths={maxEighths}
          label={label}
        />
      )}
    </div>
  );
}
