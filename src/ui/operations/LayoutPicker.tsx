import { useId, useRef, useState } from 'react';
import { PickerSurface } from '@ui/primitives';

export type BoardLayout = 'lanes' | 'list';

// LayoutPicker — the Lanes ↔ List view switcher (#356), styled like the macOS/iOS
// view menu: a leading checkmark on the selected row, then an icon, then the label.
// Surface-adaptive via PickerSurface (Sheet on phone, Popover on desktop, ADR-032).
const OPTIONS: { value: BoardLayout; label: string; icon: 'grid' | 'list' }[] = [
  { value: 'lanes', label: 'Lanes', icon: 'grid' },
  { value: 'list', label: 'List', icon: 'list' },
];

function Glyph({ kind }: { kind: 'grid' | 'list' }) {
  return kind === 'grid' ? (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="10" y="2" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="2" y="10" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="10" y="10" width="6" height="6" rx="1.5" fill="currentColor" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="3" cy="4" r="1.2" fill="currentColor" />
      <circle cx="3" cy="9" r="1.2" fill="currentColor" />
      <circle cx="3" cy="14" r="1.2" fill="currentColor" />
      <path d="M7 4h9M7 9h9M7 14h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function LayoutPicker({
  value,
  onChange,
}: {
  value: BoardLayout;
  onChange: (v: BoardLayout) => void;
}) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0]!;

  return (
    <div className="fs-picker-field">
      <span className="fs-field-label" id={labelId}>
        View
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="fs-picker-trigger fs-filterbar-trigger"
        aria-labelledby={labelId}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="fs-picker-trigger-value fs-view-trigger-value">
          <span className="fs-view-icon" aria-hidden="true"><Glyph kind={current.icon} /></span>
          {current.label}
        </span>
        <span className="fs-picker-trigger-chevron" aria-hidden="true">▾</span>
      </button>
      <PickerSurface open={open} onClose={() => setOpen(false)} title="View" anchor={triggerRef}>
        <div role="listbox" aria-labelledby={labelId}>
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`fs-view-row${o.value === value ? ' fs-view-row--selected' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              <span className="fs-view-check" aria-hidden="true">{o.value === value ? '✓' : ''}</span>
              <span className="fs-view-icon" aria-hidden="true"><Glyph kind={o.icon} /></span>
              <span className="fs-view-label">{o.label}</span>
            </button>
          ))}
        </div>
      </PickerSurface>
    </div>
  );
}
