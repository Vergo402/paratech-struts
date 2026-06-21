import { useState } from 'react';
import { newId } from '@core/id';
import type { OrgPositionKind } from '@core/schema';
import { libraryItemsAddableUnder, nextChildOrder } from '@core/org';
import { Sheet, TextField, Button, Segmented } from '@ui/primitives';
import { useOrg } from '@ui/hooks';
import { useOrgCommit } from './useOrgCommit';

const CUSTOM_KINDS: { value: OrgPositionKind; label: string }[] = [
  { value: 'group', label: 'Group' },
  { value: 'division', label: 'Division' },
  { value: 'branch', label: 'Branch' },
  { value: 'unit', label: 'Unit' },
  { value: 'single-resource', label: 'Resource' },
];

/** Add a position beneath `parentId` — from the NIMS library (filtered to what may
 *  attach under this parent's kind, keeping the tree doctrine-sane) or a free-form
 *  custom position (the escape hatch). */
export function AddPositionSheet({
  open,
  onClose,
  parentId,
  parentKind,
  parentTitle,
}: {
  open: boolean;
  onClose: () => void;
  parentId: string;
  parentKind: OrgPositionKind;
  parentTitle: string;
}) {
  const positions = useOrg();
  const emit = useOrgCommit();
  const [customTitle, setCustomTitle] = useState('');
  const [customKind, setCustomKind] = useState<OrgPositionKind>('group');

  const items = libraryItemsAddableUnder(parentKind);
  const groups = [...new Set(items.map((i) => i.group))];

  const add = (title: string, kind: OrgPositionKind) => {
    emit({
      type: 'PositionAdded',
      position: {
        id: newId(),
        title,
        kind,
        parentId,
        builtIn: false,
        order: nextChildOrder(positions, parentId),
        assignedResources: [],
      },
    });
    onClose();
  };

  const addCustom = () => {
    const t = customTitle.trim();
    if (!t) return;
    add(t, customKind);
    setCustomTitle('');
  };

  return (
    <Sheet open={open} onClose={onClose} title={`Add under ${parentTitle}`}>
      {groups.map((g) => (
        <div key={g}>
          <div className="fs-cmd-eyebrow" style={{ margin: 'var(--space-3) 0 var(--space-2)' }}>
            {g}
          </div>
          <ul className="fs-assign-list">
            {items
              .filter((i) => i.group === g)
              .map((i) => (
                <li key={i.key}>
                  <button type="button" className="fs-assign-row" onClick={() => add(i.title, i.kind)}>
                    <span className="fs-assign-name">{i.title}</span>
                    <span className="fs-assign-meta">add ›</span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}

      <div className="fs-cmd-eyebrow" style={{ margin: 'var(--space-4) 0 var(--space-2)' }}>
        Custom position
      </div>
      <Segmented options={CUSTOM_KINDS} value={customKind} onChange={setCustomKind} aria-label="Custom position kind" />
      <div className="fs-assign-individual" style={{ marginTop: 'var(--space-2)' }}>
        <TextField label="Title" value={customTitle} onChange={setCustomTitle} placeholder="e.g. Tunneling Group Supervisor" size="standard" />
        <Button variant="secondary" size="standard" disabled={!customTitle.trim()} onPress={addCustom}>
          Add
        </Button>
      </div>
    </Sheet>
  );
}
