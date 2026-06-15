import * as RadixPopover from '@radix-ui/react-popover';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { claimOverlay, releaseOverlay, isTopOverlay, overlayContains } from './overlay';

/**
 * Popover — the desktop surface twin of Sheet (picker.md/sheet.md §Surface
 * adaptations, ADR-032): a "floating panel beside the trigger" for single-select
 * pickers on wider surfaces. An anchored dropdown (`side="bottom"`) — same
 * content, same commit rules as the Sheet, just not a bottom-rise. Non-modal so
 * the parent stays in context; Radix supplies Esc + outside-click + focus-return.
 *
 * Mirrors Sheet's overlay-claim lifecycle so a dropdown opened INSIDE a form
 * Modal (the #220 Division/Building pickers) peels on Esc first instead of
 * closing the form, and a click inside the portaled panel never reads as the
 * Modal's outside-dismiss. The existing trigger button is the anchor — kept
 * verbatim (anchored via `virtualRef`, never prop-injected), so it keeps its
 * hand-authored `aria-expanded` and its open-only `onClick`.
 */
export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the floating panel (the picker's field label). */
  title: string;
  /** The trigger element the dropdown anchors to. */
  anchor: RefObject<HTMLElement>;
  children: ReactNode;
}

export function Popover({ open, onClose, title, anchor, children }: PopoverProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  // Stable claim identity — the Esc/outside guards compare against the stack top.
  const claimRef = useRef(() => closeRef.current());

  // Claim while open so a dropdown opened from inside a form Modal stacks above
  // it (Esc peels the dropdown, not the form); release on close. Mirrors Sheet.
  useEffect(() => {
    if (!open) return;
    const claim = claimRef.current;
    claimOverlay(claim, { container: () => contentRef.current, opener: anchor.current });
    return () => releaseOverlay(claim);
  }, [open, anchor]);

  return (
    <RadixPopover.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <RadixPopover.Anchor virtualRef={anchor} />
      <RadixPopover.Portal>
        <RadixPopover.Content
          ref={contentRef}
          className="fs-popover"
          aria-label={title}
          side="bottom"
          align="start"
          sideOffset={4}
          onEscapeKeyDown={(e) => {
            if (!isTopOverlay(claimRef.current)) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            const target = e.target as Node;
            // A tap inside a portaled child overlay, or on the trigger itself,
            // is never an outside-dismiss (the trigger is open-only, like Sheet).
            if (overlayContains(target) || anchor.current?.contains(target)) e.preventDefault();
          }}
          onCloseAutoFocus={(e) => {
            if (anchor.current?.isConnected) {
              e.preventDefault();
              anchor.current.focus();
            }
          }}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
