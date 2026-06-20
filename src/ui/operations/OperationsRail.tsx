import { useState } from 'react';
import { Badge } from '@ui/primitives';
import { divisionLabel } from '@core/operation';
import type { RailTree } from './railTree';

/**
 * OperationsRail — the desktop drilldown rail (20-operations.md §Drilldown).
 * Building → division → area, each row a count, selecting a node FILTERS the
 * board (it never navigates). Desktop-only (≥768px): on phone the existing
 * Division/Building/Area filter chips are this rail's form, driving the same
 * state. The rail owns no filter state — it reads OperationsBoard's
 * filterBuilding/Division/Area and writes them back through one `onSelect`, so
 * there is a single source of truth (the chips and the rail can't disagree).
 * Selecting a node applies its EXACT full path, so no cascade is needed.
 */
type Path = { building: string | null; division: string | null; area: string | null };

interface OperationsRailProps {
  tree: RailTree;
  filterBuilding: string | null;
  filterDivision: string | null;
  filterArea: string | null;
  onSelect: (path: Path) => void;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className="fs-rail-chevron"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ transform: open ? 'rotate(90deg)' : 'none' }}
    >
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const dKey = (building: string, division: string) => `d:${building}|${division}`;
const bKey = (building: string) => `b:${building}`;

export function OperationsRail({ tree, filterBuilding, filterDivision, filterArea, onSelect }: OperationsRailProps) {
  // Expansion is local UI state seeded from the active filter path (the lane
  // `collapsed` Set idiom). Selecting an expandable node also opens it so the
  // user can keep drilling.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const seed = new Set<string>();
    if (filterBuilding) seed.add(bKey(filterBuilding));
    if (filterDivision) seed.add(dKey(filterBuilding ?? '', filterDivision));
    return seed;
  });
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const isSel = (p: Path) =>
    (filterBuilding ?? null) === p.building &&
    (filterDivision ?? null) === p.division &&
    (filterArea ?? null) === p.area;

  const renderDivision = (building: string, d: RailTree['divisions'][number], depth: number) => {
    const key = dKey(building, d.division);
    const open = expanded.has(key);
    const hasAreas = d.areas.length > 0;
    const bldg = building || null;
    return (
      <li key={key}>
        <div className="fs-rail-row">
          <button
            type="button"
            className={`fs-rail-select${isSel({ building: bldg, division: d.division, area: null }) ? ' is-active' : ''}`}
            style={{ paddingLeft: `calc(var(--space-3) + ${depth} * var(--space-5))` }}
            aria-current={isSel({ building: bldg, division: d.division, area: null }) || undefined}
            onClick={() => {
              onSelect({ building: bldg, division: d.division, area: null });
              if (hasAreas && !open) toggle(key);
            }}
          >
            <span className="fs-rail-label">{divisionLabel(d.division)}</span>
            <Badge variant="count" value={d.count} srLabel={`${d.count} shore points`} />
          </button>
          {hasAreas && (
            <button
              type="button"
              className="fs-rail-toggle"
              aria-label={open ? `Collapse ${divisionLabel(d.division)}` : `Expand ${divisionLabel(d.division)}`}
              aria-expanded={open}
              onClick={() => toggle(key)}
            >
              <Chevron open={open} />
            </button>
          )}
        </div>
        {open && hasAreas && (
          <ul className="fs-rail-children">
            {d.areas.map((a) => (
              <li key={a.area}>
                <button
                  type="button"
                  className={`fs-rail-select${isSel({ building: bldg, division: d.division, area: a.area }) ? ' is-active' : ''}`}
                  style={{ paddingLeft: `calc(var(--space-3) + ${depth + 1} * var(--space-5))` }}
                  aria-current={isSel({ building: bldg, division: d.division, area: a.area }) || undefined}
                  onClick={() => onSelect({ building: bldg, division: d.division, area: a.area })}
                >
                  <span className="fs-rail-label">{a.area}</span>
                  <Badge variant="count" value={a.count} srLabel={`${a.count} shore points`} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <nav className="fs-ops-rail" aria-label="Filter by location">
      <ul className="fs-rail-list">
        <li>
          <button
            type="button"
            className={`fs-rail-select fs-rail-all${isSel({ building: null, division: null, area: null }) ? ' is-active' : ''}`}
            aria-current={isSel({ building: null, division: null, area: null }) || undefined}
            onClick={() => onSelect({ building: null, division: null, area: null })}
          >
            <span className="fs-rail-label">All shore points</span>
            <Badge variant="count" value={tree.total} srLabel={`${tree.total} shore points`} />
          </button>
        </li>
        {tree.multiBuilding
          ? tree.buildings.map((b) => {
              const key = bKey(b.building);
              const open = expanded.has(key);
              return (
                <li key={key}>
                  <div className="fs-rail-row">
                    <button
                      type="button"
                      className={`fs-rail-select${isSel({ building: b.building, division: null, area: null }) ? ' is-active' : ''}`}
                      aria-current={isSel({ building: b.building, division: null, area: null }) || undefined}
                      onClick={() => {
                        onSelect({ building: b.building, division: null, area: null });
                        if (b.divisions.length && !open) toggle(key);
                      }}
                    >
                      <span className="fs-rail-label">{b.building}</span>
                      <Badge variant="count" value={b.count} srLabel={`${b.count} shore points`} />
                    </button>
                    {b.divisions.length > 0 && (
                      <button
                        type="button"
                        className="fs-rail-toggle"
                        aria-label={open ? `Collapse ${b.building}` : `Expand ${b.building}`}
                        aria-expanded={open}
                        onClick={() => toggle(key)}
                      >
                        <Chevron open={open} />
                      </button>
                    )}
                  </div>
                  {open && (
                    <ul className="fs-rail-children">
                      {b.divisions.map((d) => renderDivision(b.building, d, 1))}
                    </ul>
                  )}
                </li>
              );
            })
          : tree.divisions.map((d) => renderDivision('', d, 0))}
      </ul>
    </nav>
  );
}
