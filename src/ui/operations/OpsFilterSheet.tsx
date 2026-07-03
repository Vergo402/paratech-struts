import { type RefObject } from 'react';
import { PickerSurface } from '@ui/primitives';
import { divisionLabel } from '@core/operation';
import type { BoardLayout } from './ViewToggle';

/**
 * OpsFilterSheet — the single control surface that collapses Sort + Location +
 * Apparatus + Clear out of the old overwhelming filter row (Alex, 2026-07-02).
 * Surface-adaptive via PickerSurface (bottom Sheet on phone, anchored Popover on
 * desktop, ADR-032). Pure relocation: every value + handler is the board's
 * existing filter state, passed in — no new filtering logic. Sections render
 * only when they have options; Sort hides in the Division view (spatially
 * ordered). The desktop OperationsRail stays the power drill-down path.
 */

type SortMode = 'location' | 'added-newest' | 'added-oldest';
type ListSort = 'added-newest' | 'added-oldest' | 'status' | 'location';

export interface OpsFilterSheetProps {
  open: boolean;
  onClose: () => void;
  anchor: RefObject<HTMLElement>;
  layout: BoardLayout;

  sortMode: SortMode;
  onSortMode: (v: SortMode) => void;
  listSort: ListSort;
  onListSort: (v: ListSort) => void;

  buildingsPresent: string[];
  filterBuilding: string | null;
  onBuilding: (v: string | null) => void;
  divisionsPresent: string[];
  filterDivision: string | null;
  onDivision: (v: string | null) => void;
  areasPresent: string[];
  filterArea: string | null;
  onArea: (v: string | null) => void;
  apparatusPresent: string[];
  filterApparatus: string | null;
  onApparatus: (v: string | null) => void;

  hasActiveFilters: boolean;
  onClearAll: () => void;
}

function CheckGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 10l3.5 3.5L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Row({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`fs-filtsheet-row${selected ? ' is-selected' : ''}`}
      onClick={onSelect}
    >
      <span>{label}</span>
      {selected && <CheckGlyph />}
    </button>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fs-filtsheet-section" role="radiogroup" aria-label={label}>
      <div className="fs-filtsheet-head">{label}</div>
      {children}
    </div>
  );
}

export function OpsFilterSheet(props: OpsFilterSheetProps) {
  const {
    open, onClose, anchor, layout,
    sortMode, onSortMode, listSort, onListSort,
    buildingsPresent, filterBuilding, onBuilding,
    divisionsPresent, filterDivision, onDivision,
    areasPresent, filterArea, onArea,
    apparatusPresent, filterApparatus, onApparatus,
    hasActiveFilters, onClearAll,
  } = props;

  const sortOptions =
    layout === 'list'
      ? ([
          { value: 'location', label: 'Location' },
          { value: 'added-newest', label: 'Added — newest first' },
          { value: 'added-oldest', label: 'Added — oldest first' },
          { value: 'status', label: 'Status' },
        ] as const)
      : ([
          { value: 'location', label: 'Location' },
          { value: 'added-newest', label: 'Added — newest first' },
          { value: 'added-oldest', label: 'Added — oldest first' },
        ] as const);

  return (
    <PickerSurface open={open} onClose={onClose} title="Filters & sort" anchor={anchor}>
      <div className="fs-filtsheet">
        {/* Sort — spatial views (Division) order themselves, so no Sort there. */}
        {layout !== 'division' && (
          <Section label="Sort">
            {sortOptions.map((o) => (
              <Row
                key={o.value}
                label={o.label}
                selected={layout === 'list' ? listSort === o.value : sortMode === o.value}
                onSelect={() =>
                  layout === 'list' ? onListSort(o.value as ListSort) : onSortMode(o.value as SortMode)
                }
              />
            ))}
          </Section>
        )}

        {buildingsPresent.length > 0 && (
          <Section label="Building">
            <Row label="All buildings" selected={!filterBuilding} onSelect={() => onBuilding(null)} />
            {buildingsPresent.map((b) => (
              <Row key={b} label={b} selected={filterBuilding === b} onSelect={() => onBuilding(b)} />
            ))}
          </Section>
        )}

        {divisionsPresent.length > 0 && (
          <Section label="Division">
            <Row label="All divisions" selected={!filterDivision} onSelect={() => onDivision(null)} />
            {divisionsPresent.map((d) => (
              <Row
                key={d}
                label={divisionLabel(d)}
                selected={filterDivision === d}
                onSelect={() => onDivision(d)}
              />
            ))}
          </Section>
        )}

        {areasPresent.length > 0 && (
          <Section label="Area / Room">
            <Row label="All areas" selected={!filterArea} onSelect={() => onArea(null)} />
            {areasPresent.map((a) => (
              <Row key={a} label={a} selected={filterArea === a} onSelect={() => onArea(a)} />
            ))}
          </Section>
        )}

        {apparatusPresent.length > 0 && (
          <Section label="Apparatus">
            <Row label="All apparatus" selected={!filterApparatus} onSelect={() => onApparatus(null)} />
            {apparatusPresent.map((a) => (
              <Row
                key={a}
                label={a}
                selected={filterApparatus === a}
                onSelect={() => onApparatus(a)}
              />
            ))}
          </Section>
        )}

        <button
          type="button"
          className="fs-filtsheet-clear"
          disabled={!hasActiveFilters}
          onClick={onClearAll}
        >
          Clear all filters
        </button>
      </div>
    </PickerSurface>
  );
}
