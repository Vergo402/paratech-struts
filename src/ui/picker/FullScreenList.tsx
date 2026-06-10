import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import { claimOverlay, releaseOverlay, TextField } from '@ui/primitives';
import type { SheetPickerOption } from './BottomSheetPicker';

/**
 * FullScreenList — picker variant 3 (picker.md): 8+ options, or anything
 * needing search/filter. Search appears only when the set exceeds 7 items
 * (universal rule 1) and filters locally — all data is on-device, no async.
 * Single-select: a row tap commits immediately and closes; Cancel leaves the
 * value untouched. DELIBERATE DEVIATION (session log): ships as a fullscreen
 * overlay rather than a pushed route — no 8+ consumer exists until S4+, and
 * the route-push form is a screen-spec concern, not the primitive's.
 */
export interface FullScreenListProps<T extends string> {
  open: boolean;
  onClose: () => void;
  title: string;
  options: readonly SheetPickerOption<T>[];
  value: T | null;
  onSelect: (value: T) => void;
}

export function FullScreenList<T extends string>({
  open,
  onClose,
  title,
  options,
  value,
  onSelect,
}: FullScreenListProps<T>) {
  const [query, setQuery] = useState('');
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setQuery(''); // fresh search per visit
    const close = () => closeRef.current();
    claimOverlay(close);
    return () => releaseOverlay(close);
  }, [open]);

  const searchable = options.length > 7;
  const shown = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.sub?.toLowerCase().includes(q),
    );
  }, [options, query, searchable]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Content
          className="fs-fullscreen"
          aria-describedby={undefined} /* the list is the content, not a description */
>
          <header className="fs-fullscreen-head">
            <Dialog.Title className="fs-fullscreen-title">{title}</Dialog.Title>
            <button type="button" className="fs-fullscreen-cancel" onClick={onClose}>
              Cancel
            </button>
          </header>
          {searchable && (
            <div className="fs-fullscreen-search">
              <TextField
                label="Search"
                value={query}
                onChange={setQuery}
                inputMode="search"
                placeholder="Filter the list"
              />
            </div>
          )}
          <div className="fs-fullscreen-body" role="listbox" aria-label={title}>
            {shown.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={`fs-picker-row${opt.value === value ? ' fs-picker-row--selected' : ''}`}
                onClick={() => {
                  onSelect(opt.value);
                  onClose();
                }}
              >
                <span className="fs-picker-row-text">
                  <span className="fs-picker-row-label">{opt.label}</span>
                  {opt.sub && <span className="fs-picker-row-sub">{opt.sub}</span>}
                </span>
                {opt.value === value && (
                  <span className="fs-picker-row-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            ))}
            {shown.length === 0 && <p className="fs-fullscreen-nomatch">No matches</p>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
