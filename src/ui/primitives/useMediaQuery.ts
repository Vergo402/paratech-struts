import { useEffect, useState } from 'react';

/**
 * useMediaQuery — SPA surface detection (ADR-032). The CSS breakpoints stay the
 * source of truth; this mirrors ONE of them into JS so a component can swap its
 * OVERLAY PRIMITIVE (Sheet ↔ Popover) — a structural choice CSS can't make —
 * while the phone path stays byte-identical. Mirrors the proven `theme.tsx`
 * pattern (lazy init + a `change` listener + the `typeof window.matchMedia`
 * guard). Test/SSR-safe: no matchMedia → returns the fallback, never throws
 * (jsdom has no matchMedia — so picker tests keep the phone/Sheet branch).
 *
 * Lives in primitives (not ui/hooks): it is a pure presentation hook with no
 * @data dependency, and PickerSurface — a primitive — is its consumer. ui/hooks
 * is the @data seam; importing its barrel here would couple primitives to data.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : fallback,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange(); // resync in case matchMedia became available or the query changed
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/**
 * useIsDesktop — true at ≥768px, the tablet/command-post breakpoint
 * (spacing-grid.md §Surface breakpoints). At/above it pickers anchor as a
 * dropdown; below, they rise as a bottom sheet (picker.md/sheet.md §Surface
 * adaptations). Default = phone (false) so the test env keeps the Sheet branch.
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}

/**
 * useHasMouse — true when the PRIMARY input is a mouse/trackpad (a fine pointer
 * that can hover): desktops and laptops. False on every touchscreen — phones AND
 * field tablets, regardless of screen width — because the status-commit slide's
 * wet-glove ghost-tap defense (ADR-026) must stay wherever a finger is the input.
 * On a mouse the slide is just clumsy and the ghost-tap risk is gone, so the
 * commit swaps to a tap-once button (ADR-034). Width is deliberately NOT used:
 * the problem is the pointer, not the screen size. Default = no mouse (false) so
 * the test/SSR env keeps the slide branch.
 */
export function useHasMouse(): boolean {
  return useMediaQuery('(hover: hover) and (pointer: fine)');
}
