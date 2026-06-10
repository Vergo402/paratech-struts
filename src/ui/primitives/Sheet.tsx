import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, type ReactNode } from 'react';
import { claimOverlay, releaseOverlay } from './overlay';

/** Drag distance past which releasing the handle dismisses the sheet. */
const DISMISS_THRESHOLD_PX = 80;

/**
 * Sheet — the bottom-anchored slide-up surface for everyday choices
 * (sheet.md): pickers, short forms, action lists. Parent stays visible;
 * non-destructive only (destructive/terminal confirms are modals). Top-corner
 * radius, 60vh max, 64pt drag handle (the learned gesture — also a labeled
 * Close control), handle-drag and backdrop both dismiss. The scroll body
 * carries the v3.5.1 iOS hardening verbatim (touch-action: pan-y +
 * translateZ(0) + overscroll containment) — see primitives.css.
 */
export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; startY: number; dy: number } | null>(null);
  // Controlled (no Dialog.Trigger) — remember the opener for focus return.
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const close = () => closeRef.current();
    claimOverlay(close);
    return () => releaseOverlay(close);
  }, [open]);

  const onHandlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    drag.current = { pointerId: e.pointerId, startY: e.clientY, dy: 0 };
    // jsdom has no pointer capture — guard, don't polyfill (L-9 spirit).
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onHandlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current || e.pointerId !== drag.current.pointerId) return;
    const dy = Math.max(0, e.clientY - drag.current.startY);
    drag.current.dy = dy;
    if (contentRef.current) contentRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onHandlePointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current || e.pointerId !== drag.current.pointerId) return;
    const { dy } = drag.current;
    drag.current = null;
    if (contentRef.current) contentRef.current.style.transform = '';
    if (dy > DISMISS_THRESHOLD_PX) onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fs-scrim" />
        <Dialog.Content
          ref={contentRef}
          className="fs-sheet"
          aria-describedby={undefined} /* rows are the content, not a description */
          onCloseAutoFocus={(e) => {
            if (openerRef.current?.isConnected) {
              e.preventDefault();
              openerRef.current.focus();
            }
          }}
        >
          <button
            type="button"
            className="fs-sheet-handle"
            aria-label="Close"
            onClick={onClose}
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerEnd}
            onPointerCancel={onHandlePointerEnd}
          >
            <span className="fs-sheet-handle-bar" aria-hidden="true" />
          </button>
          <Dialog.Title className="fs-sheet-title">{title}</Dialog.Title>
          <div className="fs-sheet-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
