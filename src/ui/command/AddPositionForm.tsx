import { useState } from 'react';
import type { FieldShoreEvent, OrgPositionKind, TeamMember } from '@core/schema';
import { classGroupsAddableUnder, libraryItemsAddableUnder, kindLabel, nextChildOrder } from '@core/org';
import { newId } from '@core/id';
import { TextField, Button } from '@ui/primitives';
import { useOrg, useOperation, useDeviceUid, useCommitMany, useCustomTitles } from '@ui/hooks';
import { useOrgCommit } from './useOrgCommit';
import { ClassSelector } from './ClassSelector';

const memberSummary = (members: TeamMember[]): string => members.map((m) => `${m.count} ${m.type}`).join(', ');

/**
 * Add a position beneath `parentId` — class-first (#323). Rendered INLINE inside the
 * node panel (#374 — the single-flow overhaul, no stacked modal), so `onDone` returns
 * to the panel menu rather than closing an overlay. The top is an ICS-class chip row
 * (only classes legal under this parent); selecting a class lists that class's roles
 * (built-in + the department's custom titles), each a tap-to-add. A quick "+ new title"
 * creates a one-off that BOTH saves into the custom library AND places it. Strike Team /
 * Task Force titles that carry a composition spawn their member slots as unassigned
 * single-resource children in one batch. Leaf parents show an empty state. Full title
 * management lives in Settings.
 */
export function AddPositionForm({
  parentId,
  parentKind,
  onDone,
}: {
  parentId: string;
  parentKind: OrgPositionKind;
  onDone: () => void;
}) {
  const positions = useOrg();
  const op = useOperation();
  const emit = useOrgCommit();
  const commitMany = useCommitMany();
  const getUid = useDeviceUid();
  const { titles, add: addCustomTitle } = useCustomTitles();

  const groups = classGroupsAddableUnder(parentKind);
  const [selKey, setSelKey] = useState(groups[0]?.key ?? '');
  const [newTitle, setNewTitle] = useState('');
  const [newKind, setNewKind] = useState<OrgPositionKind | null>(null);

  const group = groups.find((g) => g.key === selKey) ?? groups[0];
  const multi = (group?.kinds.length ?? 0) > 1;
  // Inline "+ new title" kind: single-kind group → that kind; multi (Resources) → the
  // chosen sub-kind, defaulting to single-resource (the last, most common one).
  const newKindResolved: OrgPositionKind | null = group
    ? multi
      ? newKind ?? group.kinds[group.kinds.length - 1]!
      : group.kinds[0]!
    : null;

  const placeOne = (title: string, kind: OrgPositionKind) => {
    void emit({
      type: 'PositionAdded',
      position: { id: newId(), title, kind, parentId, builtIn: false, order: nextChildOrder(positions, parentId), assignedResources: [] },
    });
    onDone();
  };

  // A team template: leader + one unassigned single-resource child per member unit, all
  // in one atomic batch (useCommitMany). The leader id is generated first so the children
  // parent to it.
  const placeTeam = async (title: string, kind: OrgPositionKind, members: TeamMember[]) => {
    if (!op) return;
    const by = await getUid();
    const leaderId = newId();
    const stamp = (over: Record<string, unknown>): FieldShoreEvent =>
      ({ id: newId(), opId: op.id, at: Date.now(), by, ...over }) as FieldShoreEvent;
    const events: FieldShoreEvent[] = [
      stamp({
        type: 'PositionAdded',
        position: { id: leaderId, title, kind, parentId, builtIn: false, order: nextChildOrder(positions, parentId), assignedResources: [] },
      }),
    ];
    let childOrder = 0;
    for (const m of members) {
      for (let i = 0; i < m.count; i++) {
        events.push(
          stamp({
            type: 'PositionAdded',
            position: { id: newId(), title: m.type, kind: 'single-resource', parentId: leaderId, builtIn: false, order: childOrder++, assignedResources: [] },
          }),
        );
      }
    }
    await commitMany(events);
    onDone();
  };

  const place = (title: string, kind: OrgPositionKind, members?: TeamMember[]) => {
    if ((kind === 'strike-team' || kind === 'task-force') && members && members.length) void placeTeam(title, kind, members);
    else placeOne(title, kind);
  };

  const addNew = async () => {
    const t = newTitle.trim();
    if (!t || !newKindResolved) return;
    const created = await addCustomTitle(t, newKindResolved); // saves into the library (no composition inline)
    setNewTitle('');
    place(created.title, created.kind, created.members);
  };

  const builtIns = group ? libraryItemsAddableUnder(parentKind).filter((i) => group.kinds.includes(i.kind)) : [];
  const customs = group ? titles.filter((t) => group.kinds.includes(t.kind)) : [];

  if (groups.length === 0 || !group) {
    return (
      <p className="fs-node-empty fs-node-empty--plain">
        Nothing reports under a {kindLabel(parentKind)}.
      </p>
    );
  }

  return (
    <>
      <ClassSelector
        groups={groups}
        value={group.key}
        onChange={(k) => {
          setSelKey(k);
          setNewKind(null);
        }}
      />

      <ul className="fs-assign-list fs-assign-list--spaced">
        {builtIns.map((i) => (
          <li key={i.key}>
            <button type="button" className="fs-assign-row" onClick={() => place(i.title, i.kind)}>
              <span className="fs-assign-name-wrap">
                <span className="fs-assign-name">{i.title}</span>
                {multi && <span className="fs-assign-tag">{kindLabel(i.kind)}</span>}
              </span>
              <span className="fs-assign-meta">add</span>
            </button>
          </li>
        ))}
        {customs.map((c) => (
          <li key={c.id}>
            <button type="button" className="fs-assign-row" onClick={() => place(c.title, c.kind, c.members)}>
              <span className="fs-assign-name-wrap">
                <span className="fs-assign-name">{c.title}</span>
                {multi && <span className="fs-assign-tag">{kindLabel(c.kind)}</span>}
                <span className="fs-assign-tag">custom</span>
              </span>
              <span className="fs-assign-meta">{c.members && c.members.length ? `${memberSummary(c.members)} · add` : 'add'}</span>
            </button>
          </li>
        ))}
        {builtIns.length === 0 && customs.length === 0 && (
          <li>
            <p className="fs-node-empty">No roles in this class yet — add one below.</p>
          </li>
        )}
      </ul>

      <div className="fs-node-section">New title{newKindResolved ? ` · ${kindLabel(newKindResolved)}` : ''}</div>
      {multi && (
        <div className="fs-newkind-chips" role="radiogroup" aria-label="New title kind">
          {group.kinds.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={k === newKindResolved}
              className={`fs-newkind-chip${k === newKindResolved ? ' is-active' : ''}`}
              onClick={() => setNewKind(k)}
            >
              {kindLabel(k)}
            </button>
          ))}
        </div>
      )}
      <div className="fs-assign-individual">
        <TextField label="Title" value={newTitle} onChange={setNewTitle} placeholder="e.g. Tunneling Group Supervisor" size="standard" />
        <Button variant="secondary" size="standard" disabled={!newTitle.trim()} onPress={addNew}>
          Add
        </Button>
      </div>
    </>
  );
}
