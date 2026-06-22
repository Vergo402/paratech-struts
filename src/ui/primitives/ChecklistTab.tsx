/**
 * ChecklistTab — the persistent edge tab that summons a checklist side-drawer
 * (ADR-019, side-drawer.md "summon tab"). A thumb-reachable checkmark-box anchored
 * to the right screen edge; the caller hides it while its drawer is open (Close +
 * Esc dismiss the drawer). Shared by the Command (IC Command Checklist) and
 * Operations (Task Level) screens so the affordance never diverges.
 */
export interface ChecklistTabProps {
  onOpen: () => void;
  label: string;
}

export function ChecklistTab({ onOpen, label }: ChecklistTabProps) {
  return (
    <button type="button" className="fs-checklist-tab" onClick={onOpen} aria-label={label}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="3" y="2.5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6.5 9.5L9 12L13.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
