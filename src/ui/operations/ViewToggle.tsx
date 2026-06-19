import * as RadioGroup from '@radix-ui/react-radio-group';
import { tapHaptic } from '@ui/primitives/haptics';

export type BoardLayout = 'lanes' | 'list';

// ViewToggle (#356) — the List ↔ Status tiles switcher as two small square icon
// buttons, right-justified after the Sort control. Radix RadioGroup gives the
// roving tabindex + arrow-key selection (same foundation as Segmented); the
// selected button carries data-state="checked" for the highlight (Principle 9:
// not color alone — fill + icon weight too).
function ListGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="4" cy="5" r="1.3" fill="currentColor" />
      <circle cx="4" cy="10" r="1.3" fill="currentColor" />
      <circle cx="4" cy="15" r="1.3" fill="currentColor" />
      <path d="M8 5h9M8 10h9M8 15h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function TilesGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export function ViewToggle({
  value,
  onChange,
}: {
  value: BoardLayout;
  onChange: (v: BoardLayout) => void;
}) {
  return (
    <RadioGroup.Root
      className="fs-view-toggle"
      value={value}
      aria-label="View"
      onValueChange={(v) => { tapHaptic(); onChange(v as BoardLayout); }}
    >
      <RadioGroup.Item className="fs-view-btn" value="list" aria-label="List">
        <ListGlyph />
      </RadioGroup.Item>
      <RadioGroup.Item className="fs-view-btn" value="lanes" aria-label="Status tiles">
        <TilesGlyph />
      </RadioGroup.Item>
    </RadioGroup.Root>
  );
}
