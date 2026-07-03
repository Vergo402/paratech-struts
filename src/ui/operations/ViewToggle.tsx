import { Segmented } from '@ui/primitives';

// The Operations view switcher (#356 → tri-view). Three coordinated reads of the
// same shore points: Division (by floor), Board (kanban lanes by status), List
// (flat + sortable). The internal 'lanes' value keeps its name (its label is
// "Board") so it never collides with the OpsView 'board'|'cutting' value.
export type BoardLayout = 'division' | 'lanes' | 'list';

const VIEW_OPTIONS = [
  { value: 'division', label: 'Division' },
  { value: 'lanes', label: 'Board' },
  { value: 'list', label: 'List' },
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
