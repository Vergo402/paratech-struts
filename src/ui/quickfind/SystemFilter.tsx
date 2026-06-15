import { useId } from 'react';
import type { StrutSysKey } from '@core/load';

const SYSTEMS: readonly { key: StrutSysKey; label: string }[] = [
  { key: 'gold', label: 'Gold' },
  { key: 'grey', label: 'Grey' },
  { key: 'lockstroke', label: 'LockStroke' },
];

export interface SystemFilterProps {
  /** Selected systems — EMPTY means no filter (all systems shown), per v3 getActiveSystemFilter. */
  value: ReadonlySet<StrutSysKey>;
  onChange: (next: Set<StrutSysKey>) => void;
}

/**
 * SystemFilter — the v3 Quick Find system toggles (getActiveSystemFilter,
 * app.js:412 / .system-toggle markup) carried to v4 as multi-select chips.
 * Default none selected = all systems shown; tapping a chip narrows the result
 * list to the selected systems. The dot color matches the RecommendationCard
 * stripe (gold → accent, grey → secondary ink, LockStroke → cyan) so the chip
 * reads as the same field identity, not a new vocabulary.
 */
export function SystemFilter({ value, onChange }: SystemFilterProps) {
  const labelId = useId();
  const toggle = (key: StrutSysKey) => {
    const next = new Set(value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };
  return (
    <div className="fs-sysfilter">
      <span className="fs-field-label" id={labelId}>
        Filter by system — optional
      </span>
      <div className="fs-sysfilter-chips" role="group" aria-labelledby={labelId}>
        {SYSTEMS.map(({ key, label }) => {
          const active = value.has(key);
          return (
            <button
              key={key}
              type="button"
              className={`fs-sysfilter-chip fs-sysfilter-chip--${key}${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => toggle(key)}
            >
              <span className="fs-sysfilter-dot" aria-hidden="true" />
              <span className="fs-sysfilter-text">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
