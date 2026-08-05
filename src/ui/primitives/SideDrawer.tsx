import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, type ReactNode } from 'react';
import { claimOverlay, releaseOverlay, isTopOverlay, overlayContains, hasOverlayClaim } from './overlay';
import { useIsDesktop } from './useMediaQuery';

/**
 * SideDrawer — the edge-anchored companion panel (side-drawer.md / ADR-019).
 * Surface-adaptive (ADR-032), with two genuinely different postures:
 *
 * - **Phone** — a MODAL drawer: structurally the Sheet with a horizontal origin
 *   (slides in from the right edge over the scrim, focus-trapped). Reuses the
 *   Sheet's overlay-claim lifecycle + the three Esc/outside/close-focus guards
 *   verbatim, so a drawer opened over another overlay nests correctly and the
 *   opener gets focus back on close.
 * - **Desktop (≥768px)** — a NON-MODAL docked companion column beside the board
 *   (operations.css owns the column geometry); the board stays live (no scrim, no
 *   focus trap). Esc still closes + restores opener focus via a local listener —
 *   NOT the overlay stack, so the canvas beside it is never inerted.
 *
 * Controlled (no trigger): `open` / `onClose`. The persistent edge "summon tab"
 * (side-drawer.md OQ) is deferred — this opens from a caller (e.g. a card's
 * Details button). Swipe-to-edge dismiss (OQ1) is deferred too; ship Close+Esc
 * (+ scrim on phone).
 */
export interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

function CloseGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Phone — the modal overlay drawer (Sheet's lifecycle, horizontal origin). */
function PhoneDrawer({ open, onClose, title, children }: SideDrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const claimRef = useRef(() => closeRef.current());

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const claim = claimRef.current; // stable — set once at init
    claimOverlay(claim, { container: () => contentRef.current, opener: openerRef.current });
    return () => releaseOverlay(claim);
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fs-scrim" />
        <Dialog.Content
          ref={contentRef}
          className="fs-drawer fs-drawer--phone"
          aria-modal="true"
          aria-describedby={undefined} /* the body is the content, not a description */
          onEscapeKeyDown={(e) => {
            if (!isTopOverlay(claimRef.current)) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (overlayContains(e.target as Node)) e.preventDefault();
          }}
          onCloseAutoFocus={(e) => {
            if (openerRef.current?.isConnected) {
              e.preventDefault();
              openerRef.current.focus();
            }
          }}
        >
          <div className="fs-drawer-head">
            <Dialog.Title className="fs-drawer-title">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="fs-drawer-close" aria-label="Close">
                <CloseGlyph />
              </button>
            </Dialog.Close>
          </div>
          <div className="fs-drawer-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Desktop — the non-modal docked column. The board beside it stays live. */
function DockDrawer({ open, onClose, title, children }: SideDrawerProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeBtnRef.current?.focus();
    // Local Esc — NOT the overlay stack (the board must stay live). Restore opener.
    // #459: the dock never claims the overlay stack itself (by design — the board
    // stays live beside it), but a Modal/Sheet/Popover opened OVER the dock (e.g.
    // from a control inside it) does claim it, and Radix doesn't stopPropagate its
    // own Esc handling. So an Esc meant for that nested overlay was also closing
    // the dock underneath and yanking focus to the drawer's opener. Defer to any
    // claimed overlay — it owns Esc while it's open; the dock only reacts once the
    // stack is empty again.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (hasOverlayClaim()) return;
      e.stopPropagation();
      const opener = openerRef.current;
      closeRef.current();
      if (opener?.isConnected) opener.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  return (
    <aside className="fs-drawer fs-drawer--dock" role="complementary" aria-label={title}>
      <div className="fs-drawer-head">
        <h2 className="fs-drawer-title">{title}</h2>
        <button ref={closeBtnRef} type="button" className="fs-drawer-close" aria-label="Close" onClick={onClose}>
          <CloseGlyph />
        </button>
      </div>
      <div className="fs-drawer-body">{children}</div>
    </aside>
  );
}

export function SideDrawer(props: SideDrawerProps) {
  // The breakpoint picks the POSTURE (modal vs companion) — a structural choice
  // CSS can't make. jsdom has no matchMedia → phone branch (the test default).
  return useIsDesktop() ? <DockDrawer {...props} /> : <PhoneDrawer {...props} />;
}
