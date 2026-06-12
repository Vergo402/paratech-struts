import { useRouterState } from '@tanstack/react-router';

/** Build identity shown as the header's mono version tag. */
const APP_VERSION = 'v4.0.0-slice.1';

const TITLES: Record<string, string> = {
  '/quickfind': 'FieldShore',
  '/operations': 'Operations',
  '/inventory': 'Inventory',
  '/command': 'Command',
  '/settings': 'Settings',
  '/gallery': 'Gallery',
};

/**
 * AppHeader — the command header framing every screen (design-system
 * AppHeader): the screen title at headline-1 with a small mono version tag,
 * on the card surface above the scroll pane. The department subtitle slot
 * exists in the design; the guest-first slice has no department yet, so it
 * stays empty until the join flow lands (Phase I).
 *
 * On Quick Find the title is the BRAND LOCKUP, rendered as HTML-styled text
 * per logo-and-mark.md — "Field" in primary ink, "Shore" in the accent, both
 * 700 — never the wordmark.svg's baked-in text.
 */
export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = TITLES[pathname] ?? 'FieldShore';
  return (
    <header className="fs-header">
      {title === 'FieldShore' ? (
        <span className="fs-header-title fs-header-brand">
          Field<b>Shore</b>
        </span>
      ) : (
        <span className="fs-header-title">{title}</span>
      )}
      <span className="fs-header-ver">{APP_VERSION}</span>
    </header>
  );
}
