import { ChecklistTab } from 'fieldshore-v4';

// ChecklistTab — the persistent edge tab that summons a checklist side-drawer
// (ADR-019). A thumb-reachable checkmark-box anchored to the right screen edge,
// shared by the Command (IC Command Checklist) and Operations (Task Level) screens.

export const CommandChecklist = () => (
  <div
    style={{
      position: 'relative',
      width: 200,
      height: 120,
      borderRadius: 'var(--radius-card)',
      border: '1px solid var(--border)',
      background: 'var(--surface)',
    }}
  >
    <ChecklistTab onOpen={() => {}} label="Open IC Command Checklist" />
  </div>
);

export const TaskLevel = () => (
  <div
    style={{
      position: 'relative',
      width: 200,
      height: 120,
      borderRadius: 'var(--radius-card)',
      border: '1px solid var(--border)',
      background: 'var(--surface)',
    }}
  >
    <ChecklistTab onOpen={() => {}} label="Open Task Level Checklist" />
  </div>
);
