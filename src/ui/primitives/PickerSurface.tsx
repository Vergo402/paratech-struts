import type { ReactNode, RefObject } from 'react';
import { useIsDesktop } from './useMediaQuery';
import { Sheet } from './Sheet';
import { Popover } from './Popover';

/**
 * PickerSurface — the surface-adaptive container for a single-select picker
 * (picker.md/sheet.md §Surface adaptations, ADR-032): a bottom Sheet on phone, an
 * anchored Popover dropdown on desktop (≥768px). Same children, same commit
 * rules, ONE render of the option rows. The phone branch is the unchanged Sheet —
 * byte-identical; the desktop branch drops the dropdown down from the trigger
 * instead of rising from the bottom.
 */
export interface PickerSurfaceProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The trigger, for desktop dropdown anchoring (unused by the phone Sheet). */
  anchor: RefObject<HTMLElement>;
  children: ReactNode;
}

export function PickerSurface({ open, onClose, title, anchor, children }: PickerSurfaceProps) {
  const isDesktop = useIsDesktop();
  return isDesktop ? (
    <Popover open={open} onClose={onClose} title={title} anchor={anchor}>
      {children}
    </Popover>
  ) : (
    <Sheet open={open} onClose={onClose} title={title}>
      {children}
    </Sheet>
  );
}
