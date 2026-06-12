import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import type { ShorePoint } from '@core/schema';
import { ShorePointCard, SHORE_TYPE_LABELS, type ShorePointCardProps } from './ShorePointCard';

const TAB_W = 30; // px of visible tab sticking out per fallen card (handoff §2)

/**
 * GroupedShorePoint — the rolodex stack for multi-strut physical shores (S12 §2,
 * handoff `components/GroupedShorePoint.jsx`). A 3-Post writes three points
 * sharing a groupId (KB-7); rather than three loose cards cluttering a lane, the
 * board collapses them into one stack: the active member's full
 * ShorePointCard up front, the others fallen LEFT as status-striped tabs.
 *
 * Renders REAL ShorePointCards — it never re-implements card internals (every
 * member card is the same interactive component the board renders for
 * singletons). Per-member callbacks carry that member's own `sp` and gate
 * reason.
 *
 * Accessibility (the task's a11y contract): ADR-026 governs the status-commit
 * SLIDE only — navigation here stays fully keyboard-operable. Tabs are real
 * <button>s; expand has a quiet but real <button> beside the dots in addition
 * to the pointer dead-space tap. No tab/expand accessible name carries a bare
 * status word ("Pending" etc.) — OperationsBoard's lane-header queries match
 * /Pending/ on buttons and must not collide.
 */
export interface GroupedShorePointProps {
  /** 2+ members, same groupId, pre-sorted by groupIndex. */
  members: ShorePoint[];
  /** Gallery convenience — open expanded on first render. */
  defaultExpanded?: boolean;
  /** Board: front the recently-committed member when the stack scrolls into view. */
  initialActiveId?: string;
  onEdit?: ShorePointCardProps['onEdit'];
  onDelete?: ShorePointCardProps['onDelete'];
  onAssignEquipment?: ShorePointCardProps['onAssignEquipment'];
  onAdvance?: ShorePointCardProps['onAdvance'];
  onStepBack?: ShorePointCardProps['onStepBack'];
  /** Per-member group gate (#221 OQ2) — resolved against the member's own sp. */
  advanceDisabledReasonFor?: (sp: ShorePoint) => string | undefined;
}

// The "Post 2" style member label. groupIndex is 1-based; fall back to array
// order if a fixture omits it.
function memberLabel(sp: ShorePoint, fallbackIndex: number): string {
  return `Post ${sp.groupIndex ?? fallbackIndex + 1}`;
}

// Chevron-up glyph for the Stack collapse button + the quiet expand affordance
// (chevron-down via CSS rotate on the expand button).
function ChevronUp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

export function GroupedShorePoint({
  members,
  defaultExpanded = false,
  initialActiveId,
  onEdit,
  onDelete,
  onAssignEquipment,
  onAdvance,
  onStepBack,
  advanceDisabledReasonFor,
}: GroupedShorePointProps) {
  const n = members.length;
  const initialActive = Math.max(
    0,
    initialActiveId ? members.findIndex((m) => m.id === initialActiveId) : 0,
  );
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [active, setActive] = useState(initialActive);
  const [dir, setDir] = useState<'r' | 'l'>('r');
  const [rollKey, setRollKey] = useState(0);

  // Review fix (R3): re-front must work on an ALREADY-MOUNTED stack too — a
  // fan-out that keeps the group in its lane changes initialActiveId with no
  // remount, and the mount-only initializer above would silently keep a mate
  // fronted. Deps are the id alone, deliberately: reacting to `active` would
  // yank the front back after a manual tab rotation, and `members` is a fresh
  // array every board render.
  useEffect(() => {
    if (!initialActiveId) return;
    const i = members.findIndex((m) => m.id === initialActiveId);
    if (i >= 0 && i !== active) jumpTo(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialActiveId]);

  if (n === 0) return null;

  // groupTitle from members[0] — label · shore-type (matches RecommendationCard's
  // identity convention; the front card's own header still shows per-member identity).
  const head = members[0]!;
  const groupTitle = `${head.label ? `${head.label} · ` : ''}${SHORE_TYPE_LABELS[head.shoreType]}`;

  const activeMember = members[active] ?? head;
  const activeLabel = memberLabel(activeMember, active);

  // Cyclic slot: leftmost (slot 0) = bottom of the pile; the math sends the old
  // front to the bottom on every jump (handoff §2).
  function tabSlot(i: number): number {
    const d = (i - active + n) % n;
    return n - 1 - d;
  }

  function jumpTo(i: number) {
    if (i === active) return;
    // Forward (roll in from the right) if the target is within the near half.
    const fwd = (i - active + n) % n <= n / 2;
    setDir(fwd ? 'r' : 'l');
    setActive(i);
    setRollKey((k) => k + 1);
  }

  // Per-member card props — each rendered ShorePointCard gets its own sp + gate.
  function cardFor(member: ShorePoint, fallbackIndex: number) {
    return (
      <ShorePointCard
        shorePoint={member}
        onEdit={onEdit}
        onDelete={onDelete}
        onAssignEquipment={onAssignEquipment}
        onAdvance={onAdvance}
        onStepBack={onStepBack}
        advanceDisabledReason={advanceDisabledReasonFor?.(member)}
        // The member's own group badge ("2 / 3") rides the card header already.
        key={`spc-${member.id}-${fallbackIndex}`}
      />
    );
  }

  // ---- Expanded — border-left indented list of full member cards ------------
  if (expanded) {
    return (
      <div className="fs-gs">
        <div className="fs-gs-open">
          <div className="fs-gs-openhead">
            <span className="fs-gs-opentitle">{`${groupTitle} · ${n} cards`}</span>
            <button
              type="button"
              className="fs-gs-colbtn"
              aria-expanded={true}
              aria-label={`Stack ${groupTitle} back into one card`}
              onClick={() => setExpanded(false)}
            >
              Stack
              <ChevronUp />
            </button>
          </div>
          {members.map((member, i) => (
            <div
              key={member.id}
              className="fs-gs-member"
              data-sp-id={member.id}
              style={{ '--i': i } as CSSProperties}
            >
              {cardFor(member, i)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- Collapsed — rolodex stack --------------------------------------------
  // Tap dead space on the front card (not a slide/button/stripe) → expand. The
  // closest() guard keeps slide thumbs and the stripe button from triggering it.
  function onCardTap(e: MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button, [role="button"], .fs-slide')) return;
    setExpanded(true);
  }

  return (
    <div
      className="fs-gs"
      role="group"
      aria-label={`${groupTitle} — ${n} cards, showing ${activeLabel}`}
    >
      <div className="fs-gs-wrap" onClick={onCardTap}>
        {members.map((member, i) => {
          if (i === active) return null;
          const slot = tabSlot(i);
          return (
            <button
              key={member.id}
              type="button"
              className={`fs-gs-tab is-${member.status}`}
              data-sp-id={member.id}
              style={{ left: slot * TAB_W, zIndex: slot + 1 }}
              aria-label={`Bring ${memberLabel(member, i)} to front`}
              onClick={(e) => {
                e.stopPropagation();
                jumpTo(i);
              }}
            >
              <span className="fs-gs-tablabel">{memberLabel(member, i)}</span>
            </button>
          );
        })}

        <div
          key={rollKey}
          data-sp-id={activeMember.id}
          style={{ marginLeft: (n - 1) * TAB_W }}
          className={`fs-gs-front${rollKey > 0 ? (dir === 'r' ? ' fs-gs-roll-r' : ' fs-gs-roll-l') : ''}`}
        >
          {cardFor(activeMember, active)}
        </div>
      </div>

      <div className="fs-gs-pager" style={{ marginLeft: (n - 1) * TAB_W }}>
        <div className="fs-gs-dots" aria-hidden="true">
          {members.map((member, i) => (
            <span
              key={member.id}
              className={`fs-gs-dot is-${member.status}${i === active ? ' is-on' : ''}`}
            />
          ))}
        </div>
        {/* The canonical accessible expand control (the dead-space tap is the
            pointer convenience). Quiet chevron-down, 40px hit area. */}
        <button
          type="button"
          className="fs-gs-expand"
          aria-expanded={false}
          aria-label={`Show all ${n} cards`}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
        >
          <ChevronUp />
        </button>
      </div>
    </div>
  );
}
