import { useId, useRef, useState } from 'react';
import type { BuildingSide } from '@core/schema';
import { sideLabel } from '@core/operation';
import { Popover } from '@ui/primitives';

/**
 * SidePicker — the building-side field for the Add Shore Point form (SIM-IV O-9).
 * A compact trigger that OPENS a bird's-eye grid (accepted mockup 2026-07-02):
 * A faces the street at the bottom-centre, B–D clockwise, the four corners on the
 * diagonals, the dashed centre clears. A DROPDOWN on every surface (anchored
 * Popover, Alex 2026-07-02) — NOT the surface-adaptive PickerSurface: the spatial
 * grid reads better dropped from the field than risen as a bottom sheet, so this
 * one picker deliberately opts out of the ADR-032 slide-up on phone. Side is a
 * structured locator, separate from the floor-numbered division and free-text area.
 */
const SIDE_GRID: readonly (BuildingSide | null)[] = [
  'B/C', 'C', 'C/D',
  'B', null, 'D',
  'A/B', 'A', 'D/A',
];

function BuildingGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="5" y="4" width="14" height="16" rx="1" />
      <path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2" strokeLinecap="round" />
    </svg>
  );
}

export interface SidePickerProps {
  value: BuildingSide | undefined;
  onChange: (side: BuildingSide | undefined) => void;
}

export function SidePicker({ value, onChange }: SidePickerProps) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  function pick(side: BuildingSide | null) {
    onChange(side ?? undefined);
    setOpen(false);
  }

  return (
    <div className="fs-picker-field">
      <span className="fs-field-label" id={labelId}>
        Side
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="fs-picker-trigger"
        aria-labelledby={labelId}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="fs-picker-trigger-value">{value ?? '—'}</span>
        <span className="fs-picker-trigger-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      <Popover open={open} onClose={() => setOpen(false)} title="Building side" anchor={triggerRef}>
        <p className="fs-side-hint">Looking down — A faces the street</p>
        <div className="fs-side-grid" role="group" aria-labelledby={labelId}>
          {SIDE_GRID.map((side) =>
            side === null ? (
              <button
                key="center"
                type="button"
                className="fs-side-cell fs-side-cell--center"
                aria-label="Clear side"
                aria-pressed={value === undefined}
                onClick={() => pick(null)}
              >
                <BuildingGlyph />
              </button>
            ) : (
              <button
                key={side}
                type="button"
                className={`fs-side-cell${side.includes('/') ? ' fs-side-cell--corner' : ''}`}
                aria-label={sideLabel(side)}
                aria-pressed={value === side}
                onClick={() => pick(side)}
              >
                {side}
              </button>
            ),
          )}
        </div>
        <p className="fs-side-street">Street / address side · A</p>
      </Popover>
    </div>
  );
}
