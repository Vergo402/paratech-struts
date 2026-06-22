import { useId } from 'react';
import type { PositionClassGroup } from '@core/org';

// Single-select wrapping chip row for the ICS class at the top of the Add-position sheet
// (#323). A radiogroup (roving tabIndex + arrow keys); wraps to multiple rows when a
// parent admits many classes (Segmented can't wrap). Value is the class-group key.
export interface ClassSelectorProps {
  groups: PositionClassGroup[];
  value: string;
  onChange: (key: string) => void;
}

export function ClassSelector({ groups, value, onChange }: ClassSelectorProps) {
  const labelId = useId();
  const move = (dir: 1 | -1) => {
    const i = groups.findIndex((g) => g.key === value);
    if (i < 0) return;
    const n = (i + dir + groups.length) % groups.length;
    onChange(groups[n]!.key);
  };
  return (
    <div className="fs-classsel">
      <span className="fs-classsel-label" id={labelId}>
        ICS class
      </span>
      <div className="fs-classsel-chips" role="radiogroup" aria-labelledby={labelId}>
        {groups.map((g) => {
          const active = g.key === value;
          return (
            <button
              key={g.key}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              className={`fs-classsel-chip${active ? ' is-active' : ''}`}
              onClick={() => onChange(g.key)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  move(1);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  move(-1);
                }
              }}
            >
              {g.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
