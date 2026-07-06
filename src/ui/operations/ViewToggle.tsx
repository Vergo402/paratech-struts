import { Segmented } from '@ui/primitives';

// The Operations view switcher (#356 → tri-view). Three coordinated reads of the
// same shore points: Division (by floor), Board (kanban lanes by status), List
// (flat + sortable). The internal 'lanes' value keeps its name (its label is
// "Board") so it never collides with the OpsView 'board'|'cutting' value.
// #432: compact ICON segments (accepted mockup) — the words moved to ariaLabels;
// the Board|Cutting scope control keeps the words, this row reads as glyphs.
export type BoardLayout = 'division' | 'lanes' | 'list';

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="fs-viewtoggle-glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const VIEW_OPTIONS = [
  {
    value: 'division',
    ariaLabel: 'Division view',
    // stacked floor bands
    label: (
      <Glyph>
        <rect x="4" y="4" width="16" height="4.5" rx="1" />
        <rect x="4" y="10" width="16" height="4.5" rx="1" />
        <rect x="4" y="16" width="16" height="4.5" rx="1" />
      </Glyph>
    ),
  },
  {
    value: 'lanes',
    ariaLabel: 'Board view',
    // kanban columns
    label: (
      <Glyph>
        <rect x="4" y="4" width="4.5" height="16" rx="1" />
        <rect x="10" y="4" width="4.5" height="11" rx="1" />
        <rect x="16" y="4" width="4.5" height="14" rx="1" />
      </Glyph>
    ),
  },
  {
    value: 'list',
    ariaLabel: 'List view',
    // flat rows
    label: (
      <Glyph>
        <path d="M4 6h16M4 12h16M4 18h10" />
      </Glyph>
    ),
  },
] as const;

export function ViewToggle({
  value,
  onChange,
}: {
  value: BoardLayout;
  onChange: (v: BoardLayout) => void;
}) {
  return (
    <Segmented
      aria-label="Operations view"
      size="operational"
      options={VIEW_OPTIONS}
      value={value}
      onChange={(v) => onChange(v as BoardLayout)}
    />
  );
}
