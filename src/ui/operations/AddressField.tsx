import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  beginAddressSession,
  placesEnabled,
  type AddressPick,
  type AddressSession,
  type AddressSuggestion,
} from '@ui/hooks';

/**
 * AddressField — the "Location / address" input with Google Places autocomplete
 * (StartOperationModal). Reuses the TextField (`fs-field-*`) classes so it looks
 * identical to every other field, but owns its <input> for the combobox wiring the
 * primitive doesn't expose (keyboard nav, aria-activedescendant, a results dropdown).
 *
 * Offline-first: when autocomplete is off (no key) or the device is offline, this is
 * a plain text box — you type any address by hand, exactly like the other fields.
 *
 * The dropdown portals to document.body (the VisualGridPicker precedent) — the Modal
 * body scrolls (`overflow: auto`), so an in-flow absolute dropdown gets clipped at the
 * modal edge. Fixed-position geometry is measured from the input on open and re-measured
 * on scroll/resize; z-index 400 = the picker tier, above the form modal (300).
 */
export interface AddressFieldProps {
  label: string;
  value: string;
  /** Free typing — the raw field text. */
  onChange: (value: string) => void;
  /** A suggestion was chosen — carries the formatted address + coordinates. */
  onPick: (pick: AddressPick) => void;
  placeholder?: string;
}

const MIN_CHARS = 3;
const DEBOUNCE_MS = 250;

/** Split `text` into plain/emphasized segments from the API's match ranges —
 *  the typed portion renders heavier, per the accepted mockup. */
function emphasize(text: string, ranges: { start: number; end: number }[] | undefined) {
  if (!ranges?.length) return text;
  const nodes: ReactNode[] = [];
  let pos = 0;
  for (const { start, end } of [...ranges].sort((a, b) => a.start - b.start)) {
    if (start > pos) nodes.push(text.slice(pos, start));
    if (end > start) nodes.push(<b key={start}>{text.slice(start, end)}</b>);
    pos = Math.max(pos, end);
  }
  if (pos < text.length) nodes.push(text.slice(pos));
  return nodes;
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function AddressField({ label, value, onChange, onPick, placeholder }: AddressFieldProps) {
  const enabled = placesEnabled();
  const id = useId();
  const listId = useId();

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);

  const sessionRef = useRef<AddressSession | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);
  const justPickedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null);

  // Geometry for the portaled dropdown — measured from the input, re-measured on
  // scroll (capture: the Modal body is the scroller) and resize while open.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const r = inputRef.current?.getBoundingClientRect();
      if (r) setAnchor({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, suggestions]);

  useEffect(() => {
    if (!enabled) return;
    // Selecting a suggestion writes the address back via onChange; skip the lookup
    // that value change would otherwise trigger (no dropdown right after a pick).
    if (justPickedRef.current) {
      justPickedRef.current = false;
      setOpen(false);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = value.trim();
    if (q.length < MIN_CHARS || !navigator.onLine) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const seq = ++seqRef.current;
    timerRef.current = setTimeout(async () => {
      try {
        if (!sessionRef.current) sessionRef.current = await beginAddressSession();
        const results = await sessionRef.current.suggest(q);
        if (seq !== seqRef.current) return; // a newer keystroke superseded this response
        setSuggestions(results);
        setActive(-1);
        setOpen(results.length > 0);
      } catch (err) {
        // offline, load failure, or API error — fall back to plain typing
        if (import.meta.env.DEV) console.warn('[AddressField] lookup failed:', err);
        if (seq === seqRef.current) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (seq === seqRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, enabled]);

  async function choose(s: AddressSuggestion) {
    setOpen(false);
    setSuggestions([]);
    setActive(-1);
    try {
      const pick = await s.resolve();
      justPickedRef.current = true;
      onChange(pick.address);
      onPick(pick);
    } catch {
      // resolution failed — keep whatever the user typed
    } finally {
      sessionRef.current = null; // a pick closes the billing session; next lookup starts fresh
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      const s = suggestions[active];
      if (s) {
        e.preventDefault();
        void choose(s);
      }
    } else if (e.key === 'Escape') {
      e.stopPropagation(); // close the dropdown only — not the Modal around it
      setOpen(false);
    }
  }

  return (
    <div className="fs-field">
      <label className="fs-field-label" htmlFor={id}>
        {label}
      </label>
      <div className="fs-addr-wrap">
        <input
          id={id}
          ref={inputRef}
          className="fs-field-input fs-field-input--op"
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          role={enabled ? 'combobox' : undefined}
          aria-expanded={enabled ? open : undefined}
          aria-controls={enabled ? listId : undefined}
          aria-autocomplete={enabled ? 'list' : undefined}
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={enabled ? onKeyDown : undefined}
          onBlur={() => setOpen(false)}
        />
        {loading && <span className="fs-addr-spin" aria-hidden="true" />}
        {open &&
          suggestions.length > 0 &&
          anchor &&
          createPortal(
            <ul
              className="fs-addr-list"
              id={listId}
              role="listbox"
              style={{ top: anchor.top, left: anchor.left, width: anchor.width }}
            >
            {suggestions.map((s, i) => (
              <li
                key={i}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`fs-addr-opt${i === active ? ' fs-addr-opt--active' : ''}`}
                // keep the input focused so onBlur doesn't close the list before the click
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => void choose(s)}
              >
                <span className="fs-addr-opt-pin">
                  <PinIcon />
                </span>
                <span className="fs-addr-opt-text">
                  <span className="fs-addr-opt-main">{emphasize(s.main, s.mainMatches)}</span>
                  {s.secondary && <span className="fs-addr-opt-sec">{s.secondary}</span>}
                </span>
              </li>
            ))}
              <li className="fs-addr-attrib" aria-hidden="true">
                powered by <strong>Google</strong>
              </li>
            </ul>,
            document.body,
          )}
      </div>
    </div>
  );
}
