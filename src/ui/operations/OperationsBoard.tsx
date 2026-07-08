import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PendingReason, ShorePoint, ShorePointStatus } from '@core/schema';
import { STATUS_ORDER, STATUS_LABELS, pendingReasonFor, deployedStrutOf, deployedRigs, deployedCapacityFlag, deployedStrutCount } from '@core/shorepoint';
import {
  compareAreaValues,
  compareBuildingValues,
  compareDivisionValues,
  compareShorePointsByLocation,
  divisionLabel,
  parseDivisionNumber,
  nextSawId,
} from '@core/operation';
import { myApparatusKeys, currentIC } from '@core/org';
import { newId } from '@core/id';
import { Badge, Button, EmptyState, FloatingPanel, Modal, Segmented, SideDrawer, useIsDesktop } from '@ui/primitives';
import {
  useApparatus,
  useBriefing,
  useCommit,
  useCommitMany,
  useDeviceUid,
  useDeviceUidValue,
  useInventory,
  useMyRole,
  useOperation,
  useOrg,
  usePermissions,
  useShorePoints,
} from '@ui/hooks';
import { MyRoleSheet } from '@ui/command';
import { StartOperationModal } from './StartOperationModal';
import { AddShorePointModal } from './AddShorePointModal';
import { DeleteShorePointModal } from './DeleteShorePointModal';
import { ShorePointCard, SHORE_TYPE_LABELS, shorePointDrawerTitle } from './ShorePointCard';
import { STATUS_SHORT_LABEL } from './cardParts';
import { FloatingStack } from './FloatingStack';
import { ShorePointDetail } from './ShorePointDetail';
import { InventorySummary } from './InventorySummary';
import { GroupedShorePoint } from './GroupedShorePoint';
import { CardBoundary } from './CardBoundary';
import { useDeleteGhosts, isLeaving } from './useDeleteGhosts';
import { AssignEquipmentSheet } from './AssignEquipmentSheet';
import { StepBackConfirmModal } from './StepBackConfirmModal';
import { ReturnEquipmentModal } from './ReturnEquipmentModal';
import { CuttingStation } from './CuttingStation';
import { PastOperationsList } from './PastOperationsList';
import { PastOperationView } from './PastOperationView';
import { ViewToggle, type BoardLayout } from './ViewToggle';
import { DivisionView } from './DivisionView';
import { ShorePointListRow } from './ShorePointListRow';
import type { CapacityFlagValue } from './CapacityFlag';
import { HeaderPill, OpsMetaLine } from './OpsHeaderMeta';
import { OpsFilterSheet } from './OpsFilterSheet';
import { TaskLevelChecklist } from './TaskLevelChecklist';
import { OrmBriefingModal } from './OrmBriefingModal';
import { buildRailTree, type ScopePath } from './railTree';

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

// "Mine" lens (#370) — All ↔ Mine, the first chip in the filter row.
// ---- Chevron SVG (matches BottomNav inline-glyph pattern) -------------------
function Chevron() {
  return (
    <svg className="fs-lane-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---- Sort glyph — marks the Sort chip apart from the filter chips (#356) -----
// ---- Filters trigger glyph — three shrinking bars ---------------------------
function FilterGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ---- Inventory summary icon -------------------------------------------------
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
  /** Over-capacity/unrated flag per point (H1/#415, H2/#416) — computed by the board
   *  from the full group, so a short-of-plan group flags on every surface. */
  capacityFlagOf: (sp: ShorePoint) => CapacityFlagValue;
}

// Short status labels for the List dividers, Board lane headers, and Division
// tiles — the ONE shared short tier (cardParts, #432 mess-map #11).
const LIST_STATUS_LABEL = STATUS_SHORT_LABEL;

// A LaneItem's representative point + count + status for the compact List row. A
// group sits at its LEAST-ADVANCED leg (same rule as the status sort) so a shore
// with any leg still in an earlier status reads at that status, not a done front
// leg.
function laneItemRep(it: LaneItem): { sp: ShorePoint; count: number; status: ShorePointStatus } {
  if (it.kind === 'single') return { sp: it.sp, count: 1, status: it.sp.status };
  const least = it.members.reduce((a, b) =>
    STATUS_ORDER.indexOf(b.status) < STATUS_ORDER.indexOf(a.status) ? b : a,
  );
  return { sp: it.members[0]!, count: it.members.length, status: least.status };
}

// LaneItems — the card/group mapping shared by the lane board and the list view
// (#356). A grouped item renders as a rolodex stack; a singleton as a plain card.
function LaneItems({ items, ...cb }: { items: LaneItem[] } & ItemCallbacks) {
  return (
    <>
      {items.map((item) =>
        item.kind === 'group' ? (
          <div
            key={item.groupId}
            role="listitem"
            className={item.members.every(isLeaving) ? 'is-leaving' : undefined}
          >
            <CardBoundary>
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
                capacityFlagOf={cb.capacityFlagOf}
              />
            </CardBoundary>
          </div>
        ) : (
          // tabIndex=-1: not in the tab order, but a programmatic focus target so
          // a deploy can land focus here (#350). Groups carry their own on the front.
          <div
            key={item.sp.id}
            role="listitem"
            data-sp-id={item.sp.id}
            tabIndex={-1}
            className={isLeaving(item.sp) ? 'is-leaving' : undefined}
          >
            <CardBoundary>
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
                capacityFlag={cb.capacityFlagOf(item.sp)}
              />
            </CardBoundary>
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
  /** Pending lane only: one-step deploy mode (Utilize Pending Card OFF) with no
   *  forced cards — the lane is bypassed, so it reads dimmed + "(toggled off)". */
  toggledOff?: boolean;
}

function Lane({ status, points, collapsed, onToggle, toggledOff = false, ...cb }: LaneProps) {
  const items = groupLanePoints(points);
  const empty = points.length === 0;
  return (
    <section
      className={`fs-lane is-${status}${toggledOff ? ' is-toggled-off' : ''}${empty ? ' is-quiet' : ''}`}
      aria-label={STATUS_LABELS[status]}
    >
      {/* Heading lives OUTSIDE the toggle button: a heading nested inside a button
          isn't exposed for heading navigation by several screen readers (audit W7).
          sr-only keeps the visual row unchanged; the button stays fully tappable.
          The behavior note rides the VISIBLE title only — the sr-only heading +
          the region aria-label stay the plain status name. */}
      <h2 className="fs-sr-only">{STATUS_LABELS[status]}</h2>
      <button
        className="fs-lane-header"
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <span className="fs-lane-title">
          {LIST_STATUS_LABEL[status]}
          {/* Plain behavior phrase (#16), not settings-jargon "(toggled off)". */}
          {toggledOff && <span className="fs-lane-off">skipped — one-step deploy</span>}
        </span>
        <Badge variant="count" value={points.length} srLabel={`${points.length} shore points`} />
        <Chevron />
      </button>
      {/* An empty lane goes QUIET (#17): the zero badge in the header is the
          message — no per-lane "No shore points" string repeating across a
          sparse board (it read up to 7×). */}
      {!collapsed && !empty && (
        <div className="fs-lane-cards" role="list">
          <LaneItems items={items} {...cb} />
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
  // "Mine" lens (#370) — resolves this device's own apparatus via its declared My
  // Role position. uid resolves asynchronously (undefined on first render), so
  // mineAvailable stays false — never flashing available-then-unavailable — until
  // it settles.
  const deviceUid = useDeviceUidValue();
  const positions = useOrg();
  const myRoleId = useMyRole(deviceUid);
  const mineKeys = useMemo(() => myApparatusKeys(positions, myRoleId), [positions, myRoleId]);
  const mineAvailable = mineKeys.length > 0;
  // Create/end/edit an operation is the back-office manageOperations capability (ADR-017 #3,
  // #380) — orthogonal to the ICS-position gates on the fireground actions (deploy/cut/secure).
  const canManageOps = usePermissions().manageOperations;

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
  const [taskChecklistOpen, setTaskChecklistOpen] = useState(false);
  const [ormOpen, setOrmOpen] = useState(false);
  const briefing = useBriefing();
  // The Filters surface (2026-07-02 control-zone redesign) — one PickerSurface
  // holding Sort + Location + Apparatus, replacing the overwhelming inline row.
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const filtersBtnRef = useRef<HTMLButtonElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const [politeAnnouncement, setPoliteAnnouncement] = useState('');
  const [scrollToId, setScrollToId] = useState<string | null>(null);
  // After a deploy, the card id whose wrapper should take focus (#350) — set
  // alongside scrollToId, consumed once by the scroll effect.
  const focusAfterCommitRef = useRef<string | null>(null);
  // Sort/filter board controls (#347/#356) — persisted per-op in localStorage.
  const [sortMode, setSortMode] = useState<SortMode>('location');
  const [layout, setLayout] = useState<BoardLayout>('lanes');
  // List defaults to Status sort so it opens grouped under status dividers (the
  // prototype look, Alex 2026-07-02).
  const [listSort, setListSort] = useState<ListSort>('status');
  const [filterDivision, setFilterDivision] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [filterBuilding, setFilterBuilding] = useState<string | null>(null);
  // Filter by assigned apparatus (assignedResource) — a 4th board filter beside
  // building/division/area (Alex). Same lifecycle: persisted, cleared together.
  const [filterApparatus, setFilterApparatus] = useState<string | null>(null);
  // "Mine" lens (#370) — a per-device view lens (like sort/layout), NOT auditable
  // incident state, so it lives in the same localStorage blob as the other board
  // prefs rather than an OperationState event (must never round-trip through sync).
  const [mineOn, setMineOn] = useState(false);
  const [myRoleSheetOpen, setMyRoleSheetOpen] = useState(false);
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
      setSortMode('location'); setLayout('lanes'); setListSort('status');
      setFilterDivision(null); setFilterArea(null); setFilterBuilding(null); setFilterApparatus(null);
      setMineOn(false);
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
      setLayout(p.layout === 'list' || p.layout === 'division' ? p.layout : 'lanes');
      setListSort(asListSort(p.listSort));
      setFilterDivision(typeof p.filterDivision === 'string' ? p.filterDivision : null);
      setFilterArea(typeof p.filterArea === 'string' ? p.filterArea : null);
      setFilterBuilding(typeof p.filterBuilding === 'string' ? p.filterBuilding : null);
      setFilterApparatus(typeof p.filterApparatus === 'string' ? p.filterApparatus : null);
      setMineOn(p.mine === true);
    } catch { resetPrefs(); }
  }, [operation?.id]);

  // Write the current prefs + a patch for the field(s) that just changed. Called
  // from the change handlers so only real user actions persist (StrictMode-safe).
  function persistPrefs(patch: Partial<{ sortMode: SortMode; layout: BoardLayout; listSort: ListSort; filterDivision: string | null; filterArea: string | null; filterBuilding: string | null; filterApparatus: string | null; mine: boolean }>) {
    const opId = opIdRef.current;
    if (!opId) return;
    const prefs = { sortMode, layout, listSort, filterDivision, filterArea, filterBuilding, filterApparatus, mine: mineOn, ...patch };
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

  // Multi-saw (#354). Add a saw to the roster (auto-named A/B/C…) — append-only,
  // idempotent by sawId in the reducer. 'A' is reducer-seeded, so the first add is 'B'.
  const addSaw = useCallback(async () => {
    if (!operation) return;
    const sawId = nextSawId(operation.saws);
    const result = await commit({
      type: 'SawAdded',
      id: newId(),
      opId: operation.id,
      at: Date.now(),
      by: await getUid(),
      sawId,
    });
    if (result.ok) setPoliteAnnouncement(`Saw ${sawId} added to the Cutting Station.`);
  }, [commit, getUid, operation]);

  // A free saw auto-claims the top unclaimed cut (CuttingStation computes it; this
  // persists it). Stamps sawId so the claim survives an out-of-order finish. Quiet —
  // it's background bookkeeping, not a user action.
  const claimCut = useCallback(
    async (sp: ShorePoint, sawId: string) => {
      await commit({
        type: 'CuttingClaimed',
        id: newId(),
        opId: sp.opId,
        at: Date.now(),
        by: await getUid(),
        spId: sp.id,
        sawId,
      });
    },
    [commit, getUid],
  );

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

  // Active filters drive the Filters badge + the removable-chip row (2026-07-02
  // redesign). Sort is NOT a filter (it never hides points), so it's excluded.
  const activeFilters: { key: 'building' | 'division' | 'area' | 'apparatus'; label: string }[] = [
    ...(filterBuilding ? [{ key: 'building' as const, label: filterBuilding }] : []),
    ...(filterDivision ? [{ key: 'division' as const, label: divisionLabel(filterDivision) }] : []),
    ...(filterArea ? [{ key: 'area' as const, label: filterArea }] : []),
    ...(filterApparatus ? [{ key: 'apparatus' as const, label: filterApparatus }] : []),
  ];
  const hasActiveFilters = activeFilters.length > 0;
  const clearAllFilters = () => {
    setFilterBuilding(null);
    setFilterDivision(null);
    setFilterArea(null);
    setFilterApparatus(null);
    persistPrefs({ filterBuilding: null, filterDivision: null, filterArea: null, filterApparatus: null });
  };
  const removeFilter = (key: 'building' | 'division' | 'area' | 'apparatus') => {
    if (key === 'building') { setFilterBuilding(null); persistPrefs({ filterBuilding: null }); }
    // Clearing a division clears its area too (area is division-scoped).
    else if (key === 'division') handleDivisionChange(null);
    else if (key === 'area') { setFilterArea(null); persistPrefs({ filterArea: null }); }
    else { setFilterApparatus(null); persistPrefs({ filterApparatus: null }); }
  };

  // #435 delete fade-out: keep a fading "ghost" of a just-deleted Pending point so
  // its card fades out before dropping to the Deleted bin. displayPoints feeds the
  // three view memos below (each excludes deletedAt != null; the ghost has it
  // nulled), so one merge covers board + list + division.
  const ghosts = useDeleteGhosts(shorePoints);
  const displayPoints = useMemo(
    () => (ghosts.length ? [...shorePoints, ...ghosts] : shorePoints),
    [shorePoints, ghosts],
  );

  const byStatus = useMemo(() => {
    const map: Record<ShorePointStatus, ShorePoint[]> = {
      pending: [], process: [], strutset: [], cutting: [],
      runner: [], secured: [], returned: [],
    };
    for (let i = displayPoints.length - 1; i >= 0; i--) {
      const sp = displayPoints[i]!;
      // Soft-deleted (#319): out of the lanes entirely, so counts/summary exclude it.
      if (sp.deletedAt != null) continue;
      // Board filter (#248): hide points outside the chosen building/division/area.
      if (filterBuilding && (sp.building ?? '') !== filterBuilding) continue;
      if (filterDivision && sp.division !== filterDivision) continue;
      if (filterArea && (sp.area ?? '') !== filterArea) continue;
      if (filterApparatus && (sp.assignedResource ?? '') !== filterApparatus) continue;
      // "Mine" lens (#370): narrows FURTHER on top of the filters above (AND, never
      // replaces them). A no-op when unavailable (no My Role / no apparatus on it) —
      // the toggle stays inert rather than silently hiding the whole board.
      if (mineOn && mineAvailable && !mineKeys.includes(sp.assignedResource ?? '')) continue;
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
  }, [displayPoints, pendingReasons, filterBuilding, filterDivision, filterArea, filterApparatus, mineOn, mineAvailable, mineKeys, sortMode]);

  // List view (#356): every visible point in one column, grouped shores kept as
  // one stack (Alex's call), sorted by the list's own key. A group sits at its
  // front leg (groupIndex 0) — ponytail: least-advanced leg if the field wants it.
  const listItems = useMemo(() => {
    const order = new Map(shorePoints.map((sp, i) => [sp.id, i] as const)); // 'added' = array order
    const visible = displayPoints
      .filter(
        (sp) =>
          sp.deletedAt == null &&
          (!filterBuilding || (sp.building ?? '') === filterBuilding) &&
          (!filterDivision || sp.division === filterDivision) &&
          (!filterArea || (sp.area ?? '') === filterArea) &&
          (!filterApparatus || (sp.assignedResource ?? '') === filterApparatus) &&
          (!mineOn || !mineAvailable || mineKeys.includes(sp.assignedResource ?? '')),
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
  }, [shorePoints, displayPoints, pendingReasons, filterBuilding, filterDivision, filterArea, filterApparatus, mineOn, mineAvailable, mineKeys, listSort]);

  // Division view (tri-view): the same visible set, grouped into floor bands top
  // (highest Div) → ground → basement (lowest Sub), matching the building cross-
  // section. Same filter predicate as byStatus/listItems. A band's `n` is the
  // signed floor number (Div 1 = ground level, −1 = basement) or null for legacy
  // free-text divisions ("Roof"), which collect in a trailing "Unplaced" band so
  // they're never silently dropped (Principle 7). Grouped shores stay one stack.
  const divisionBands = useMemo(() => {
    const visible = displayPoints
      .filter(
        (sp) =>
          sp.deletedAt == null &&
          (!filterBuilding || (sp.building ?? '') === filterBuilding) &&
          (!filterDivision || sp.division === filterDivision) &&
          (!filterArea || (sp.area ?? '') === filterArea) &&
          (!filterApparatus || (sp.assignedResource ?? '') === filterApparatus) &&
          (!mineOn || !mineAvailable || mineKeys.includes(sp.assignedResource ?? '')),
      )
      .map((sp) => (sp.status === 'pending' ? { ...sp, pendingReason: pendingReasons.get(sp.id) } : sp));

    // Group by the raw division string, then order the bands by floor (descending).
    const byKey = new Map<string, ShorePoint[]>();
    for (const sp of visible) {
      const arr = byKey.get(sp.division);
      if (arr) arr.push(sp);
      else byKey.set(sp.division, [sp]);
    }
    return [...byKey.entries()]
      .map(([division, pts]) => ({
        division,
        n: parseDivisionNumber(division),
        // Within a floor: side (A→D, corners after) then area then seq.
        items: groupLanePoints(
          [...pts].sort(
            (a, b) =>
              (a.side ?? '').localeCompare(b.side ?? '') ||
              compareAreaValues(a.area, b.area) ||
              (a.seq ?? 0) - (b.seq ?? 0),
          ),
        ),
      }))
      .sort((a, b) => compareDivisionValues(a.division, b.division));
  }, [displayPoints, pendingReasons, filterBuilding, filterDivision, filterArea, filterApparatus, mineOn, mineAvailable, mineKeys]);

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

  // One over-capacity/unrated verdict per point, computed HERE where the full group
  // is visible — the share divides by the struts ACTUALLY STANDING (H1/#415), so a
  // short-of-plan group reads over-capacity, and the Board card, List row, and Division
  // tile all read the SAME flag (H2/#416). Memoized on shorePoints; the lookup returns
  // null for pending/undeployed/clean points (deployedCapacityFlag's own null cases).
  const capacityFlagOf = useMemo(() => {
    const flags = new Map<string, CapacityFlagValue>();
    for (const sp of shorePoints) {
      if (sp.deletedAt != null || sp.deployedBom == null) continue;
      flags.set(sp.id, deployedCapacityFlag(sp, deployedStrutCount(sp, shorePoints)));
    }
    return (sp: ShorePoint): CapacityFlagValue => flags.get(sp.id) ?? null;
  }, [shorePoints]);

  // One <Lane> with its full prop set — rendered flat (desktop, STATUS_ORDER) or
  // wrapped in phase groups (phone, PHASE_GROUPS). DRYs the two lane layouts.
  const renderLane = (status: ShorePointStatus) => (
    <Lane
      key={status}
      status={status}
      points={byStatus[status]}
      collapsed={collapsed.has(status)}
      onToggle={() => toggleLane(status)}
      // Pending only: in one-step deploy mode (Utilize Pending Card OFF) cards skip
      // Pending, so an EMPTY Pending lane reads "(toggled off)". A card forced here
      // (out of stock on add, or a step-back un-deploy) keeps the lane live.
      toggledOff={status === 'pending' && operation?.inlineDeploy === true && byStatus.pending.length === 0}
      onEdit={openEdit}
      onDelete={openDelete}
      onOpenDetail={openDetail}
      onAssignEquipment={assignEquipment}
      onAdvance={handleAdvance}
      onStepBack={handleStepBack}
      onRemoveReturn={openRemoveReturn}
      advanceDisabledReasonFor={advanceDisabledReasonFor}
      activeStackId={scrollToId}
      capacityFlagOf={capacityFlagOf}
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
          reason={
            canManageOps
              ? 'Start a shoring operation to begin tracking shore points'
              : 'No operation is active. An operations manager starts one.'
          }
          action={canManageOps ? { label: 'Start Operation', onPress: () => setModalMode('create') } : undefined}
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
  // Header instruments (2026-07-02): op-start clock, OP period, IC, my-role title,
  // point + crew counts — all from existing state, no new store.
  const opSince = operation.periods?.[0]?.startedAt;
  const icLabel = currentIC(positions)?.label ?? null;
  const myRoleTitle = (myRoleId ? positions[myRoleId]?.title : null) ?? null;
  const activePointCount = shorePoints.filter((sp) => sp.deletedAt == null).length;
  const crewCount = apparatusPresent.length;

  // #435: the board's empty-region promotion (empty-state.md — one geometry, system-
  // wide). Filtered vs first-run carry different next steps: clear the filters, or add
  // the first point. Icon-less, matching the app's other empty states.
  const boardEmpty = hasActiveFilters ? (
    <EmptyState
      variant="filtered"
      headline="No shore points match"
      reason="Clear the filters to see the rest of the board."
      action={{ label: 'Clear filters', onPress: clearAllFilters }}
    />
  ) : (
    <EmptyState
      variant="first-run"
      headline="No shore points yet"
      reason="Add the first shore point to start tracking this operation."
      action={canManageOps ? { label: 'Add shore point', onPress: () => setSpModal({ mode: 'create' }) } : undefined}
    />
  );

  // The Operations ↔ Cutting Station scope toggle (#222 / 21-cutting-station.md) —
  // a workstation under Operations, not a sixth tab (ADR-008 / ADR-014). Rendered
  // ONCE: inline in the header on desktop (a compact top-right switch), or as a
  // full-width row below the header on phone.
  const viewToggle = (
    <Segmented
      aria-label="Operations view"
      size="operational"
      options={[
        // Short scope words (accepted mockup) — "Operations | Cutting Station"
        // overflowed the phone control row beside the layout icons + Filters.
        { value: 'board', label: 'Board' },
        {
          // Fixed label + count Badge (#432) — the count as a chip, not label text,
          // so the segment width doesn't jump as the queue moves. The full
          // "Cutting Station" name stays on the station's own heading.
          value: 'cutting',
          ariaLabel: cuttingQueue.length
            ? `Cutting Station, ${cuttingQueue.length} in queue`
            : 'Cutting Station',
          label: cuttingQueue.length ? (
            <>
              Cutting <Badge variant="count" value={cuttingQueue.length} />
            </>
          ) : (
            'Cutting'
          ),
        },
      ]}
      value={view}
      onChange={setView}
    />
  );

  // The single Filters trigger — icon-only on the phone control row, icon + word
  // on desktop (#432 control collapse). One JSX, one ref (only one instance mounts
  // per surface); the ref anchors the desktop Popover filter surface.
  const filtersBtn = (
    <button
      type="button"
      ref={filtersBtnRef}
      className={`fs-ops-filters-btn${isDesktop ? '' : ' fs-ops-filters-btn--icon'}${hasActiveFilters ? ' is-active' : ''}`}
      aria-label={hasActiveFilters ? `Filters, ${activeFilters.length} active` : 'Filters'}
      aria-haspopup="dialog"
      aria-expanded={filterSheetOpen}
      onClick={() => setFilterSheetOpen(true)}
    >
      <FilterGlyph />
      {isDesktop && 'Filters'}
      {hasActiveFilters && <span className="fs-ops-filters-count">{activeFilters.length}</span>}
    </button>
  );

  return (
    <div className="fs-ops-board">
      <header className="fs-ops-header">
        <div className="fs-ops-titlebar">
          <h1 className="fs-ops-name">{operation.name}</h1>
          {/* Edit sits right next to the incident name (Alex). Gated on manageOperations (#380). */}
          {canManageOps && (
            <button
              className="fs-ops-edit"
              type="button"
              aria-label="Edit operation"
              onClick={() => setModalMode('edit')}
            >
              <PencilIcon />
            </button>
          )}
          <span className="fs-ops-titlebar-spacer" />
          {isDesktop && <div className="fs-ops-header-toggle">{viewToggle}</div>}
          {/* Add moved to the top bar (Alex 2026-07-03): the left rail is gone so
              the board runs the full width; Add rides beside the view toggle. */}
          {isDesktop && (
            <Button variant="primary" onPress={() => setSpModal({ mode: 'create' })}>
              + Shore Point
            </Button>
          )}
        </div>
        {/* The stat strip — dominant numerals + micro-labels (craft.md §2, #432) —
            with the persona chip at its right edge: the title row's no-shrink op
            name was collapsing the chip's value to nothing on phone. */}
        <div className="fs-ops-metarow">
          <OpsMetaLine
            since={opSince}
            opNum={operation.currentPeriod}
            opTotal={operation.periods?.length ?? 0}
            points={activePointCount}
            crews={crewCount}
            isDesktop={isDesktop}
          />
          <HeaderPill
            isDesktop={isDesktop}
            icLabel={icLabel}
            myRoleTitle={myRoleTitle}
            onSetRole={() => setMyRoleSheetOpen(true)}
          />
        </div>
      </header>

      {/* Phone control row (#432 — was three stacked full-width rows): the
          Board|Cutting scope, the compact layout icons, and the Filters trigger
          share one line. Layout + Filters only mean anything on the board. */}
      {!isDesktop && (
        <div className="fs-ops-controlrow">
          {viewToggle}
          {view === 'board' && shorePoints.length > 0 && (
            <>
              <ViewToggle
                value={layout}
                onChange={(v) => {
                  setLayout(v);
                  persistPrefs({ layout: v });
                }}
              />
              {filtersBtn}
            </>
          )}
        </div>
      )}

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
          saws={operation?.saws}
          onAddSaw={addSaw}
          onClaim={claimCut}
        />
      ) : (
        <>
        {/* Phone: Add floats as the FAB pill, bottom-right above the nav
            (Alex, Stage 2a review) — the controls row is gone; the Mine lens
            lives in the Filters sheet now. */}
        {!isDesktop && (
          <button type="button" className="fs-ops-fab" onClick={() => setSpModal({ mode: 'create' })}>
            + Add Shore Point
          </button>
        )}
        <div className="fs-ops-stage">
        <div className="fs-ops-main">

      {/* Division filter as a horizontal chip row at the top (Alex 2026-07-03) —
          the left drilldown rail moved up here so the board runs full width. Top
          level only (divisions, or buildings when multi-building); deeper
          building/area filtering stays in the Filters sheet. Desktop-only; phone
          filters through the Filters sheet as before. */}
      {isDesktop && shorePoints.length > 0 && (
        <div className="fs-ops-divchips" role="group" aria-label="Filter by location">
          <button
            type="button"
            className={`fs-ops-divchip${!filterBuilding && !filterDivision && !filterArea ? ' is-active' : ''}`}
            aria-pressed={!filterBuilding && !filterDivision && !filterArea}
            onClick={() => applyRailFilter({ building: null, division: null, area: null })}
          >
            All shore points <span className="fs-ops-divchip-ct">{railTree.total}</span>
          </button>
          {railTree.multiBuilding
            ? railTree.buildings.map((b) => (
                <button
                  key={b.building}
                  type="button"
                  className={`fs-ops-divchip${filterBuilding === b.building && !filterDivision && !filterArea ? ' is-active' : ''}`}
                  aria-pressed={filterBuilding === b.building && !filterDivision && !filterArea}
                  onClick={() => applyRailFilter({ building: b.building, division: null, area: null })}
                >
                  {b.building} <span className="fs-ops-divchip-ct">{b.count}</span>
                </button>
              ))
            : railTree.divisions.map((d) => (
                <button
                  key={d.division}
                  type="button"
                  className={`fs-ops-divchip${filterDivision === d.division && !filterArea ? ' is-active' : ''}`}
                  aria-pressed={filterDivision === d.division && !filterArea}
                  onClick={() => applyRailFilter({ building: null, division: d.division, area: null })}
                >
                  {divisionLabel(d.division)} <span className="fs-ops-divchip-ct">{d.count}</span>
                </button>
              ))}
        </div>
      )}

      {shorePoints.length > 0 && (
        <>
          {/* Desktop utility row (#432 — was two rows): layout icons, the Mine
              lens (#370, kept one-tap), the Filters trigger, then Inventory at the
              far edge. Phone gets layout + Filters in the control row instead. */}
          {isDesktop && (
            <div className="fs-ops-utility">
              <ViewToggle
                value={layout}
                onChange={(v) => {
                  setLayout(v);
                  persistPrefs({ layout: v });
                }}
              />
              {filtersBtn}
            </div>
          )}

          {/* Active filters as removable chips — replaces the always-on pickers,
              the phone breadcrumb, and the Mine summary. */}
          {hasActiveFilters && (
            <div className="fs-ops-activechips">
              {activeFilters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className="fs-ops-chip"
                  onClick={() => removeFilter(f.key)}
                  aria-label={`Remove ${f.label} filter`}
                >
                  {f.label}
                  <span className="fs-ops-chip-x" aria-hidden="true">✕</span>
                </button>
              ))}
              <button type="button" className="fs-ops-chip-clear" onClick={clearAllFilters}>
                Clear all
              </button>
            </div>
          )}
        </>
      )}

      {layout === 'division' ? (
        divisionBands.length === 0 ? (
          boardEmpty
        ) : (
          <DivisionView bands={divisionBands} onOpenDetail={openDetail} flagOf={capacityFlagOf} />
        )
      ) : layout === 'lanes' ? (
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
            boardEmpty
          ) : listSort === 'status' ? (
            // Status sort → status-divided sections (the prototype look): a thin
            // divider (colored square + short label + count) then the compact rows.
            // Dividers + rows are FLAT siblings so the rows stay direct-child
            // listitems (ordering + a11y). listItems is already status-ordered.
            STATUS_ORDER.flatMap((status) => {
              const inStatus = listItems.filter((it) => laneItemRep(it).status === status);
              if (inStatus.length === 0) return [];
              return [
                <div key={`div-${status}`} className={`fs-ops-list-divider is-${status}`} role="presentation">
                  <span className="fs-ops-list-dot" aria-hidden="true" />
                  <span className="fs-ops-list-label">{LIST_STATUS_LABEL[status]}</span>
                  <span className="fs-ops-list-count">{inStatus.length}</span>
                </div>,
                ...inStatus.map((it) => {
                  const rep = laneItemRep(it);
                  return <ShorePointListRow key={rep.sp.id} sp={rep.sp} count={rep.count} flag={capacityFlagOf(rep.sp)} onOpen={openDetail} />;
                }),
              ];
            })
          ) : (
            listItems.map((it) => {
              const rep = laneItemRep(it);
              return <ShorePointListRow key={rep.sp.id} sp={rep.sp} count={rep.count} flag={capacityFlagOf(rep.sp)} onOpen={openDetail} />;
            })
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
            <Button
              variant="secondary"
              onPress={async () => {
                await briefing.begin(); // resumes the active session or starts one
                setOrmOpen(true);
              }}
            >
              {briefing.active ? 'Open Briefing' : 'Begin Briefing'}
            </Button>
            {canManageOps && (
              /* Bare red text, not the briefing's outline twin (#22) — ending the
                 incident is the screen-foot outlier, never a routine button. */
              <Button variant="tertiary" destructive onPress={() => setEndOpOpen(true)}>
                End Operation
              </Button>
            )}
          </div>
        </div>
        {/* Companions are surface-adaptive (ADR-037): on desktop they float over
            the board as draggable FloatingPanels (the board keeps full width); on
            phone they stay full-screen modal SideDrawers. The bodies are
            container-agnostic, dropped into either. */}
        {/* Task Level Checklist (#204) summon tab — the shared ADR-019 edge tab,
            hidden while its companion is open (Begin/Open Briefing is separate). */}
        <FloatingStack
          inventoryOpen={inventoryOpen}
          onInventory={() => setInventoryOpen((v) => !v)}
          checklistOpen={taskChecklistOpen}
          onChecklist={() => setTaskChecklistOpen((v) => !v)}
        />
        {isDesktop ? (
          <>
            <FloatingPanel
              open={!!detailSp}
              onClose={() => setDetailSpId(null)}
              title={detailSp ? shorePointDrawerTitle(detailSp) : ''}
              cascadeIndex={0}
              boundsSelector=".fs-shell-main"
            >
              {detailSp && <ShorePointDetail sp={detailSp} deployedCount={deployedStrutCount(detailSp, shorePoints)} />}
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
            <FloatingPanel
              open={taskChecklistOpen}
              onClose={() => setTaskChecklistOpen(false)}
              title="Task Level Checklist"
              cascadeIndex={2}
              boundsSelector=".fs-shell-main"
            >
              <TaskLevelChecklist />
            </FloatingPanel>
          </>
        ) : (
          <>
            <SideDrawer
              open={!!detailSp}
              onClose={() => setDetailSpId(null)}
              title={detailSp ? shorePointDrawerTitle(detailSp) : ''}
            >
              {detailSp && <ShorePointDetail sp={detailSp} deployedCount={deployedStrutCount(detailSp, shorePoints)} />}
            </SideDrawer>
            <SideDrawer
              open={inventoryOpen}
              onClose={() => setInventoryOpen(false)}
              title="Available Inventory"
            >
              <InventorySummary items={inventory} roster={roster} />
            </SideDrawer>
            <SideDrawer
              open={taskChecklistOpen}
              onClose={() => setTaskChecklistOpen(false)}
              title="Task Level Checklist"
            >
              <TaskLevelChecklist />
            </SideDrawer>
          </>
        )}
        {/* The Filters surface (2026-07-02 redesign) — Sort + Location + Apparatus
            on both surfaces (sheet on phone, popover anchored to the Filters button
            on desktop). Building/area drill-down lives here; the top division chips
            (full-width redesign, 2026-07-03) are the quick filter. */}
        <OpsFilterSheet
          open={filterSheetOpen}
          onClose={() => setFilterSheetOpen(false)}
          anchor={filtersBtnRef}
          layout={layout}
          sortMode={sortMode}
          onSortMode={(m) => { setSortMode(m); persistPrefs({ sortMode: m }); }}
          listSort={listSort}
          onListSort={(m) => { setListSort(m); persistPrefs({ listSort: m }); }}
          buildingsPresent={buildingsPresent}
          filterBuilding={filterBuilding}
          onBuilding={(v) => { setFilterBuilding(v); persistPrefs({ filterBuilding: v }); }}
          divisionsPresent={divisionsPresent}
          filterDivision={filterDivision}
          onDivision={handleDivisionChange}
          areasPresent={areasPresent}
          filterArea={filterArea}
          onArea={(v) => { setFilterArea(v); persistPrefs({ filterArea: v }); }}
          apparatusPresent={apparatusPresent}
          filterApparatus={filterApparatus}
          onApparatus={(v) => { setFilterApparatus(v); persistPrefs({ filterApparatus: v }); }}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAllFilters}
          mineOn={mineOn && mineAvailable}
          mineAvailable={mineAvailable}
          onMine={(on) => {
            if (on && !mineAvailable) {
              // No declared role yet — close this surface and open declare-role.
              setFilterSheetOpen(false);
              setMyRoleSheetOpen(true);
              return;
            }
            setMineOn(on);
            persistPrefs({ mine: on });
          }}
        />
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

      <OrmBriefingModal
        open={ormOpen}
        briefing={briefing.active}
        onClose={() => setOrmOpen(false)}
        onEnd={async () => {
          if (briefing.active) await briefing.end(briefing.active.id);
          setOrmOpen(false);
        }}
      />

      <AssignEquipmentSheet shorePoint={assignSp} onClose={() => setAssignSpId(null)} onDeployed={handleDeployed} />

      {/* "Mine" lens (#370) nudge: tapping Mine (or its hint) while unavailable opens
          this device-wide sheet — the same one Command uses — rather than a
          duplicate "declare my role" surface. */}
      <MyRoleSheet open={myRoleSheetOpen} onClose={() => setMyRoleSheetOpen(false)} />

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
