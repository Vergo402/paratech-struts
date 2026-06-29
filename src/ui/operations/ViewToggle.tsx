import { Segmented } from '@ui/primitives';

// The Operations view switcher (3 Views × 2 Devices). One labeled control —
// Division | Board | List — shown identically on phone and desktop (the design's
// "a view switcher sits on every screen"). 'lanes' is the internal id for the
// status Board (kept to avoid colliding with the OpsView 'board'|'cutting' scope
// toggle, which is a separate control). Was a 2-way icon toggle (#356); widened
// to 3 with the Division by-floor view.
export type BoardLayout = 'division' | 'lanes' | 'list';

const OPTIONS = [
  { value: 'division', label: 'Division' },
  { value: 'lanes', label: 'Board' },
  { value: 'list', label: 'List' },
] as const satisfies ReadonlyArray<{ value: BoardLayout; label: string }>;

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
      size="standard"
      options={OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}
