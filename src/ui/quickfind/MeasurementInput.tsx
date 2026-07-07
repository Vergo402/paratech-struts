import * as RadioGroup from '@radix-ui/react-radio-group';
import { useId, useState } from 'react';
import { MAX_MEASUREMENT_EIGHTHS } from '@core/schema';
import { eighthsToParts, tapHaptic, useNativeControls } from '@ui/primitives';
import { PowerSelect } from '@ui/picker';

/**
 * MeasurementInput — the gloved measurement entry (KB-3).
 * Feet and inches are TYPED directly (numeric keyboard — faster than the old
 * +/- steppers, #248 re-drive); the eighths tap-strip sets the fraction. Value
 * is EXACT eighths int end-to-end (ADR-012) — never float, never above the ceiling.
 *
 * The two text fields hold what you TYPE and are never reformatted mid-entry: the
 * whole opening can be entered in inches alone (72 → 6 ft) and those digits stay
 * put instead of rolling into the feet box and vanishing. They re-seed from
 * `value` only when it changes from OUTSIDE the component (form reset, editing an
 * existing point) — never off our own keystrokes, which previously re-added the
 * feet on every digit and grew the opening wildly (bug, 2026-06-15).
 */
export interface MeasurementInputProps {
  label?: string;
  /** Exact eighths-of-an-inch. */
  value: number;
  onChange: (eighths: number) => void;
  maxEighths?: number;
}

const EIGHTHS = [0, 1, 2, 3, 4, 5, 6, 7] as const;
// The eighths as options for the OS-native fallback (#398): same values the
// tap-strip offers, so switching surfaces never changes what you can pick.
const EIGHTHS_OPTIONS = EIGHTHS.map((n) => {
  const p = eighthsToParts(n);
  return { value: String(n), label: n === 0 ? '0' : `${p.n}/${p.d}` };
});
const digitsOnly = (s: string) => s.replace(/\D/g, '');
const toInt = (s: string) => Math.max(0, parseInt(s, 10) || 0);

/** Canonical feet + inches text for a value — used to seed the fields from the
 *  outside (an edit-load splits 75″ into 6 ft / 3 in; 0 in shows the placeholder). */
function seedFields(value: number) {
  const totalInches = Math.floor(value / 8);
  return {
    feet: totalInches >= 12 ? String(Math.floor(totalInches / 12)) : '',
    inches: totalInches % 12 > 0 ? String(totalInches % 12) : '',
  };
}

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
  const [feetStr, setFeetStr] = useState(() => seedFields(value).feet);
  const [inchesStr, setInchesStr] = useState(() => seedFields(value).inches);
  const [lastWhole, setLastWhole] = useState(value - (value % 8));
  const nativeControls = useNativeControls();

  const frac = value % 8;

  // Re-seed the text fields when the WHOLE-INCH part of `value` changes from
  // outside (reset / edit-load) — detected by the fields no longer composing to
  // it. Our own typing already set the fields (they compose to the new value), so
  // it never reseeds; the eighths strip only moves `frac`, leaving the whole part
  // alone. (React's "adjust state during render on prop change" — guarded.)
  const wholeNow = value - frac;
  if (wholeNow !== lastWhole) {
    setLastWhole(wholeNow);
    if ((toInt(feetStr) * 12 + toInt(inchesStr)) * 8 !== wholeNow) {
      const s = seedFields(value);
      setFeetStr(s.feet);
      setInchesStr(s.inches);
      setOverMax(false);
    }
  }

  // Compose feet + inches + the current fraction. Reject (keep the last good text
  // and value) over the 30 ft ceiling, so a stray digit can never silently balloon
  // the opening — and the typed digits never disappear underneath you. The ceiling
  // note flashes on the rejected keystroke and clears on the next valid edit or on
  // blur (the kept value is valid, so it never lingers stale beside a good number).
  const commit = (nextFeet: string, nextInches: string) => {
    const next = (toInt(nextFeet) * 12 + toInt(nextInches)) * 8 + frac;
    if (next > maxEighths) {
      setOverMax(true);
      return false;
    }
    setOverMax(false);
    onChange(next);
    return true;
  };

  const onFeet = (raw: string) => {
    const clean = digitsOnly(raw);
    if (commit(clean, inchesStr)) setFeetStr(clean);
  };
  const onInches = (raw: string) => {
    const clean = digitsOnly(raw);
    if (commit(feetStr, clean)) setInchesStr(clean);
  };

  const onFrac = (v: string) => {
    const next = wholeNow + Number(v);
    if (next > maxEighths) {
      setOverMax(true);
      return;
    }
    setOverMax(false);
    tapHaptic();
    onChange(next);
  };

  return (
    <div className="fs-meas-input">
      <span className="fs-field-label" id={labelId}>
        {label}
      </span>

      {/* Typed feet + inches — the fast path (#248): no steppers, no keypad modal.
          Either box accepts the whole opening; the other can stay empty. */}
      <div className="fs-meas-fields" role="group" aria-labelledby={labelId}>
        <div className="fs-meas-field">
          <input
            id={feetId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="fs-meas-field-input"
            value={feetStr}
            placeholder="0"
            onChange={(e) => onFeet(e.target.value)}
            onBlur={() => setOverMax(false)}
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
            value={inchesStr}
            placeholder="0"
            onChange={(e) => onInches(e.target.value)}
            onBlur={() => setOverMax(false)}
            aria-label="Inches"
            aria-invalid={overMax}
          />
          <label htmlFor={inchesId} className="fs-meas-unit">
            in
          </label>
        </div>
      </div>

      {/* Eighths — the fraction (KB-2): 1/8 1/4 3/8 1/2 5/8 3/4 7/8. Native-controls
          fallback (accessibility.md §Power Select) routes this raw strip to an OS
          <select> under VoiceOver/TalkBack-or-Native-controls (#398); the four
          picker variants already fell back, this raw consumer did not. */}
      {nativeControls ? (
        <PowerSelect
          label={`${label} — eighths of an inch`}
          options={EIGHTHS_OPTIONS}
          value={String(frac)}
          onChange={onFrac}
        />
      ) : (
        <RadioGroup.Root
          className="fs-eighths-strip"
          aria-label={`${label} — eighths of an inch`}
          value={String(frac)}
          onValueChange={onFrac}
        >
          {EIGHTHS.map((n) => {
            const p = eighthsToParts(n);
            return (
              <RadioGroup.Item
                key={n}
                /* "0" is the REST state, not a choice — checked, it stays neutral
                   so the strip's gold only marks a genuinely picked fraction
                   (#433 gold budget; quickfind.css .fs-eighth--zero). */
                className={n === 0 ? 'fs-eighth fs-eighth--zero' : 'fs-eighth'}
                value={String(n)}
                aria-label={n === 0 ? 'zero eighths' : `${p.n}/${p.d} inch`}
              >
                {n === 0 ? '0' : `${p.n}/${p.d}`}
              </RadioGroup.Item>
            );
          })}
        </RadioGroup.Root>
      )}

      {overMax && (
        <span className="fs-field-msg fs-field-msg--error" role="status">
          Maximum opening is 30 ft ({maxEighths / 8} inches)
        </span>
      )}
    </div>
  );
}
