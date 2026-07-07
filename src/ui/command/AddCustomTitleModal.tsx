import { useState } from 'react';
import { Modal, Button, TextField } from '@ui/primitives';
import { BottomSheetPicker } from '@ui/picker';
import { useApparatusTypes } from '@ui/hooks';
import { POSITION_CLASS_GROUPS, kindLabel } from '@core/org';
import type { OrgPositionKind, TeamMember } from '@core/schema';

// Add a custom ICS title to the department library (#323). Class-first like the add
// sheet: pick a class group; Resources reveals a sub-kind; a Strike Team / Task Force
// reveals a composition editor (unit type × count) whose members auto-spawn when the
// template is later placed on the chart.

const GROUP_OPTIONS = POSITION_CLASS_GROUPS.map((g) => ({ value: g.key, label: g.label }));
const groupByKey = (key: string) => POSITION_CLASS_GROUPS.find((g) => g.key === key) ?? POSITION_CLASS_GROUPS[0]!;
const isTeamKind = (k: OrgPositionKind) => k === 'strike-team' || k === 'task-force';

export interface AddCustomTitleModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (title: string, kind: OrgPositionKind, members?: TeamMember[]) => Promise<unknown> | void;
}

export function AddCustomTitleModal({ open, onClose, onAdd }: AddCustomTitleModalProps) {
  const { allNames } = useApparatusTypes();
  const [title, setTitle] = useState('');
  const [groupKey, setGroupKey] = useState('group');
  const [subKind, setSubKind] = useState<OrgPositionKind>('group');
  const [members, setMembers] = useState<TeamMember[]>([{ type: 'Engine', count: 1 }]);

  const group = groupByKey(groupKey);
  const multi = group.kinds.length > 1;
  const kind: OrgPositionKind = multi ? subKind : group.kinds[0]!;
  const team = isTeamKind(kind);
  // ICS: a Strike Team is the SAME kind and type — one unit type × a count. A Task Force
  // is the mix. So a Strike Team's composition is a single row.
  const singleType = kind === 'strike-team';
  const shownMembers = singleType ? members.slice(0, 1) : members;
  const totalUnits = shownMembers.reduce((a, m) => a + (m.count || 0), 0);

  const reset = () => {
    setTitle('');
    setGroupKey('group');
    setSubKind('group');
    setMembers([{ type: 'Engine', count: 1 }]);
  };
  const close = () => {
    reset();
    onClose();
  };

  const changeGroup = (key: string) => {
    setGroupKey(key);
    setSubKind(groupByKey(key).kinds[0]!);
  };

  const setMember = (i: number, patch: Partial<TeamMember>) =>
    setMembers((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const addMember = () => setMembers((ms) => [...ms, { type: 'Engine', count: 1 }]);
  const removeMember = (i: number) => setMembers((ms) => ms.filter((_, j) => j !== i));

  const submit = async () => {
    const t = title.trim();
    if (!t) return;
    await onAdd(t, kind, team ? shownMembers.filter((m) => m.count > 0) : undefined);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add custom title"
      variant="form"
      footer={
        <>
          <Button variant="secondary" onPress={close}>
            <span data-modal-cancel>Cancel</span>
          </Button>
          <Button variant="primary" onPress={submit} disabled={!title.trim()} disabledReason="Enter a title">
            Add
          </Button>
        </>
      }
    >
      <TextField label="Title" value={title} onChange={setTitle} placeholder="e.g. Tunneling Group Supervisor" />
      <BottomSheetPicker label="Class" options={GROUP_OPTIONS} value={groupKey} onSelect={changeGroup} />
      {multi && (
        <BottomSheetPicker
          label="Kind"
          options={group.kinds.map((k) => ({ value: k, label: kindLabel(k) }))}
          value={subKind}
          onSelect={(v) => setSubKind(v as OrgPositionKind)}
        />
      )}

      {team && (
        <div className="fs-newtitle-team">
          <span className="fs-newtitle-caption">
            {singleType ? 'Members (one unit type — same kind and type)' : 'Members (unit type × count)'}
          </span>
          {shownMembers.map((m, i) => (
            <div key={i} className="fs-newtitle-member">
              <div className="fs-newtitle-member-type">
                <BottomSheetPicker
                  label="Unit type"
                  options={allNames.map((t) => ({ value: t, label: t }))}
                  value={m.type}
                  onSelect={(v) => setMember(i, { type: v })}
                />
              </div>
              <div className="fs-newtitle-member-count">
                <TextField
                  label="Count"
                  value={String(m.count)}
                  onChange={(v) => setMember(i, { count: Math.max(1, Number(v) || 1) })}
                  inputMode="numeric"
                  size="standard"
                />
              </div>
              {!singleType && members.length > 1 && (
                <Button variant="tertiary" size="standard" onPress={() => removeMember(i)}>
                  Remove
                </Button>
              )}
            </div>
          ))}
          {!singleType && (
            <Button variant="secondary" size="standard" onPress={addMember}>
              Add unit type
            </Button>
          )}
          <span className="fs-newtitle-summary">
            Adds 1 {kindLabel(kind)} Leader + {totalUnits} units ({shownMembers.map((m) => `${m.count} ${m.type}`).join(', ')})
          </span>
        </div>
      )}
    </Modal>
  );
}
