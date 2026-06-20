import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PendingReason, ShorePoint, ShorePointStatus } from '@core/schema';
import { STATUS_ORDER, STATUS_LABELS, pendingReasonFor, deployedStrutOf, deployedRigs } from '@core/shorepoint';
import {
  compareAreaValues,
  compareBuildingValues,
  compareDivisionValues,
  compareShorePointsByLocation,
  divisionLabel,
} from '@core/operation';
import { newId } from '@core/id';
import { Badge, Button, EmptyState, FloatingPanel, Modal, Segmented, Sheet, SideDrawer, useIsDesktop } from '@ui/primitives';
import { useApparatus, useCommit, useCommitMany, useDeviceUid, useInventory, useOperation, useShorePoints } from '@ui/hooks';
import { StartOperationModal } from './StartOperationModal';
import { AddShorePointModal } from './AddShorePointModal';
import { DeleteShorePointModal } from './DeleteShorePointModal';
import { ShorePointCard, SHORE_TYPE_LABELS, shorePointDrawerTitle } from './ShorePointCard';
import { ShorePointDetail } from './ShorePointDetail';
import { InventorySummary } from './InventorySummary';
import { GroupedShorePoint } from './GroupedShorePoint';
import { AssignEquipmentSheet } from './AssignEquipmentSheet';
import { StepBackConfirmModal } from './StepBackConfirmModal';
import { ReturnEquipmentModal } from './ReturnEquipmentModal';
import { CuttingStation } from './CuttingStation';
import { PastOperationsList } from './PastOperationsList';
import { PastOperationView } from './PastOperationView';
import { FilterPicker } from './FilterPicker';
import { ViewToggle, type BoardLayout } from './ViewToggle';
import { OperationsRail } from './OperationsRail';
import { buildRailTree, isLeafScope, type ScopePath } from './railTree';

type ModalMode = null | 'create' | 'edit';

/** Operations sub-nav (#222): the board, or the Cutting Station workstation. */
type OpsView = 'board' | 'cutting';

// Sort values (#356) — Added carries its direction in the value so newest/oldest
// live in the Sort menu, not a separate pill. 'location' = division→area.
type SortMode = 'location' | 'added-newest' | 'added-oldest';

/** List-view sort (#356): the list also gains a Status order the tiles can't have. */
type ListSort = 'added-newest' | 'added-oldest' | 'status' | 'location';

/** The Add/Edit Shore Point modal state: closed, creating, or editing a point. */
type SpModalState = null | { mode: 'create' } | { mode: 'edit'; shorePoint: ShorePoint };

// ---- Chevron SVG (matches BottomNav inline-glyph pattern) -------------------
function Chevron() {
  return (
    <svg className="fs-lane-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---- Sort glyph — marks the Sort chip apart from the filter chips (#356) -----
function SortGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 3v10M4 13l-2-2.5M4 13l2-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 13V3M12 3l-2 2.5M12 3l2 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---- Inventory summary icon -------------------------------------------------
function InventoryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ---- Pencil edit icon -------------------------------------------------------
function PencilIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M14.5 3.5L16.5 5.5L6 16H4V14L14.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---- Location pin glyph — the phone Scope chip's leading icon ----------------
function LocationGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5a4 4 0 0 0-4 4c0 2.8 4 8 4 8s4-5.2 4-8a4 4 0 0 0-4-4Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="5.5" r="1.4" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

// ---- Phone lane grouping (Item 2) -------------------------------------------
// On phone the seven lanes group into the three workflow phases the laptop board
// shows (operations.css 3-1-3): strut placement → the cutting pivot → wood &
// return. Presentational only — labeled dividers wrapping the same <Lane>s, and
// phone-only (desktop keeps the flat STATUS_ORDER map so its 2-up/3-1-3 grids see
// .fs-lane as direct children of .fs-ops-lanes — wrapping them in sections there
// would break the grid). The statuses union, in order, IS STATUS_ORDER.
const PHASE_GROUPS = [
  { label: 'Strut placement', statuses: ['pending', 'process', 'strutset'] },
  { label: 'Cutting', statuses: ['cutting'] },
  { label: 'Wood & return', statuses: ['runner', 'secured', 'returned'] },
] as const satisfies ReadonlyArray<{ label: string; statuses: readonly ShorePointStatus[] }>;

// ---- Scope breadcrumb (Item 1) ----------------------------------------------
// Phone-only, shown above the lanes once a location scope is active: the active
// path as tappable back-segments (All › Div 2 › Area 3). Tapping a segment
// applies that truncated path (it FILTERS in place — no router, no sheet), so a
// firefighter can step out a level without reopening the scope sheet. Writes the
// same filter state the rail + chips do (applyRailFilter — one source of truth).
function ScopeBreadcrumb({
  building,
  division,
  area,
  onSelect,
}: {
  building: string | null;
  division: string | null;
  area: string | null;
  onSelect: (path: ScopePath) => void;
}) {
  const segs: { label: string; path: ScopePath }[] = [
    { label: 'All', path: { building: null, division: null, area: null } },
  ];
  if (building) segs.push({ label: building, path: { building, division: null, area: null } });
  if (division) segs.push({ label: divisionLabel(division), path: { building, division, area: null } });
  if (area) segs.push({ label: area, path: { building, division, area } });
  return (
    <nav className="fs-ops-breadcrumb" aria-label="Active scope">
      {segs.map((s, i) => {
        const last = i === segs.length - 1;
        return (
          <span key={`${s.label}-${i}`} className="fs-ops-bc-seg">
            {i > 0 && (
              <span className="fs-ops-bc-sep" aria-hidden="true">
                ›
              </span>
            )}
            {last ? (
              <span className="fs-ops-bc-current" aria-current="true">
                {s.label}
              </span>
            ) : (
              <button type="button" className="fs-ops-bc-link" onClick={() => onSelect(s.path)}>
                {s.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// ---- Status summary bar (rec G-15) -------------------------------------------
// Counts per lane, above the board. Tablet/laptop only — CSS hides it below
// 768pt (G-15: "phone does not show"). aria-hidden: it is a visual glance aid;
// the lane headers already carry the same counts for assistive tech.
// This is the Operations Section Chief's cross-Division aggregate, shown on the
// larger surface they coordinate from. It is deliberately NOT on phone: the
// phone-floor user is a Division inputter served by the per-lane count badges +
// the Division filter, and the IC's at-a-glance command picture is the separate
// Command tab's job — not this board. (A SIM-V "lone IC on a phone" finding once
// argued to put this on phone; that was a wrong-persona read — do not re-add it.)
// Short chip labels so all seven counts fit on one line (Alex). The full
// STATUS_LABELS stay everywhere else (lane headers, slide announcements).
const SUMMARY_LABEL: Record<ShorePointStatus, string> = {
  pending: 'Pending',
  process: 'Assigned',
  strutset: 'Strut Set',
  cutting: 'Cutting',
  runner: 'Runner',
  secured: 'Secured',
  returned: 'Returned',
};
function StatusSummaryBar({ byStatus }: { byStatus: Record<ShorePointStatus, ShorePoint[]> }) {
  return (
    <div className="fs-ops-summary" aria-hidden="true">
      {STATUS_ORDER.map((status) => (
        <span key={status} className={`fs-ops-summary-item is-${status}`}>
          {SUMMARY_LABEL[status]}
          <span className="fs-ops-summary-count">{byStatus[status].length}</span>
        </span>
      ))}
    </div>
  );
}

// ---- Lane render grouping (S12 §2) ------------------------------------------
// Within a lane, collapse 2+ same-groupId points (one PHYSICAL multi-strut
// shore — a 3-Post = 3 points, KB-7) into a single rolodex stack; everything
// else stays a plain card. A singleton (no groupId, OR the lone member of its
// group present in THIS lane) renders as today. First-appearance order is
// preserved: the group renders where its earliest member sits.
type LaneItem =
  | { kind: 'single'; sp: ShorePoint }
  | { kind: 'group'; groupId: string; members: ShorePoint[] };

function groupLanePoints(points: ShorePoint[]): LaneItem[] {
  const byGroup = new Map<string, ShorePoint[]>();
  for (const sp of points) {
    if (!sp.groupId) continue;
    const arr = byGroup.get(sp.groupId);
    if (arr) arr.push(sp);
    else byGroup.set(sp.groupId, [sp]);
  }
  const items: LaneItem[] = [];
  const emitted = new Set<string>();
  for (const sp of points) {
    const mates = sp.groupId ? byGroup.get(sp.groupId) : undefined;
    if (mates && mates.length >= 2) {
      if (emitted.has(sp.groupId!)) continue; // group already rendered at its first member
      emitted.add(sp.groupId!);
      // Sort members by groupIndex (fall back to lane order) for a stable pile.
      const members = [...mates].sort((a, b) => (a.groupIndex ?? 0) - (b.groupIndex ?? 0));
      items.push({ kind: 'group', groupId: sp.groupId!, members });
    } else {
      items.push({ kind: 'single', sp });
    }
  }
  return items;
}

// ---- Shared card/group callbacks (Lane + list view) -------------------------
interface ItemCallbacks {
  onEdit: (sp: ShorePoint) => void;
  onDelete: (sp: ShorePoint) => void;
  onOpenDetail: (sp: ShorePoint) => void;
  onAssignEquipment: (sp: ShorePoint) => void;
  onAdvance: (sp: ShorePoint) => void;
  onStepBack: (sp: ShorePoint) => void;
  /** Wood Shore Secured → open the Remove & Return confirm modal (#224). */
  onRemoveReturn: (sp: ShorePoint) => void;
  /** Group gate (#221 OQ2): set while a grouped Equipment Assigned point has mates still Pending Equipment. */
  advanceDisabledReasonFor: (sp: ShorePoint) => string | undefined;
  /** Board scroll target — fronts the stack on the member it lands inside (S12 §2). */
  activeStackId: string | null;
}

// LaneItems — the card/group mapping shared by the lane board and the list view
// (#356). A grouped item renders as a rolodex stack; a singleton as a plain card.
function LaneItems({ items, ...cb }: { items: LaneItem[] } & ItemCallbacks) {
  return (
    <>
      {items.map((item) =>
        item.kind === 'group' ? (
          <div key={item.groupId} role="listitem">
            <GroupedShorePoint
              members={item.members}
              initialActiveId={
                // If the board's scroll target lands inside this stack, front it.
                item.members.some((m) => m.id === cb.activeStackId) ? cb.activeStackId! : undefined
              }
              onEdit={cb.onEdit}
              onDelete={cb.onDelete}
              onOpenDetail={cb.onOpenDetail}
              onAssignEquipment={cb.onAssignEquipment}
              onAdvance={cb.onAdvance}
              onStepBack={cb.onStepBack}
              onRemoveReturn={cb.onRemoveReturn}
              advanceDisabledReasonFor={cb.advanceDisabledReasonFor}
            />
          </div>
        ) : (
          // tabIndex=-1: not in the tab order, but a programmatic focus target so
          // a deploy can land focus here (#350). Groups carry their own on the front.
          <div key={item.sp.id} role="listitem" data-sp-id={item.sp.id} tabIndex={-1}>
            <ShorePointCard
              shorePoint={item.sp}
              onEdit={cb.onEdit}
              onDelete={cb.onDelete}
              onOpenDetail={cb.onOpenDetail}
              onAssignEquipment={cb.onAssignEquipment}
              onAdvance={cb.onAdvance}
              onStepBack={cb.onStepBack}
              onRemoveReturn={cb.onRemoveReturn}
              advanceDisabledReason={cb.advanceDisabledReasonFor(item.sp)}
            />
          </div>
        ),
      )}
    </>
  );
}

// ---- Lane -------------------------------------------------------------------
interface LaneProps extends ItemCallbacks {
  status: ShorePointStatus;
  points: ShorePoint[];
  collapsed: boolean;
  onToggle: () => void;
}

function Lane({ status, points, collapsed, onToggle, ...cb }: LaneProps) {
  const items = groupLanePoints(points);
  return (
    <section className={`fs-lane is-${status}`} aria-label={STATUS_LABELS[status]}>
      {/* Heading lives OUTSIDE the toggle button: a heading nested inside a button
          isn't exposed for heading navigation by several screen readers (audit W7).
          sr-only keeps the visual row unchanged; the button stays fully tappable. */}
      <h2 className="fs-sr-only">{STATUS_LABELS[status]}</h2>
      <button
        className="fs-lane-header"
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <span className="fs-lane-title">{STATUS_LABELS[status]}</span>
        <Badge variant="count" value={points.length} srLabel={`${points.length} shore points`} />
        <Chevron />
      </button>
      {!collapsed && (
        <div className="fs-lane-cards" role="list">
          {points.length === 0 ? (
            <p className="fs-lane-empty">No shore points</p>
          ) : (
            <LaneItems items={items} {...cb} />
          )}
        </div>
      )}
    </section>
  );
}

// ---- Deleted section (#319, ADR-030) ----------------------------------------
// Soft-deleted points live here — out of the workflow lanes and off the counts,
// but visible and one-tap restorable. A deleted point keeps its #N (seq survives,
// #318) so Restore reclaims its original number. A slim row, not the full card:
// the card's slides/Edit/Delete don't apply once a point is deleted.
interface DeletedSectionProps {
  points: ShorePoint[];
  open: boolean;
  onToggle: () => void;
  onRestore: (sp: ShorePoint) => void;
}

function DeletedSection({ points, open, onToggle, onRestore }: DeletedSectionProps) {
  return (
    <section className="fs-deleted" aria-label="Deleted shore points">
      {/* Heading outside the toggle button (audit W7) — see the lane header note. */}
      <h2 className="fs-sr-only">Deleted</h2>
      <button className="fs-lane-header" type="button" onClick={onToggle} aria-expanded={open}>
        <span className="fs-lane-title">Deleted</span>
        <Badge variant="count" value={points.length} srLabel={`${points.length} deleted shore points`} />
        <Chevron />
      </button>
      {open && (
        <ul className="fs-deleted-list" role="list">
          {points.map((sp) => {
            const title = sp.label
              ? `${sp.label} · ${SHORE_TYPE_LABELS[sp.shoreType]}`
              : SHORE_TYPE_LABELS[sp.shoreType];
            const where = [sp.building, divisionLabel(sp.division), sp.area].filter(Boolean).join(' · ');
            return (
              <li key={sp.id} className="fs-deleted-row" data-sp-id={sp.id}>
                {sp.seq != null && <span className="fs-deleted-seq">#{sp.seq}</span>}
                <span className="fs-deleted-id">
                  <span className="fs-deleted-title">{title}</span>
                  {where && <span className="fs-deleted-where">{where}</span>}
                </span>
                <Button variant="secondary" onPress={() => onRestore(sp)}>
                  Restore
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---- OperationsBoard --------------------------------------------------------
export function OperationsBoard() {
  const operation = useOperation();
  const shorePoints = useShorePoints();
  const inventory = useInventory();
  const { roster } = useApparatus();
  // ≥768px (tablet/command-post): the board gets the drilldown rail + a dominant
  // canvas, and the Details / Available-Inventory companions float over it as
  // draggable FloatingPanels (ADR-037). Below it (phone, the floor) the rail
  // collapses to the filter chips and the companions are full-screen SideDrawers.
  const isDesktop = useIsDesktop();
  const commit = useCommit();
  const commitMany = useCommitMany();
  const getUid = useDeviceUid();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  // Past-operations archive drill-in (#238) — the opId being viewed read-only, or
  // null = the list. Only reachable from the empty-state (no active op).
  const [viewArchiveOpId, setViewArchiveOpId] = useState<string | null>(null);
  const [view, setView] = useState<OpsView>('board');
  const [endOpOpen, setEndOpOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<ShorePointStatus>>(new Set());
  const [spModal, setSpModal] = useState<SpModalState>(null);
  const [deleteSp, setDeleteSp] = useState<ShorePoint | null>(null);
  const [assignSpId, setAssignSpId] = useState<string | null>(null);
  const [stepBackSpId, setStepBackSpId] = useState<string | null>(null);
  const [returnSpId, setReturnSpId] = useState<string | null>(null);
  // Quick View drawer (ADR-019) — the deployed point being inspected, or null.
  const [detailSpId, setDetailSpId] = useState<string | null>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  // Phone scope sheet (Item 1) — the building→division→area drilldown that the
  // desktop rail is, surfaced on phone as a bottom Sheet (ADR-016: scope picking
  // is non-destructive → sheet). Desktop keeps the always-visible rail instead.
  const [scopeSheetOpen, setScopeSheetOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [politeAnnouncement, setPoliteAnnouncement] = useState('');
  const [scrollToId, setScrollToId] = useState<string | null>(null);
  // After a deploy, the card id whose wrapper should take focus (#350) — set
  // alongside scrollToId, consumed once by the scroll effect.
  const focusAfterCommitRef = useRef<string | null>(null);
  // Sort/filter board controls (#347/#356) — persisted per-op in localStorage.
  const [sortMode, setSortMode] = useState<SortMode>('location');
  const [layout, setLayout] = useState<BoardLayout>('lanes');
  const [listSort, setListSort] = useState<ListSort>('location');
  const [filterDivision, setFilterDivision] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [filterBuilding, setFilterBuilding] = useState<string | null>(null);
  // Filter by assigned apparatus (assignedResource) — a 4th board filter beside
  // building/division/area (Alex). Same lifecycle: persisted, cleared together.
  const [filterApparatus, setFilterApparatus] = useState<string | null>(null);
  // Current op id for the prefs key, without making it an effect dep (#347).
  const opIdRef = useRef<string | undefined>(undefined);
  opIdRef.current = operation?.id;
  // Deleted section (#319) — collapsed by default, out of the way until needed.
  const [deletedOpen, setDeletedOpen] = useState(false);

  // After a commit lands, bring the first new card into view. Optional-call
  // guarded — jsdom has no scrollIntoView (the Sheet pointer-capture rule).
  // scrollToId doubles as the stack-front hint (passed to Lane as
  // activeStackId): a GroupedShorePoint reads it in its initial state, so when a
  // fan-out lands a group in a new lane the stack mounts fronting that member.
  // The data-sp-id target resolves whether the member is the stack's front
  // wrapper or one of its tabs — both carry it (GroupedShorePoint).
  // #350: after a DEPLOY the closing Assign-Equipment modal would return focus to
  // its opener (the card's "Assign Equipment" button), but that card has moved to
  // Equipment Assigned and the button is gone — so focus drops to <body>. When
  // focusAfterCommitRef names this card, move focus to it instead, deferred past
  // the modal's close-focus (rAF). Other scroll targets (add/advance/return) keep
  // their focus untouched — only deploy hands off.
  useEffect(() => {
    if (!scrollToId) return;
    const el = document.querySelector(`[data-sp-id="${scrollToId}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
    if (focusAfterCommitRef.current === scrollToId && el instanceof HTMLElement) {
      requestAnimationFrame(() => el.focus());
    }
    focusAfterCommitRef.current = null;
    setScrollToId(null);
  }, [scrollToId]);

  // Load sort/filter/layout prefs from localStorage when the active op changes (#347/#356).
  // Read-only: writes happen imperatively in the change handlers (persistPrefs),
  // NOT in an effect — a save effect races the async load under StrictMode's
  // double-mount and can clobber stored prefs with mount-time defaults.
  useEffect(() => {
    if (!operation?.id) return;
    const resetPrefs = () => {
      setSortMode('location'); setLayout('lanes'); setListSort('location');
      setFilterDivision(null); setFilterArea(null); setFilterBuilding(null); setFilterApparatus(null);
    };
    // Back-compat: an older stored 'added' (pre-directional) reads as newest-first.
    const asSort = (v: unknown): SortMode =>
      v === 'added-oldest' ? 'added-oldest' : v === 'added' || v === 'added-newest' ? 'added-newest' : 'location';
    const asListSort = (v: unknown): ListSort =>
      v === 'status' ? 'status' : v === 'location' ? 'location' : asSort(v) as ListSort;
    try {
      const raw = localStorage.getItem(`fs-board-prefs-${operation.id}`);
      if (!raw) { resetPrefs(); return; }
      const p = JSON.parse(raw) as Record<string, unknown>;
      setSortMode(asSort(p.sortMode));
      setLayout(p.layout === 'list' ? 'list' : 'lanes');
      setListSort(asListSort(p.listSort));
      setFilterDivision(typeof p.filterDivision === 'string' ? p.filterDivision : null);
      setFilterArea(typeof p.filterArea === 'string' ? p.filterArea : null);
      setFilterBuilding(typeof p.filterBuilding === 'string' ? p.filterBuilding : null);
      setFilterApparatus(typeof p.filterApparatus === 'string' ? p.filterApparatus : null);
    } catch { resetPrefs(); }
  }, [operation?.id]);

  // Write the current prefs + a patch for the field(s) that just changed. Called
  // from the change handlers so only real user actions persist (StrictMode-safe).
  function persistPrefs(patch: Partial<{ sortMode: SortMode; layout: BoardLayout; listSort: ListSort; filterDivision: string | null; filterArea: string | null; filterBuilding: string | null; filterApparatus: string | null }>) {
    const opId = opIdRef.current;
    if (!opId) return;
    const prefs = { sortMode, layout, listSort, filterDivision, filterArea, filterBuilding, filterApparatus, ...patch };
    try { localStorage.setItem(`fs-board-prefs-${opId}`, JSON.stringify(prefs)); }
    catch { /* private mode / quota — prefs are best-effort */ }
  }

  // The sheet/modal targets derive LIVE by id so they always see the current
  // point (a stale object would compute recommendations against old state) and
  // self-close when the point leaves the state they act on.
  const assignSp = assignSpId
    ? (shorePoints.find((s) => s.id === assignSpId && s.status === 'pending') ?? null)
    : null;
  const stepBackSp = stepBackSpId
    ? (shorePoints.find((s) => s.id === stepBackSpId && s.status === 'process') ?? null)
    : null;
  // Remove & Return target (#224): the Wood Shore Secured point whose equipment is being
  // returned. Derives LIVE by id and self-closes the instant the point leaves secured.
  const returnSp = returnSpId
    ? (shorePoints.find((s) => s.id === returnSpId && s.status === 'secured') ?? null)
    : null;
  // Quick View target — derived LIVE by id, NOT status-gated: a point may advance
  // (or be re-sourced) while its drawer is open, and the panel should track it.
  const detailSp = detailSpId ? (shorePoints.find((s) => s.id === detailSpId) ?? null) : null;
  // Drop a stale id once its target derives null, so the overlay cannot
  // spontaneously reopen if the point later re-enters that state.
  useEffect(() => {
    if (assignSpId && !assignSp) setAssignSpId(null);
  }, [assignSpId, assignSp]);
  useEffect(() => {
    if (stepBackSpId && !stepBackSp) setStepBackSpId(null);
  }, [stepBackSpId, stepBackSp]);
  useEffect(() => {
    if (returnSpId && !returnSp) setReturnSpId(null);
  }, [returnSpId, returnSp]);
  // Drop a stale detail id once its point is gone (deleted, or a returned point's
  // BOM cleared) so the drawer can't spontaneously reopen.
  useEffect(() => {
    if (detailSpId && !detailSp) setDetailSpId(null);
  }, [detailSpId, detailSp]);
  // The full Equipment Assigned set to un-deploy together: a grouped physical shore
  // (Double-T / 3-Post) returns ALL its deployed struts as one, so a "Send Back
  // to Pending" never leaves orphaned standing struts — the set is married
  // cradle-to-grave. A partial-deployed group (out of stock) returns only the
  // members actually Equipment Assigned. Singleton → just itself.
  const stepBackMembers = !stepBackSp
    ? []
    : stepBackSp.groupId
      ? shorePoints.filter((s) => s.groupId === stepBackSp.groupId && s.status === 'process' && s.deletedAt == null)
      : [stepBackSp];

  const openEdit = useCallback((sp: ShorePoint) => setSpModal({ mode: 'edit', shorePoint: sp }), []);
  const openDelete = useCallback((sp: ShorePoint) => setDeleteSp(sp), []);
  const assignEquipment = useCallback((sp: ShorePoint) => setAssignSpId(sp.id), []);
  const openRemoveReturn = useCallback((sp: ShorePoint) => setReturnSpId(sp.id), []);
  const openDetail = useCallback((sp: ShorePoint) => setDetailSpId(sp.id), []);

  const expandLane = useCallback((status: ShorePointStatus) => {
    setCollapsed((prev) => {
      if (!prev.has(status)) return prev;
      const next = new Set(prev);
      next.delete(status);
      return next;
    });
  }, []);

  const handleAdded = useCallback(
    (added: ShorePoint[]) => {
      // The spec's modal-close response: open the Pending lane, scroll the first
      // new card into view, announce assertively (workflow #220 §Accessibility).
      expandLane('pending');
      const first = added[0];
      if (!first) return;
      setScrollToId(first.id);
      const where = [first.building, divisionLabel(first.division), first.area].filter(Boolean).join(', ');
      setAnnouncement(
        added.length === 1
          ? `Shore point added — ${where}, Pending Equipment.`
          : `${added.length} shore points added — ${where}, Pending Equipment.`,
      );
    },
    [expandLane],
  );

  // ---- Deploy / advance / step-back (#221) ----------------------------------

  /** The reducer's pre-cutting fan-out set: same-status lockstep group mates. */
  const lockstepCount = useCallback(
    (sp: ShorePoint) =>
      sp.groupId
        ? shorePoints.filter((s) => s.groupId === sp.groupId && s.status === sp.status && s.deletedAt == null).length
        : 1,
    [shorePoints],
  );

  const handleDeployed = useCallback(
    (sp: ShorePoint, model: string) => {
      setAssignSpId(null);
      expandLane('process');
      focusAfterCommitRef.current = sp.id; // #350: focus the deployed card, not <body>
      setScrollToId(sp.id);
      const where = [sp.building, divisionLabel(sp.division), sp.area].filter(Boolean).join(', ');
      setPoliteAnnouncement(`${model} deployed — ${where}, Equipment Assigned.`);
    },
    [expandLane],
  );

  /** One-step (inline) deploy outcome from Add Shore Point: stock can run out
   *  mid-batch, leaving some points Pending — announce the partial honestly so it
   *  is never reported as a full success (audit W1). */
  const handleInlineDeployed = useCallback(
    (deployed: ShorePoint[], pending: ShorePoint[], model: string) => {
      const ref = deployed[0] ?? pending[0];
      if (!ref) return;
      const where = [ref.building, divisionLabel(ref.division), ref.area].filter(Boolean).join(', ');
      if (deployed.length) {
        expandLane('process');
        focusAfterCommitRef.current = deployed[0]!.id; // #350
        setScrollToId(deployed[0]!.id);
      }
      if (pending.length) {
        expandLane('pending');
        if (!deployed.length) setScrollToId(pending[0]!.id);
      }
      if (pending.length === 0) {
        setPoliteAnnouncement(`${model} deployed — ${where}, Equipment Assigned.`);
      } else {
        const total = deployed.length + pending.length;
        setAnnouncement(
          deployed.length === 0
            ? `Out of stock — ${total} shore ${total === 1 ? 'point' : 'points'} stayed Pending Equipment.`
            : `Deployed ${deployed.length} of ${total} — ${pending.length} stayed Pending Equipment, out of stock.`,
        );
      }
    },
    [expandLane],
  );

  const handleReturned = useCallback(
    (sp: ShorePoint, count = 1) => {
      expandLane('pending');
      setScrollToId(sp.id);
      setPoliteAnnouncement(
        count > 1
          ? `${count} struts returned — back to Pending Equipment.`
          : `${deployedStrutOf(sp)?.model ?? 'Strut'} returned — back to Pending Equipment.`,
      );
    },
    [expandLane],
  );

  // Terminal Remove & Return (#224): the SP advanced to Strut Equipment Returned and
  // its strut went back to the source apparatus's available count. Open the Returned
  // lane and announce.
  const handleReclaimed = useCallback(
    (sp: ShorePoint) => {
      expandLane('returned');
      setScrollToId(sp.id);
      setPoliteAnnouncement(
        `${deployedStrutOf(sp)?.model ?? 'Equipment'} returned to ${deployedStrutOf(sp)?.source ?? 'inventory'}.`,
      );
    },
    [expandLane],
  );

  const commitStatusChange = useCallback(
    async (sp: ShorePoint, to: ShorePointStatus, phrase: string) => {
      const n = lockstepCount(sp);
      const result = await commit({
        type: 'ShorePointStatusChanged',
        id: newId(),
        opId: sp.opId,
        at: Date.now(),
        by: await getUid(),
        spId: sp.id,
        from: sp.status,
        to,
      });
      if (!result.ok) return;
      expandLane(to);
      setScrollToId(sp.id);
      setPoliteAnnouncement(
        n > 1 ? `${n} shore points — ${phrase} ${STATUS_LABELS[to]}.` : `Shore point — ${phrase} ${STATUS_LABELS[to]}.`,
      );
    },
    [commit, getUid, expandLane, lockstepCount],
  );

  const handleAdvance = useCallback(
    async (sp: ShorePoint) => {
      const to = STATUS_ORDER[STATUS_ORDER.indexOf(sp.status) + 1];
      if (to) await commitStatusChange(sp, to, 'now');
    },
    [commitStatusChange],
  );

  const handleStepBack = useCallback(
    async (sp: ShorePoint) => {
      // process → pending is an un-deploy: inventory-consequential, so it is the
      // ONE reversal that confirms (ADR-016) — route to the modal, commit nothing here.
      if (sp.status === 'process') {
        setStepBackSpId(sp.id);
        return;
      }
      const to = STATUS_ORDER[STATUS_ORDER.indexOf(sp.status) - 1];
      if (to) await commitStatusChange(sp, to, 'back to');
    },
    [commitStatusChange],
  );

  // Mark Cut Done / clear (#222) — toggles the internal cuttingDone flag on the
  // `cutting` state via a ShorePointEdited patch (no lane change, no inventory).
  const commitCutDone = useCallback(
    async (sp: ShorePoint, done: boolean) => {
      const result = await commit({
        type: 'ShorePointEdited',
        id: newId(),
        opId: sp.opId,
        at: Date.now(),
        by: await getUid(),
        spId: sp.id,
        patch: { cuttingDone: done },
      });
      if (!result.ok) return;
      setPoliteAnnouncement(done ? 'Cut done marked. Slide to send to runner.' : 'Cut done cleared.');
    },
    [commit, getUid],
  );
  const markCutDone = useCallback((sp: ShorePoint) => commitCutDone(sp, true), [commitCutDone]);
  const clearCutDone = useCallback((sp: ShorePoint) => commitCutDone(sp, false), [commitCutDone]);

  // Restore a soft-deleted point (#319) — one tap, no confirm (it's reversible).
  // The point returns to whatever status it held (delete is Pending-only, so
  // ~always Pending) with its original #N reclaimed.
  const handleRestore = useCallback(
    async (sp: ShorePoint) => {
      // Group-aware to match the group-aware delete (audit W5): restoring any
      // member of a deleted shore brings back ALL its deleted members, so a
      // partial shore is never reconstructed.
      const members = sp.groupId
        ? shorePoints.filter((s) => s.groupId === sp.groupId && s.deletedAt != null)
        : [sp];
      const uid = await getUid();
      const at = Date.now();
      const result =
        members.length > 1
          ? await commitMany(
              members.map((m) => ({
                type: 'ShorePointRestored' as const,
                id: newId(),
                opId: m.opId,
                at,
                by: uid,
                spId: m.id,
              })),
            )
          : await commit({ type: 'ShorePointRestored', id: newId(), opId: sp.opId, at, by: uid, spId: sp.id });
      if (!result.ok) return;
      expandLane(sp.status);
      setScrollToId(sp.id);
      setPoliteAnnouncement(
        members.length > 1
          ? `${members.length} shore points restored — ${STATUS_LABELS[sp.status]}.`
          : `Shore point ${sp.seq != null ? `#${sp.seq} ` : ''}restored — ${STATUS_LABELS[sp.status]}.`,
      );
    },
    [commit, commitMany, getUid, expandLane, shorePoints],
  );

  // End the operation (#220 lifecycle) — commits OperationEnded; the board then
  // falls to the no-active-operation empty state, ready to Start a fresh op. Shore
  // points are retained in the event log (archived, not deleted), so the ended op
  // can still be read back. (The ADR-018 after-action email hangs off this event
  // when real sync lands; inert in this local-only slice.)
  const endOperation = useCallback(async () => {
    if (!operation) return;
    const result = await commit({
      type: 'OperationEnded',
      id: newId(),
      opId: operation.id,
      at: Date.now(),
      by: await getUid(),
    });
    // The Past-operations list re-fetches on its next mount (it only renders in
    // the empty state, which this end transition lands on) — no manual invalidate.
    if (result.ok) setEndOpOpen(false);
  }, [commit, getUid, operation]);

  /** Group gate (#221 OQ2): a grouped point's advance waits until every mate has left Pending. */
  const advanceDisabledReasonFor = useCallback(
    (sp: ShorePoint) => {
      if (sp.status !== 'process' || !sp.groupId) return undefined;
      // Exclude soft-deleted (#319) mates — a deleted-while-Pending member keeps
      // status:'pending' and would gate the survivors forever (audit W2).
      const mates = shorePoints.filter((s) => s.groupId === sp.groupId && s.deletedAt == null);
      const stillPending = mates.filter((s) => s.status === 'pending').length;
      if (stillPending === 0) return undefined;
      return `Waiting on group — ${stillPending} of ${mates.length} still Pending`;
    },
    [shorePoints],
  );

  // Live pending reasons (#221, settled 2026-06-10): computed from current
  // stock, never persisted — the reason appears/clears as inventory changes.
  const pendingReasons = useMemo(() => {
    const m = new Map<string, PendingReason | undefined>();
    for (const sp of shorePoints) {
      if (sp.status === 'pending') m.set(sp.id, pendingReasonFor(sp, inventory));
    }
    return m;
  }, [shorePoints, inventory]);

  // Distinct divisions/areas present, for the filter dropdowns — ordered the
  // same way the board sorts (division descending, area ascending).
  const divisionsPresent = useMemo(() => {
    const set = new Set<string>();
    for (const sp of shorePoints) if (sp.deletedAt == null && sp.division) set.add(sp.division);
    return [...set].sort(compareDivisionValues);
  }, [shorePoints]);
  // Cascade (#347): when a division filter is active, only show areas that have
  // points in that division (avoids selecting an area with zero results).
  const areasPresent = useMemo(() => {
    const set = new Set<string>();
    for (const sp of shorePoints) {
      if (sp.deletedAt == null && sp.area && (!filterDivision || sp.division === filterDivision)) {
        set.add(sp.area);
      }
    }
    return [...set].sort(compareAreaValues);
  }, [shorePoints, filterDivision]);
  // Distinct buildings present (multi-building ops only) — the building filter list.
  const buildingsPresent = useMemo(() => {
    const set = new Set<string>();
    for (const sp of shorePoints) if (sp.deletedAt == null && sp.building) set.add(sp.building);
    return [...set].sort(compareBuildingValues);
  }, [shorePoints]);
  // Distinct assigned apparatus present (the assignedResource filter list).
  const apparatusPresent = useMemo(() => {
    const set = new Set<string>();
    for (const sp of shorePoints) if (sp.deletedAt == null && sp.assignedResource) set.add(sp.assignedResource);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [shorePoints]);

  // Drilldown-rail tree (desktop only, 20-operations.md §Drilldown) — building →
  // division → area with counts. The rail SELECTS into the same filter state the
  // chips drive (one source of truth, applyRailFilter below).
  const railTree = useMemo(() => buildRailTree(shorePoints), [shorePoints]);

  // End-Operation warning data (#238, gate M3): shore points whose equipment is
  // still out (deployed, not yet Returned) at close, grouped by the RIG it was
  // pulled from (deployedRigs — a deployed shore can now span multiple rigs) —
  // each such rig's available count stays short for the next call. Empty → no
  // warning. Non-blocking (the IC may close anyway).
  const stillDeployedByRig = useMemo(() => {
    const m = new Map<string, number>();
    for (const sp of shorePoints) {
      if (sp.deletedAt != null || !sp.deployedBom || sp.status === 'returned') continue;
      for (const rig of deployedRigs(sp)) {
        m.set(rig, (m.get(rig) ?? 0) + 1);
      }
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [shorePoints]);
  const stillDeployedTotal = stillDeployedByRig.reduce((n, [, c]) => n + c, 0);

  // Cascade (#347): when division changes, drop filterArea if it's no longer
  // present in the new division's area list. Handled synchronously in the
  // handler so React batches both state updates in one render.
  function handleDivisionChange(division: string | null) {
    setFilterDivision(division);
    let nextArea = filterArea;
    if (filterArea && division) {
      const stillPresent = shorePoints.some(
        (sp) => sp.deletedAt == null && sp.division === division && sp.area === filterArea,
      );
      if (!stillPresent) { setFilterArea(null); nextArea = null; }
    }
    persistPrefs({ filterDivision: division, filterArea: nextArea });
  }

  // Rail selection applies an EXACT building/division/area path, so no cascade is
  // needed (a stale area can't survive). Writes the same state the chips use, so
  // rail and chips stay one source of truth (#248 / 20-operations.md).
  function applyRailFilter(p: ScopePath) {
    setFilterBuilding(p.building);
    setFilterDivision(p.division);
    setFilterArea(p.area);
    persistPrefs({ filterBuilding: p.building, filterDivision: p.division, filterArea: p.area });
  }

  // Phone scope sheet select (Item 1): apply the path, then "pick and go" — close
  // the sheet on a leaf (an area / area-less division), but keep it open on an
  // expandable node so the user can keep drilling (the rail expands it inline).
  function selectScope(p: ScopePath) {
    applyRailFilter(p);
    if (isLeafScope(p, railTree)) setScopeSheetOpen(false);
  }
  // Any location scope active → show the breadcrumb + light the Scope chip.
  const scopeActive = !!(filterBuilding || filterDivision || filterArea);

  const byStatus = useMemo(() => {
    const map: Record<ShorePointStatus, ShorePoint[]> = {
      pending: [], process: [], strutset: [], cutting: [],
      runner: [], secured: [], returned: [],
    };
    for (let i = shorePoints.length - 1; i >= 0; i--) {
      const sp = shorePoints[i]!;
      // Soft-deleted (#319): out of the lanes entirely, so counts/summary exclude it.
      if (sp.deletedAt != null) continue;
      // Board filter (#248): hide points outside the chosen building/division/area.
      if (filterBuilding && (sp.building ?? '') !== filterBuilding) continue;
      if (filterDivision && sp.division !== filterDivision) continue;
      if (filterArea && (sp.area ?? '') !== filterArea) continue;
      if (filterApparatus && (sp.assignedResource ?? '') !== filterApparatus) continue;
      // Display-only enrichment — the computed reason never re-serializes
      // (ShorePointPatch has no such field; events are built from live SPs).
      map[sp.status].push(sp.status === 'pending' ? { ...sp, pendingReason: pendingReasons.get(sp.id) } : sp);
    }
    // Default sort (#248): division → area within each lane. The loop builds
    // newest-first, so 'added-newest' needs no sort; 'added-oldest' reverses (#356).
    if (sortMode === 'location') {
      for (const lane of Object.values(map)) lane.sort(compareShorePointsByLocation);
    } else if (sortMode === 'added-oldest') {
      for (const lane of Object.values(map)) lane.reverse();
    }
    return map;
  }, [shorePoints, pendingReasons, filterBuilding, filterDivision, filterArea, filterApparatus, sortMode]);

  // List view (#356): every visible point in one column, grouped shores kept as
  // one stack (Alex's call), sorted by the list's own key. A group sits at its
  // front leg (groupIndex 0) — ponytail: least-advanced leg if the field wants it.
  const listItems = useMemo(() => {
    const order = new Map(shorePoints.map((sp, i) => [sp.id, i] as const)); // 'added' = array order
    const visible = shorePoints
      .filter(
        (sp) =>
          sp.deletedAt == null &&
          (!filterBuilding || (sp.building ?? '') === filterBuilding) &&
          (!filterDivision || sp.division === filterDivision) &&
          (!filterArea || (sp.area ?? '') === filterArea) &&
          (!filterApparatus || (sp.assignedResource ?? '') === filterApparatus),
      )
      .map((sp) => (sp.status === 'pending' ? { ...sp, pendingReason: pendingReasons.get(sp.id) } : sp));
    const items = groupLanePoints(visible);
    // Front leg (lowest groupIndex) carries the group's location/added identity.
    const rep = (it: LaneItem) => (it.kind === 'group' ? it.members[0]! : it.sp);
    // For STATUS sort a split-status group sits at its LEAST-ADVANCED leg, so a
    // group with any leg still in cutting reads as "still in cutting" — it can't
    // hide behind a front leg that's already secured (review #4).
    const statusKey = (it: LaneItem) =>
      it.kind === 'group'
        ? Math.min(...it.members.map((m) => STATUS_ORDER.indexOf(m.status)))
        : STATUS_ORDER.indexOf(it.sp.status);
    return [...items].sort((a, b) => {
      const ra = rep(a), rb = rep(b);
      if (listSort === 'added-newest' || listSort === 'added-oldest') {
        const asc = (order.get(ra.id) ?? 0) - (order.get(rb.id) ?? 0); // oldest first
        return listSort === 'added-oldest' ? asc : -asc; // newest = reverse of oldest
      }
      if (listSort === 'status') {
        return statusKey(a) - statusKey(b) || compareShorePointsByLocation(ra, rb);
      }
      return compareShorePointsByLocation(ra, rb);
    });
  }, [shorePoints, pendingReasons, filterBuilding, filterDivision, filterArea, filterApparatus, listSort]);

  // Soft-deleted points (#319), most-recently-deleted first.
  const deleted = useMemo(
    () =>
      shorePoints
        .filter((sp) => sp.deletedAt != null)
        .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [shorePoints],
  );

  // Cutting Station queue (#222): the cuts in work order — FIFO by cuttingStartedAt,
  // group-mates tie-broken by groupIndex (1/3 → 2/3 → 3/3).
  const cuttingQueue = useMemo(
    () =>
      shorePoints
        .filter((sp) => sp.status === 'cutting' && sp.deletedAt == null)
        .sort((a, b) => (a.cuttingStartedAt ?? 0) - (b.cuttingStartedAt ?? 0) || (a.groupIndex ?? 0) - (b.groupIndex ?? 0)),
    [shorePoints],
  );
  // The read-only sent-to-runner tail: points that came through the station (have a
  // cuttingStartedAt) and are now Runner / Wood Shore Secured — visible until returned.
  const cuttingSent = useMemo(
    () =>
      shorePoints
        .filter(
          (sp) =>
            sp.cuttingStartedAt != null &&
            sp.deletedAt == null &&
            (sp.status === 'runner' || sp.status === 'secured'),
        )
        .sort((a, b) => (a.cuttingStartedAt ?? 0) - (b.cuttingStartedAt ?? 0)),
    [shorePoints],
  );

  const toggleLane = useCallback((status: ShorePointStatus) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  // One <Lane> with its full prop set — rendered flat (desktop, STATUS_ORDER) or
  // wrapped in phase groups (phone, PHASE_GROUPS). DRYs the two lane layouts.
  const renderLane = (status: ShorePointStatus) => (
    <Lane
      key={status}
      status={status}
      points={byStatus[status]}
      collapsed={collapsed.has(status)}
      onToggle={() => toggleLane(status)}
      onEdit={openEdit}
      onDelete={openDelete}
      onOpenDetail={openDetail}
      onAssignEquipment={assignEquipment}
      onAdvance={handleAdvance}
      onStepBack={handleStepBack}
      onRemoveReturn={openRemoveReturn}
      advanceDisabledReasonFor={advanceDisabledReasonFor}
      activeStackId={scrollToId}
    />
  );

  // ---- No active operation --------------------------------------------------
  if (!operation || operation.status === 'ended') {
    // Read-only drill-in into a finished incident (#238) — replaces the empty
    // state until the user backs out (or re-opens, which makes an op active).
    if (viewArchiveOpId) {
      return (
        <div className="fs-ops-board">
          <PastOperationView opId={viewArchiveOpId} onClose={() => setViewArchiveOpId(null)} />
        </div>
      );
    }
    return (
      <div className="fs-ops-board">
        <EmptyState
          variant="first-run"
          headline="No active operation"
          reason="Start a shoring operation to begin tracking shore points"
          action={{ label: 'Start Operation', onPress: () => setModalMode('create') }}
        />
        <PastOperationsList onOpen={setViewArchiveOpId} />
        <StartOperationModal
          open={modalMode === 'create'}
          onClose={() => setModalMode(null)}
        />
      </div>
    );
  }

  // ---- Active operation -----------------------------------------------------
  // The Operations ↔ Cutting Station scope toggle (#222 / 21-cutting-station.md) —
  // a workstation under Operations, not a sixth tab (ADR-008 / ADR-014). Rendered
  // ONCE: inline in the header on desktop (a compact top-right switch), or as a
  // full-width row below the header on phone.
  const viewToggle = (
    <Segmented
      aria-label="Operations view"
      size="operational"
      options={[
        { value: 'board', label: 'Operations' },
        {
          value: 'cutting',
          label: cuttingQueue.length ? `Cutting Station (${cuttingQueue.length})` : 'Cutting Station',
        },
      ]}
      value={view}
      onChange={setView}
    />
  );

  return (
    <div className="fs-ops-board">
      <header className="fs-ops-header">
        <h1 className="fs-ops-name">{operation.name}</h1>
        {/* Edit sits right next to the incident name (Alex). */}
        <button
          className="fs-ops-edit"
          type="button"
          aria-label="Edit operation"
          onClick={() => setModalMode('edit')}
        >
          <PencilIcon />
        </button>
        {isDesktop && <div className="fs-ops-header-toggle">{viewToggle}</div>}
        {/* Phone keeps the inventory glance as a header icon (desktop gets the
            labeled Inventory button in the filter row). */}
        {!isDesktop && (
          <button
            className={`fs-ops-inv-btn${inventoryOpen ? ' is-active' : ''}`}
            type="button"
            aria-label={inventoryOpen ? 'Close inventory summary' : 'Open inventory summary'}
            aria-pressed={inventoryOpen}
            onClick={() => setInventoryOpen((v) => !v)}
          >
            <InventoryIcon />
          </button>
        )}
      </header>

      {!isDesktop && <div className="fs-ops-subnav">{viewToggle}</div>}

      <div className="fs-sr-only" role="status" aria-live="assertive">
        {announcement}
      </div>
      {/* Status changes announce politely (slider.md) — the assertive region is add-only. */}
      <div className="fs-sr-only" role="status" aria-live="polite">
        {politeAnnouncement}
      </div>

      {view === 'cutting' ? (
        <CuttingStation
          queue={cuttingQueue}
          sent={cuttingSent}
          onMarkCutDone={markCutDone}
          onClearCutDone={clearCutDone}
          onSendToRunner={handleAdvance}
          onStepBack={handleStepBack}
        />
      ) : (
        <>
        {/* Phone: Add runs full-width above the board (desktop Add lives at the
            top of the left rail column instead). */}
        {!isDesktop && (
          <div className="fs-ops-controls">
            <Button variant="primary" fullWidth onPress={() => setSpModal({ mode: 'create' })}>
              + Add Shore Point
            </Button>
          </div>
        )}
        <div className="fs-ops-stage">
        {isDesktop && (
          <div className="fs-ops-railcol">
            {/* Add leads the left column; the drilldown tree sits beneath it
                (the tree appears once the op has shore points). */}
            <Button variant="primary" fullWidth onPress={() => setSpModal({ mode: 'create' })}>
              + Add Shore Point
            </Button>
            {shorePoints.length > 0 && (
              <OperationsRail
                tree={railTree}
                filterBuilding={filterBuilding}
                filterDivision={filterDivision}
                filterArea={filterArea}
                onSelect={applyRailFilter}
              />
            )}
          </div>
        )}
        <div className="fs-ops-main">
          <StatusSummaryBar byStatus={byStatus} />

      {shorePoints.length > 0 && (
        <div className="fs-ops-filterbar">
          {/* One tight row (#356): label-less sort + filter chips scroll sideways on
              the left; the List/Status-tiles View toggle is pinned on the right.
              Added direction lives inside the Sort menu (newest/oldest), no pill. */}
          <div className="fs-ops-filter-chips">
            {layout === 'lanes' ? (
              <FilterPicker
                label="Sort"
                hideLabel
                leadingIcon={<SortGlyph />}
                value={sortMode}
                placeholder="Location"
                nullable={false}
                options={[
                  { value: 'location', label: 'Location' },
                  { value: 'added-newest', label: 'Added — newest first' },
                  { value: 'added-oldest', label: 'Added — oldest first' },
                ]}
                onChange={(v) => { const m = (v ?? 'location') as SortMode; setSortMode(m); persistPrefs({ sortMode: m }); }}
              />
            ) : (
              <FilterPicker
                label="Sort"
                hideLabel
                leadingIcon={<SortGlyph />}
                value={listSort}
                placeholder="Location"
                nullable={false}
                options={[
                  { value: 'added-newest', label: 'Added — newest first' },
                  { value: 'added-oldest', label: 'Added — oldest first' },
                  { value: 'status', label: 'Status' },
                  { value: 'location', label: 'Location' },
                ]}
                onChange={(v) => { const m = (v ?? 'location') as ListSort; setListSort(m); persistPrefs({ listSort: m }); }}
              />
            )}
            {/* Location scope: desktop keeps the always-visible rail + the flat
                Building/Division/Area chips; phone collapses those three into one
                Scope chip that opens the rail as a drilldown Sheet (Item 1). */}
            {isDesktop ? (
              <>
                {buildingsPresent.length > 0 && (
                  <FilterPicker
                    label="Building"
                    hideLabel
                    value={filterBuilding}
                    placeholder="All buildings"
                    options={buildingsPresent.map((b) => ({ value: b, label: b }))}
                    onChange={(v) => { setFilterBuilding(v); persistPrefs({ filterBuilding: v }); }}
                  />
                )}
                {divisionsPresent.length > 0 && (
                  <FilterPicker
                    label="Division"
                    hideLabel
                    value={filterDivision}
                    placeholder="All divisions"
                    options={divisionsPresent.map((d) => ({ value: d, label: divisionLabel(d) }))}
                    onChange={handleDivisionChange}
                  />
                )}
                {areasPresent.length > 0 && (
                  <FilterPicker
                    label="Area"
                    hideLabel
                    value={filterArea}
                    placeholder="All areas"
                    options={areasPresent.map((a) => ({ value: a, label: a }))}
                    onChange={(v) => { setFilterArea(v); persistPrefs({ filterArea: v }); }}
                  />
                )}
              </>
            ) : (
              (divisionsPresent.length > 0 || buildingsPresent.length > 0) && (
                <button
                  type="button"
                  className={`fs-ops-scope-chip${scopeActive ? ' is-active' : ''}`}
                  onClick={() => setScopeSheetOpen(true)}
                >
                  <LocationGlyph />
                  Scope
                </button>
              )
            )}
            {apparatusPresent.length > 0 && (
              <FilterPicker
                label="Apparatus"
                hideLabel
                value={filterApparatus}
                placeholder="All apparatus"
                options={apparatusPresent.map((a) => ({ value: a, label: a }))}
                onChange={(v) => { setFilterApparatus(v); persistPrefs({ filterApparatus: v }); }}
              />
            )}
            {(filterBuilding || filterDivision || filterArea || filterApparatus) && (
              <button
                type="button"
                className="fs-ops-filter-clear"
                onClick={() => {
                  setFilterBuilding(null);
                  setFilterDivision(null);
                  setFilterArea(null);
                  setFilterApparatus(null);
                  persistPrefs({ filterBuilding: null, filterDivision: null, filterArea: null, filterApparatus: null });
                }}
              >
                Clear
              </button>
            )}
          </div>
          {/* Desktop: the labeled Inventory toggle sits just left of the view
              toggle (Alex); phone uses the header icon instead. */}
          {isDesktop && (
            <button
              type="button"
              className={`fs-ops-inv-cta${inventoryOpen ? ' is-active' : ''}`}
              aria-pressed={inventoryOpen}
              onClick={() => setInventoryOpen((v) => !v)}
            >
              <InventoryIcon />
              Inventory
            </button>
          )}
          <ViewToggle
            value={layout}
            onChange={(v) => { setLayout(v); persistPrefs({ layout: v }); }}
          />
        </div>
      )}

      {/* Phone scope breadcrumb (Item 1) — the active path, tap a segment to step
          out a level. Phone-only; desktop shows the active path in the rail. */}
      {!isDesktop && scopeActive && (
        <ScopeBreadcrumb
          building={filterBuilding}
          division={filterDivision}
          area={filterArea}
          onSelect={applyRailFilter}
        />
      )}

      {layout === 'lanes' ? (
        <div className="fs-ops-lanes">
          {/* Desktop keeps the flat STATUS_ORDER map — its 2-up/3-1-3 grids need
              .fs-lane as a direct child of .fs-ops-lanes; phone groups the seven
              lanes into the three workflow phases (Item 2, phone-only). */}
          {isDesktop
            ? STATUS_ORDER.map(renderLane)
            : PHASE_GROUPS.map((g) => (
                <div className="fs-ops-phase" key={g.label}>
                  <div className="fs-ops-phase-label">{g.label}</div>
                  {g.statuses.map(renderLane)}
                </div>
              ))}
        </div>
      ) : (
        <div className="fs-ops-list" role="list">
          {listItems.length === 0 ? (
            <p className="fs-lane-empty">No shore points</p>
          ) : (
            <LaneItems
              items={listItems}
              onEdit={openEdit}
              onDelete={openDelete}
              onOpenDetail={openDetail}
              onAssignEquipment={assignEquipment}
              onAdvance={handleAdvance}
              onStepBack={handleStepBack}
              onRemoveReturn={openRemoveReturn}
              advanceDisabledReasonFor={advanceDisabledReasonFor}
              activeStackId={scrollToId}
            />
          )}
        </div>
      )}

      {deleted.length > 0 && (
        <DeletedSection
          points={deleted}
          open={deletedOpen}
          onToggle={() => setDeletedOpen((v) => !v)}
          onRestore={handleRestore}
        />
      )}

          <div className="fs-ops-end">
            <Button variant="secondary" destructive onPress={() => setEndOpOpen(true)}>
              End Operation
            </Button>
          </div>
        </div>
        {/* Companions are surface-adaptive (ADR-037): on desktop they float over
            the board as draggable FloatingPanels (the board keeps full width); on
            phone they stay full-screen modal SideDrawers. The bodies are
            container-agnostic, dropped into either. */}
        {isDesktop ? (
          <>
            <FloatingPanel
              open={!!detailSp}
              onClose={() => setDetailSpId(null)}
              title={detailSp ? shorePointDrawerTitle(detailSp) : ''}
              cascadeIndex={0}
              boundsSelector=".fs-shell-main"
            >
              {detailSp && <ShorePointDetail sp={detailSp} />}
            </FloatingPanel>
            <FloatingPanel
              open={inventoryOpen}
              onClose={() => setInventoryOpen(false)}
              title="Available Inventory"
              cascadeIndex={1}
              boundsSelector=".fs-shell-main"
            >
              <InventorySummary items={inventory} roster={roster} />
            </FloatingPanel>
          </>
        ) : (
          <>
            <SideDrawer
              open={!!detailSp}
              onClose={() => setDetailSpId(null)}
              title={detailSp ? shorePointDrawerTitle(detailSp) : ''}
            >
              {detailSp && <ShorePointDetail sp={detailSp} />}
            </SideDrawer>
            <SideDrawer
              open={inventoryOpen}
              onClose={() => setInventoryOpen(false)}
              title="Available Inventory"
            >
              <InventorySummary items={inventory} roster={roster} />
            </SideDrawer>
          </>
        )}
        {/* Phone scope drilldown (Item 1) — the desktop rail, surfaced as a bottom
            Sheet. Reuses OperationsRail verbatim; selecting a leaf picks-and-goes
            (selectScope), an expandable node keeps the sheet open to keep drilling.
            Rendered phone-only; the Sheet's claimOverlay closes any open companion
            drawer (ADR-016 one-overlay). */}
        {!isDesktop && (
          <Sheet open={scopeSheetOpen} onClose={() => setScopeSheetOpen(false)} title="Jump to location">
            <OperationsRail
              tree={railTree}
              filterBuilding={filterBuilding}
              filterDivision={filterDivision}
              filterArea={filterArea}
              onSelect={selectScope}
            />
          </Sheet>
        )}
        </div>
        </>
      )}

      <StartOperationModal
        open={modalMode === 'create' || modalMode === 'edit'}
        onClose={() => setModalMode(null)}
        operation={modalMode === 'edit' ? operation : undefined}
      />

      <AddShorePointModal
        open={spModal !== null}
        onClose={() => setSpModal(null)}
        shorePoint={spModal?.mode === 'edit' ? spModal.shorePoint : undefined}
        onAdded={handleAdded}
        onDeployed={handleInlineDeployed}
      />

      <DeleteShorePointModal shorePoint={deleteSp} onClose={() => setDeleteSp(null)} />

      <AssignEquipmentSheet shorePoint={assignSp} onClose={() => setAssignSpId(null)} onDeployed={handleDeployed} />

      <StepBackConfirmModal
        shorePoint={stepBackSp}
        groupMembers={stepBackMembers}
        onClose={() => setStepBackSpId(null)}
        onReturned={handleReturned}
      />

      <ReturnEquipmentModal
        shorePoint={returnSp}
        onClose={() => setReturnSpId(null)}
        onReturned={handleReclaimed}
      />

      <Modal
        open={endOpOpen}
        onClose={() => setEndOpOpen(false)}
        title="End Operation?"
        variant="destructive"
        footer={
          <>
            <Button variant="secondary" onPress={() => setEndOpOpen(false)}>
              <span data-modal-cancel>Cancel</span>
            </Button>
            <Button variant="primary" destructive onPress={endOperation}>
              End Operation
            </Button>
          </>
        }
      >
        <p>This archives every shore point and ends the active operation. You can start a new one afterward.</p>
        {stillDeployedTotal > 0 && (
          <div className="fs-endop-warning" role="alert">
            <p className="fs-endop-warning-lead">
              ⚠ {stillDeployedTotal} shore {stillDeployedTotal === 1 ? 'point is' : 'points are'} still up — gear
              hasn’t been returned to {stillDeployedByRig.length === 1 ? 'this rig' : 'these rigs'}, leaving{' '}
              {stillDeployedByRig.length === 1 ? 'it' : 'them'} short for the next call:
            </p>
            <ul className="fs-endop-warning-rigs">
              {stillDeployedByRig.map(([rig, count]) => (
                <li key={rig}>
                  {rig} <span className="fs-endop-warning-count">({count})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}
