import { useRef, type KeyboardEvent } from 'react';

// The apparatus scope selector. A real tablist (tablist/tab + roving tabindex +
// arrow-key nav), NOT the value-variant Segmented — that emits radiogroup/radio ARIA
// (wrong for a scope switcher), DEV-warns past 5 options, and overflows at task-force
// scale. This one scrolls horizontally, so a 20-rig response still works on a phone.

export interface ScopeRig {
  id: string;
  name: string;
  count: number;
}

export interface ApparatusScopeTabsProps {
  rigs: ScopeRig[];
  value: string;
  onChange: (id: string) => void;
}

export function ApparatusScopeTabs({ rigs, value, onChange }: ApparatusScopeTabsProps) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = rigs[(idx + dir + rigs.length) % rigs.length];
    if (!next) return;
    onChange(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <div className="fs-inv-scope" role="tablist" aria-label="Apparatus" aria-orientation="horizontal">
      {rigs.map((rig, idx) => {
        const selected = rig.id === value;
        return (
          <button
            key={rig.id}
            ref={(el) => {
              tabRefs.current[rig.id] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`fs-inv-scope-tab${selected ? ' fs-inv-scope-tab--selected' : ''}`}
            onClick={() => onChange(rig.id)}
            onKeyDown={(e) => onKeyDown(e, idx)}
          >
            <span className="fs-inv-scope-name">{rig.name}</span>
            <span className="fs-inv-scope-count">
              {rig.count} {rig.count === 1 ? 'item' : 'items'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
