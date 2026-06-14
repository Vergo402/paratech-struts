import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, type ReactNode } from 'react';
import { claimOverlay, releaseOverlay, isTopOverlay, overlayContains } from './overlay';

/**
 * Modal — the center-anchored STOP surface (modal.md). For destructive or
 * terminal confirmations, >60vh forms, and blocking alerts ONLY — everyday
 * choices are sheets. Radix Dialog supplies the focus trap, aria-modal, inert
 * background, Esc-cancels, and focus return. Cancel is always the safe
 * default: in the `destructive` variant the element marked
 * `data-modal-cancel` receives initial focus and the destructive action is
 * never auto-focused, never the backdrop, never Enter-by-default.
 */
export interface ModalProps {
  open: boolean;
  /** Dismissal (Esc, backdrop, Cancel) — commits nothing. */
  onClose: () => void;
  title: string;
  /**
   * confirm | destructive | form | alert. `form` pins header/footer and
   * scrolls the body (85vh max); `destructive` moves initial focus to the
   * [data-modal-cancel] element in the footer.
   */
  variant?: 'confirm' | 'destructive' | 'form' | 'alert';
  children: ReactNode;
  /** Action row — mark the safe default with data-modal-cancel. */
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, variant = 'confirm', children, footer }: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  // Modal is controlled (no Dialog.Trigger), so Radix has no opener to return
  // focus to — remember it ourselves; focus must never land on <body>.
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  // Stable claim identity — Esc/outside guards compare against the stack top.
  const claimRef = useRef(() => closeRef.current());

  // One peer overlay at a time — claim while open. container + opener let a
  // child overlay opened from inside this modal STACK instead of closing it
  // (the #220 form hosts the division sheet + plate grids).
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const claim = claimRef.current; // stable — set once at init
    claimOverlay(claim, {
      container: () => contentRef.current,
      opener: openerRef.current,
    });
    return () => releaseOverlay(claim);
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fs-scrim" />
        <Dialog.Content
          ref={contentRef}
          className={`fs-modal fs-modal--${variant}`}
          aria-modal="true"
          onEscapeKeyDown={(e) => {
            // A child overlay (e.g. the portaled plate grid) is above us —
            // Esc closes the child, never the parent underneath it.
            if (!isTopOverlay(claimRef.current)) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            // A tap inside a portaled child overlay is not an outside-dismiss.
            // Form modals hold entered data — an outside tap must never discard
            // it (close via the X or a footer Cancel only). Confirms still
            // dismiss on an outside tap, which IS the safe cancel.
            if (variant === 'form' || overlayContains(e.target as Node)) e.preventDefault();
          }}
          onOpenAutoFocus={(e) => {
            if (variant !== 'destructive') return;
            // The marker may sit on the control itself or wrap it.
            const marked = contentRef.current?.querySelector<HTMLElement>('[data-modal-cancel]');
            const focusable = 'button, [href], input, select, textarea, [tabindex]';
            const cancel = marked?.matches(focusable)
              ? marked
              : marked?.querySelector<HTMLElement>(focusable);
            if (cancel) {
              e.preventDefault();
              cancel.focus();
            }
          }}
          onCloseAutoFocus={(e) => {
            if (openerRef.current?.isConnected) {
              e.preventDefault();
              openerRef.current.focus();
            }
          }}
        >
          <Dialog.Title className="fs-modal-title">{title}</Dialog.Title>
          {/* The body IS the dialog description — Description asChild gives it
              Radix's own description id, which Content's aria-describedby
              targets by default (a custom id trips Radix's dev warning). */}
          <Dialog.Description asChild>
            <div className="fs-modal-body">{children}</div>
          </Dialog.Description>
          {footer && <div className="fs-modal-footer">{footer}</div>}
          {/* Explicit close, top-right. DOM-last so it never steals the initial
              focus from a form's first field; absolute-positioned via CSS. With
              form modals no longer dismissing on an outside tap, this is the
              deliberate way out. */}
          <Dialog.Close asChild>
            <button type="button" className="fs-modal-close" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
