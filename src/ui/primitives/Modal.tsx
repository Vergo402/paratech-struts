import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { claimOverlay, releaseOverlay } from './overlay';

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
  const bodyId = useId(); // the body IS the dialog description (aria-describedby)
  // Modal is controlled (no Dialog.Trigger), so Radix has no opener to return
  // focus to — remember it ourselves; focus must never land on <body>.
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // One overlay at a time — claim while open.
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const close = () => closeRef.current();
    claimOverlay(close);
    return () => releaseOverlay(close);
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fs-scrim" />
        <Dialog.Content
          ref={contentRef}
          className={`fs-modal fs-modal--${variant}`}
          aria-modal="true"
          aria-describedby={bodyId}
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
          <div id={bodyId} className="fs-modal-body">
            {children}
          </div>
          {footer && <div className="fs-modal-footer">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
