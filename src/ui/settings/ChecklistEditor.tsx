import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ChecklistId, ChecklistNode, ChecklistTemplate } from '@core/schema';
import { isLeaf, addChild, renameNode, removeNode, moveBefore, moveInto, nudge, subtreeIds } from '@core/checklist';
import { Button, Modal, tapHaptic } from '@ui/primitives';
import { useChecklistTemplates, useDepartment } from '@ui/hooks';
import { newId } from '@core/id';
import './settings.css';

// The department checklist editor (#230, ADR-020). The tree is fully reorganizable:
// ONE drag controller spans the whole checklist, so a step lifts out of any section
// and drops into any other (hit-tests every row, not just its own siblings); a
// section travels with its steps; keyboard arrows cross section boundaries too
// (nudge falls through at the ends). Every edit composes a new tree from the pure
// @core/checklist helpers and persists it via setNodes — the first edit forks the
// checklist from the FieldShore baseline, badged "Customized by <dept>" so a
// tailored step never reads as FieldShore doctrine (Principle 1). Admin-gating is
// deferred to the RBAC session (ADR-017).

type Draft =
  | { mode: 'rename'; nodeId: string }
  | { mode: 'add-step'; parentId: string }
  | { mode: 'add-section' }
  | null;

type DropTarget = { kind: 'before'; id: string | null } | { kind: 'into'; id: string };

function Grip() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="4" r="1.3" /><circle cx="10" cy="4" r="1.3" />
      <circle cx="6" cy="8" r="1.3" /><circle cx="10" cy="8" r="1.3" />
      <circle cx="6" cy="12" r="1.3" /><circle cx="10" cy="12" r="1.3" />
    </svg>
  );
}

function DraftInput({ initial, placeholder, onSave, onCancel }: { initial: string; placeholder: string; onSave: (t: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial);
  return (
    <div className="fs-cke-draft">
      <input
        className="fs-cke-input"
        autoFocus
        value={text}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(text.trim());
          else if (e.key === 'Escape') onCancel();
        }}
      />
      <Button variant="primary" size="standard" onPress={() => onSave(text.trim())}>Save</Button>
      <Button variant="tertiary" size="standard" onPress={onCancel}>Cancel</Button>
    </div>
  );
}

function TemplateEditor({ template, setNodes }: { template: ChecklistTemplate; setNodes: (id: ChecklistId, nodes: ChecklistNode[]) => void }) {
  const nodes = template.nodes;
  const [draft, setDraft] = useState<Draft>(null);
  const [removeNodeTarget, setRemoveNodeTarget] = useState<ChecklistNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropTarget | null>(null);
  const dragMeta = useRef<{ pointerId: number; subtree: Set<string>; isSection: boolean } | null>(null);

  function commit(nextNodes: ChecklistNode[]) {
    setNodes(template.id, nextNodes);
  }

  // ---- drag (pointer) — spans the whole tree ----
  function domRows() {
    const els = containerRef.current?.querySelectorAll<HTMLElement>('[data-cke-row]') ?? [];
    return [...els].map((el) => ({ id: el.dataset.ckeRow!, isSection: el.dataset.ckeSection === '1', rect: el.getBoundingClientRect() }));
  }
  function resolveTarget(clientY: number): DropTarget {
    const m = dragMeta.current!;
    const rows = domRows().filter((r) => !m.subtree.has(r.id) && (!m.isSection || r.isSection));
    for (const r of rows) {
      if (clientY < r.rect.top + r.rect.height / 2) {
        // hovering a section header while moving a step => drop INTO that section's top
        return r.isSection && !m.isSection ? { kind: 'into', id: r.id } : { kind: 'before', id: r.id };
      }
    }
    return { kind: 'before', id: null }; // past the end → root end
  }
  function onGripDown(e: ReactPointerEvent, id: string, isSection: boolean) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    tapHaptic();
    dragMeta.current = { pointerId: e.pointerId, subtree: new Set(subtreeIds(nodes, id)), isSection };
    setDragId(id);
    setDrop(resolveTarget(e.clientY));
  }
  function onGripMove(e: ReactPointerEvent) {
    if (!dragMeta.current || e.pointerId !== dragMeta.current.pointerId) return;
    setDrop(resolveTarget(e.clientY));
  }
  function onGripUp(e: ReactPointerEvent) {
    if (!dragMeta.current || e.pointerId !== dragMeta.current.pointerId) return;
    const id = dragId;
    const t = drop;
    setDragId(null);
    setDrop(null);
    dragMeta.current = null;
    if (!id || !t) return;
    commit(t.kind === 'into' ? moveInto(nodes, id, t.id, 'start') : moveBefore(nodes, id, t.id));
  }
  function onGripCancel() {
    setDragId(null);
    setDrop(null);
    dragMeta.current = null;
  }
  function onGripKey(e: React.KeyboardEvent, id: string) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    commit(nudge(nodes, id, e.key === 'ArrowUp' ? 'up' : 'down'));
  }

  function gripProps(id: string, label: string, isSection: boolean) {
    return {
      type: 'button' as const,
      className: 'fs-cke-handle',
      'aria-label': `Reorder ${label}`,
      'aria-roledescription': 'Drag handle',
      'aria-keyshortcuts': 'ArrowUp ArrowDown',
      onPointerDown: (e: ReactPointerEvent) => onGripDown(e, id, isSection),
      onPointerMove: onGripMove,
      onPointerUp: onGripUp,
      onPointerCancel: onGripCancel,
      onKeyDown: (e: React.KeyboardEvent) => onGripKey(e, id),
    };
  }

  function renderNodes(list: ChecklistNode[], parentId: string | null, depth: number) {
    return list.map((node) => {
      const section = !isLeaf(node);
      const renaming = draft?.mode === 'rename' && draft.nodeId === node.id;
      const addingStep = draft?.mode === 'add-step' && draft.parentId === node.id;
      const dropBefore = drop?.kind === 'before' && drop.id === node.id;
      const dropInto = drop?.kind === 'into' && drop.id === node.id;
      return (
        <div key={node.id} className="fs-cke-node" style={{ marginLeft: depth > 0 ? 'var(--space-4)' : undefined }}>
          {dropBefore && <div className="fs-cke-drop" aria-hidden="true" />}
          <div
            className={`fs-cke-row${node.id === dragId ? ' is-dragging' : ''}${dropInto ? ' is-droptarget' : ''}`}
            data-cke-row={node.id}
            data-cke-section={section ? '1' : '0'}
            data-cke-parent={parentId ?? ''}
          >
            <button {...gripProps(node.id, node.label, section)}><Grip /></button>
            {renaming ? (
              <DraftInput
                initial={node.label}
                placeholder="Step label"
                onSave={(t) => { if (t) commit(renameNode(nodes, node.id, t)); setDraft(null); }}
                onCancel={() => setDraft(null)}
              />
            ) : (
              <>
                <span className={section ? 'fs-cke-label is-section' : 'fs-cke-label'}>{node.label}</span>
                <button type="button" className="fs-cke-text" onClick={() => setDraft({ mode: 'rename', nodeId: node.id })}>Edit</button>
                <button type="button" className="fs-cke-text is-danger" onClick={() => setRemoveNodeTarget(node)}>Remove</button>
              </>
            )}
          </div>
          {section && (
            <div className="fs-cke-children">
              {renderNodes(node.children ?? [], node.id, depth + 1)}
              {addingStep ? (
                <DraftInput
                  initial=""
                  placeholder="New step"
                  onSave={(t) => { if (t) commit(addChild(nodes, node.id, { id: `ck-${newId()}`, label: t })); setDraft(null); }}
                  onCancel={() => setDraft(null)}
                />
              ) : (
                <button type="button" className="fs-cke-add" onClick={() => setDraft({ mode: 'add-step', parentId: node.id })}>+ Add step</button>
              )}
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <div className="fs-cke-body" ref={containerRef}>
      {renderNodes(nodes, null, 0)}
      {drop?.kind === 'before' && drop.id === null && <div className="fs-cke-drop" aria-hidden="true" />}
      <div className="fs-cke-foot">
        {draft?.mode === 'add-section' ? (
          <DraftInput
            initial=""
            placeholder="New section"
            onSave={(t) => { if (t) commit(addChild(nodes, null, { id: `ck-${newId()}`, label: t, children: [] })); setDraft(null); }}
            onCancel={() => setDraft(null)}
          />
        ) : (
          <button type="button" className="fs-cke-add" onClick={() => setDraft({ mode: 'add-section' })}>+ Add section</button>
        )}
      </div>

      <Modal
        open={removeNodeTarget !== null}
        onClose={() => setRemoveNodeTarget(null)}
        title={removeNodeTarget ? `Remove “${removeNodeTarget.label}”?` : ''}
        variant="destructive"
        footer={
          <>
            <Button variant="secondary" onPress={() => setRemoveNodeTarget(null)}><span data-modal-cancel>Cancel</span></Button>
            <Button variant="primary" destructive onPress={() => { if (removeNodeTarget) commit(removeNode(nodes, removeNodeTarget.id)); setRemoveNodeTarget(null); }}>Remove</Button>
          </>
        }
      >
        {removeNodeTarget && !isLeaf(removeNodeTarget)
          ? <p>This removes the section and every step under it. This affects the whole department.</p>
          : <p>This removes the step for your whole department.</p>}
      </Modal>
    </div>
  );
}

export function ChecklistEditor() {
  const { templates, setNodes, reset } = useChecklistTemplates();
  const deptName = useDepartment().department?.name || 'your department';
  const [openId, setOpenId] = useState<ChecklistId | null>(null);
  const [resetTarget, setResetTarget] = useState<ChecklistTemplate | null>(null);

  return (
    <section className="fs-set-section" aria-label="Checklists">
      <h2 className="fs-set-section-label">Checklists</h2>
      <p className="fs-set-group-desc">
        Tailor the IC Command, Task Level, and risk-briefing checklists for your department. Editing
        one forks it from the FieldShore baseline — crews see &ldquo;Customized by {deptName}&rdquo;
        so a tailored step never reads as FieldShore doctrine.
      </p>

      {templates.map((t) => {
        const customized = t.source === 'department';
        const open = openId === t.id;
        return (
          <div key={t.id} className={open ? 'fs-cke-card is-open' : 'fs-cke-card'}>
            <div className="fs-cke-head">
              <span className="fs-cke-name">{t.title}</span>
              <span className={customized ? 'fs-cke-badge is-custom' : 'fs-cke-badge'}>
                {customized ? `Customized by ${deptName}` : 'FieldShore baseline'}
              </span>
              <Button variant="tertiary" size="standard" onPress={() => setOpenId(open ? null : t.id)}>{open ? 'Done' : 'Edit'}</Button>
            </div>
            {open && (
              <>
                <TemplateEditor template={t} setNodes={setNodes} />
                {customized && (
                  <div className="fs-cke-reset">
                    <button type="button" className="fs-cke-text is-danger" onClick={() => setResetTarget(t)}>Reset to FieldShore baseline</button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      <Modal
        open={resetTarget !== null}
        onClose={() => setResetTarget(null)}
        title={resetTarget ? `Reset ${resetTarget.title}?` : ''}
        variant="destructive"
        footer={
          <>
            <Button variant="secondary" onPress={() => setResetTarget(null)}><span data-modal-cancel>Cancel</span></Button>
            <Button variant="primary" destructive onPress={() => { if (resetTarget) void reset(resetTarget.id); setResetTarget(null); }}>Reset to baseline</Button>
          </>
        }
      >
        <p>This discards your department&rsquo;s customizations and restores the shipped FieldShore version.</p>
      </Modal>
    </section>
  );
}
