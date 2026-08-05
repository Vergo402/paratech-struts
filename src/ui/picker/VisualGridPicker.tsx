import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { claimOverlay, releaseOverlay, useNativeControls } from '@ui/primitives';
import { PlateSwatch } from './PlateSwatch';
import { PowerSelect } from './PowerSelect';

/**
 * VisualGridPicker — the v3 plate/wood picker carried forward VERBATIM in
 * behavior (L-9 / sheet.md variant 3 / picker.md "explicit preservation").
 * The iOS reliability was paid for once in v3.5.1; do not modernize it:
 *  - the grid stays MOUNTED at all times and toggles `visibility` +
 *    `pointer-events` via the `.open` class — never display/unmount (iOS
 *    fails to set up overflow scrolling on a freshly-displayed fixed element)
 *  - `touch-action: pan-y` + `transform: translateZ(0)` + overscroll
 *    containment on the scroll container (primitives… picker.css)
 *  - `createPortal(document.body)` replaces the v3 DOM reparent — same
 *    escape from ancestor stacking/containing contexts (#82)
 *  - open marks the selection and scrolls it into view after ~50ms
 *  - Esc, scrim tap, and outside click all close; selection commits + closes
 *  - ops-mode (`availableIds`) splits Available / Not in inventory with
 *    section labels and dims out-of-stock rows — still selectable, since the
 *    off-book deploy path (ADR-033) resolves stock at deploy; 'none' is
 *    always available
 * Deliberately NO focus trap — verbatim v3 interaction (flagged in the
 * session log; the AT path is PowerSelect).
 */
export interface VisualGridOption {
  id: string;
  name: string;
  /** Secondary line — e.g. the plate's height deduction (−3½″). */
  sub?: ReactNode;
}

export interface VisualGridPickerProps {
  label: string;
  options: readonly VisualGridOption[];
  value: string;
  onSelect: (id: string) => void;
  /** Ops mode: stocked option ids. Out-of-stock rows dim but stay selectable. */
  availableIds?: ReadonlySet<string>;
  /** Thumbnail renderer — defaults to the placeholder swatch. */
  renderThumb?: (option: VisualGridOption) => ReactNode;
  /** Trailing value on the label line — e.g. the ledger's −3½″ (KB-4). */
  trailing?: ReactNode;
}

const SCROLL_TO_SELECTED_MS = 50; // v3's settle delay before scrollIntoView

export function VisualGridPicker({
  label,
  options,
  value,
  onSelect,
  availableIds,
  renderThumb,
  trailing,
}: VisualGridPickerProps) {
  const [open, setOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();

  const nativeControls = useNativeControls();

  const isAvailable = (id: string) => !availableIds || id === 'none' || availableIds.has(id);
  const filtering = !!availableIds;
  const availableCount = options.filter((o) => isAvailable(o.id)).length;
  const unavailableCount = options.length - availableCount;
  const current = options.find((o) => o.id === value);

  // Esc + outside-click close while open (v3 global handlers, scoped here).
  useEffect(() => {
    if (!open) return;
    const grid = gridRef.current;
    const close = () => setOpen(false);
    // container + opener: opened from inside a modal (the #220 deduction
    // slots), the grid stacks as a child instead of closing its host.
    claimOverlay(close, {
      container: () => gridRef.current,
      opener: triggerRef.current,
    });
    // The modal's scroll-lock (Radix Dialog → react-remove-scroll) adds
    // bubble-phase, non-passive wheel/touchmove handlers on `document` that
    // preventDefault scrolling anywhere outside Dialog.Content. This grid
    // portals to <body> (to escape the modal's transformed stacking context,
    // #82), so it's outside that allow-list and can't scroll on wheel OR touch.
    // Stop the events at the grid so the lock's document handler never fires —
    // native overflow scroll runs. (Verified: a wheel here is defaultPrevented
    // without this.) The picker grid is a self-contained overlay, so swallowing
    // its own scroll events from the document has no side effects.
    const keepScroll = (e: Event) => e.stopPropagation();
    grid?.addEventListener('wheel', keepScroll, { passive: false });
    grid?.addEventListener('touchmove', keepScroll, { passive: false });
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!gridRef.current?.contains(t) && !triggerRef.current?.contains(t)) close();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onDocClick);
    // Scroll the current selection into view once the layer settles (v3).
    const timer = setTimeout(() => {
      gridRef.current
        ?.querySelector('.fs-plate-option.selected')
        ?.scrollIntoView?.({ block: 'center' });
    }, SCROLL_TO_SELECTED_MS);
    return () => {
      grid?.removeEventListener('wheel', keepScroll);
      grid?.removeEventListener('touchmove', keepScroll);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onDocClick);
      clearTimeout(timer);
      releaseOverlay(close);
    };
  }, [open]);

  const pick = (id: string) => {
    onSelect(id); // single-select commits immediately…
    setOpen(false); // …and closes (picker.md rule 2)
  };

  // Native-controls fallback (accessibility.md §The Power Select fallback): an
  // OS-native <select>; out-of-stock rows stay selectable just like the grid
  // (off-book deploy path, 81f79c0).
  // The visual grid (photos/swatches) is a gloved-thumb affordance; a screen
  // reader gets real platform semantics instead. Placed after all hooks so the
  // effect order never changes (rules-of-hooks).
  if (nativeControls) {
    return (
      <PowerSelect
        label={label}
        options={options.map((o) => ({
          value: o.id,
          // #461 — 81f79c0 intentionally dropped `disabled: !isAvailable(o.id)`
          // so unavailable plates stay pickable here too (the off-book deploy
          // path), but that also dropped the stock signal itself: an AT user
          // picked blind while the sighted grid still showed "Not in
          // inventory". Stay non-blocking — append the same demotion as a
          // label suffix instead of disabling the option.
          label: isAvailable(o.id) ? o.name : `${o.name} — not in inventory`,
        }))}
        value={value}
        onChange={onSelect}
      />
    );
  }

  return (
    <div className="fs-picker-field">
      {trailing != null ? (
        <div className="fs-picker-label-row">
          <span className="fs-field-label" id={labelId}>
            {label}
          </span>
          {trailing}
        </div>
      ) : (
        <span className="fs-field-label" id={labelId}>
          {label}
        </span>
      )}
      <button
        ref={triggerRef}
        type="button"
        className="fs-picker-trigger"
        aria-labelledby={labelId}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation(); // keep the opening tap away from the doc-level close
          setOpen(!open);
        }}
      >
        <span className="fs-picker-trigger-value">{current?.name ?? '—'}</span>
        <span className="fs-picker-trigger-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {createPortal(
        <>
          <div
            className={`fs-plate-scrim${open ? ' open' : ''}`}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={gridRef}
            className={`fs-plate-grid${open ? ' open' : ''}`}
            role="listbox"
            aria-labelledby={labelId}
            aria-hidden={!open}
          >
            {filtering && availableCount > 0 && (
              <div className="fs-plate-section fs-plate-section--available">Available</div>
            )}
            {filtering && unavailableCount > 0 && (
              <div className="fs-plate-section fs-plate-section--unavailable">Not in inventory</div>
            )}
            {options.map((opt) => {
              const stocked = isAvailable(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={opt.id === value}
                  className={`fs-plate-option${opt.id === value ? ' selected' : ''}${
                    stocked ? '' : ' fs-plate-option--unavailable'
                  }`}
                  tabIndex={open ? 0 : -1}
                  onClick={() => pick(opt.id)}
                >
                  {renderThumb ? renderThumb(opt) : <PlateSwatch name={opt.name} />}
                  <span className="fs-plate-info">
                    <span className="fs-plate-name">{opt.name}</span>
                    {opt.sub && <span className="fs-plate-sub">{opt.sub}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
