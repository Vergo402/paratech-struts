import { useState, type ReactNode } from 'react';
import type { ChecklistNode, ChecklistTemplate } from '@core/schema';
import type { ChecklistInstance } from '@core/checklist';
import { isLeaf, sectionProgress, isComplete } from '@core/checklist';

/**
 * NestedChecklist — the doctrine-attestation tree (nested-checklist.md, #196). One
 * primitive, three screens. Leaves are the only checkable nodes; sections roll up a
 * DERIVED count and never bulk-check. Tap toggles a leaf, re-tap un-checks (no
 * confirm — reversible at re-tap cost, Principle 6); the whole 56pt row is the
 * target. Every check shows who attested it and when. Presentational: it owns no
 * data, takes attestations + toggle callbacks as props (ui/primitives boundary).
 *
 * Mints no token — 56pt row, 16pt indent (--space-4), --accent fill, --motion-micro
 * are all cited from sibling scales. Reduced motion is handled by the token (0ms).
 */
export interface NestedChecklistProps {
  template: ChecklistTemplate;
  attestations: ChecklistInstance;
  onCheck(itemId: string): void;
  onUncheck(itemId: string): void;
  /** Broadcast / read-only archive: render state, no toggle affordance (the board
   *  cannot attest — attestation happens on the phone/tablet). */
  readOnly?: boolean;
}

/** 24px the operational tap target lives inside; auto-zeroed motion under reduce. */
function CheckMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The three checkbox states — each a shape, never color alone (Principle 9). */
function Box({ state }: { state: 'checked' | 'unchecked' | 'partial' }) {
  return (
    <span className={`fs-ck-box is-${state}`} aria-hidden="true">
      {state === 'checked' && <CheckMark />}
      {state === 'partial' && <span className="fs-ck-bar" />}
    </span>
  );
}

function clockTime(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function Leaf({ node, attestations, onCheck, onUncheck, readOnly, depth }: {
  node: ChecklistNode;
  attestations: ChecklistInstance;
  onCheck(id: string): void;
  onUncheck(id: string): void;
  readOnly?: boolean;
  depth: number;
}) {
  const att = attestations[node.id];
  const checked = Boolean(att);
  const indent = { paddingLeft: `calc(${depth} * var(--space-4))` };

  const body: ReactNode = (
    <>
      {/* empty chevron slot so a leaf's box aligns under its sibling sections'
          boxes — without it a deeper leaf sits LEFT of its parent section. */}
      <span className="fs-ck-chev-spacer" aria-hidden="true" />
      <Box state={checked ? 'checked' : 'unchecked'} />
      <span className="fs-ck-leaf-text">
        <span className="fs-ck-label">{node.label}</span>
        {checked && att && (
          <span className="fs-ck-attr">
            {att.role} · {clockTime(att.at)}
          </span>
        )}
      </span>
    </>
  );

  if (readOnly) {
    return (
      <div className="fs-ck-leaf is-readonly" style={indent} role="checkbox" aria-checked={checked} aria-disabled="true">
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      className="fs-ck-leaf"
      style={indent}
      role="checkbox"
      aria-checked={checked}
      onClick={() => (checked ? onUncheck(node.id) : onCheck(node.id))}
    >
      {body}
    </button>
  );
}

function Section(props: {
  node: ChecklistNode;
  attestations: ChecklistInstance;
  onCheck(id: string): void;
  onUncheck(id: string): void;
  readOnly?: boolean;
  autoCollapseCompleted: boolean;
  depth: number;
}) {
  const { node, attestations, autoCollapseCompleted, depth } = props;
  const { checked, total } = sectionProgress(node, attestations);
  const complete = isComplete(node, attestations);
  // Auto-collapse COMPLETED branches only; the active (incomplete) branch never
  // auto-collapses — the next undone step stays visible (Principle 7). The user can
  // override either way; we track only explicit overrides.
  const defaultOpen = !(autoCollapseCompleted && complete);
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? defaultOpen;
  const indent = { paddingLeft: `calc(${depth} * var(--space-4))` };
  const boxState = complete ? 'checked' : checked > 0 ? 'partial' : 'unchecked';

  return (
    <div className="fs-ck-section">
      <button
        type="button"
        className="fs-ck-section-head"
        style={indent}
        aria-expanded={open}
        // Spoken progress as WORDS — never aria-checked="mixed" (sections aren't controls).
        aria-label={`${node.label}, ${checked} of ${total} complete`}
        onClick={() => setOverride(!open)}
      >
        <svg className={`fs-ck-chev${open ? ' is-open' : ''}`} width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <Box state={boxState} />
        <span className="fs-ck-section-label">{node.label}</span>
        <span className="fs-ck-count" aria-hidden="true">
          {checked} / {total}
        </span>
      </button>
      {open && (
        <div className="fs-ck-children" role="group" aria-label={node.label}>
          {(node.children ?? []).map((child) => (
            <Node key={child.id} {...props} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function Node(props: {
  node: ChecklistNode;
  attestations: ChecklistInstance;
  onCheck(id: string): void;
  onUncheck(id: string): void;
  readOnly?: boolean;
  autoCollapseCompleted: boolean;
  depth: number;
}) {
  return isLeaf(props.node) ? <Leaf {...props} /> : <Section {...props} />;
}

export function NestedChecklist({ template, attestations, onCheck, onUncheck, readOnly }: NestedChecklistProps) {
  return (
    <div className="fs-ck">
      {template.nodes.map((node) => (
        <Node
          key={node.id}
          node={node}
          attestations={attestations}
          onCheck={onCheck}
          onUncheck={onUncheck}
          readOnly={readOnly}
          autoCollapseCompleted={template.autoCollapseCompleted}
          depth={0}
        />
      ))}
    </div>
  );
}
