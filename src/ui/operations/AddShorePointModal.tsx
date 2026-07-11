import { useEffect, useMemo, useState } from 'react';
import type { BuildingSide, Deductions, ShorePoint, ShorePointPatch, ShoreTypeId } from '@core/schema';
import type { StrutCombination } from '@core/load';
import { NO_DEDUCTIONS } from '@core/schema';
import { SHORE_TYPES, parseLoad } from '@core/load';
import { newId } from '@core/id';
import { restructureBatch } from './restructure';
import { captureLocation } from './locationCapture';
import { compareBuildingValues, divisionLabel, nextSeqBase, parseDivisionNumber } from '@core/operation';
import { assembleBom, effectiveLengthFrom, pendingReasonFor } from '@core/shorepoint';
import { Button, EmptyState, Modal, TextField } from '@ui/primitives';
import { commitHaptic } from '@ui/primitives/haptics';
import { BottomSheetPicker, InlineSegmented } from '@ui/picker';
import { MeasurementInput, DeductionPicker } from '@ui/quickfind';
import {
  useCommit,
  useCommitMany,
  useDeviceUid,
  useInventory,
  useOperation,
  useRecommendations,
  useShorePoints,
} from '@ui/hooks';
import { DivisionPicker } from './DivisionPicker';
import { BuildingPicker } from './BuildingPicker';
import { SidePicker } from './SidePicker';
import { RecommendationCard, comboModel } from './RecommendationCard';
import { SHORE_TYPE_LABELS, NO_MATCH_EMPTY, OVER_CAPACITY_EMPTY } from './cardParts';

// Options for the shore-type form control, derived from the shared label map (one
// source of truth; #435 dedup) in the canonical SHORE_TYPES catalog order. Full
// names (`Vertical T-Shore`, …) stay in that catalog (core/load/plates.ts).
const SHORE_TYPE_OPTIONS = SHORE_TYPES.map((t) => ({ value: t.id, label: SHORE_TYPE_LABELS[t.id] }));

// v3.9.1 lesson: ONLY 3-Post auto-fills its wood (6×6 per USACE/FEMA spec).
// T-Shore / Double-T can be built 4×4 or 6×6 by load and span — the operator
// must choose explicitly; switching away from 3-Post never resets the choice.
const THREE_POST_WOOD: Pick<Deductions, 'headerWood' | 'footerWood'> = {
  headerWood: '6x6',
  footerWood: '6x6',
};

/** Total-cards sanity threshold (shores × struts/shore) — warn, never block (#220 OQ2). */
const QTY_WARN_THRESHOLD = 10;

const shoreTypeLabel = (id: ShoreTypeId) => SHORE_TYPE_OPTIONS.find((o) => o.value === id)!.label;
const strutsPerShoreOf = (id: ShoreTypeId) => SHORE_TYPES.find((t) => t.id === id)!.strutsPerShore;

export interface AddShorePointModalProps {
  open: boolean;
  onClose: () => void;
  /** When truthy the modal pre-populates for editing (Pending only, #220 3-R). */
  shorePoint?: ShorePoint | null;
  /** Create mode only — receives the committed points (board scroll + announce). */
  onAdded?: (added: ShorePoint[]) => void;
  /** One-step deploy outcome: which points deployed vs stayed Pending (out of
   *  stock), so the board can announce "deployed X of N" honestly (audit W1). */
  onDeployed?: (deployed: ShorePoint[], pending: ShorePoint[], model: string) => void;
}

export function AddShorePointModal({ open, onClose, shorePoint, onAdded, onDeployed }: AddShorePointModalProps) {
  const operation = useOperation();
  const shorePoints = useShorePoints();
  const inventory = useInventory();
  const commit = useCommit();
  const commitMany = useCommitMany();
  const getUid = useDeviceUid();
  const editing = !!shorePoint;
  // v3 one-step: Find Available Struts + Deploy live in this form. v4 two-step:
  // describe → Pending → assign from the board (Assign Equipment sheet — which
  // stays available in BOTH modes). Editing never finds/deploys, so the inline
  // section is create-mode only.
  const inlineMode = !!operation?.inlineDeploy && !editing;
  // One-step mode has nothing to deploy when no strut is available on scene (every
  // rig out, or no stock at all). Rather than let it silently fall back to a Pending
  // card (Alex), surface it: a notice + the create button relabeled "Add to Pending".
  const noDeployableStock = inlineMode && !inventory.some((i) => i.type === 'strut' && (i.available ?? 0) > 0);

  const [division, setDivision] = useState(1);
  const [building, setBuilding] = useState('');
  const [area, setArea] = useState('');
  const [side, setSide] = useState<BuildingSide | undefined>(undefined);
  const [assignedResource, setAssignedResource] = useState('');
  const [shoreType, setShoreType] = useState<ShoreTypeId>('t-shore');
  const [qty, setQty] = useState('1');
  const [measurementEighths, setMeasurementEighths] = useState(0);
  const [deductions, setDeductions] = useState<Deductions>(NO_DEDUCTIONS);
  const [estimatedLoad, setEstimatedLoad] = useState('');
  const [label, setLabel] = useState('');

  // Inline find/deploy UI state (create + one-step mode only).
  const [found, setFound] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Group membership for the edit path — the physical shore's live legs (Double-T /
  // 3-Post) or just this point. Drives the D2 re-measure confirmation (H3/#417): a
  // sizing edit fans to every leg, so if a leg is already SET we confirm first.
  const editMembers = useMemo(
    () =>
      shorePoint?.groupId
        ? shorePoints.filter((p) => p.groupId === shorePoint.groupId && p.deletedAt == null)
        : shorePoint
          ? [shorePoint]
          : [],
    [shorePoint, shorePoints],
  );
  const setLegCount = editMembers.filter((m) => m.status !== 'pending').length;
  const [remeasureConfirm, setRemeasureConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (shorePoint) {
      setDivision(parseDivisionNumber(shorePoint.division) ?? 1);
      setBuilding(shorePoint.building ?? '');
      setArea(shorePoint.area ?? '');
      setSide(shorePoint.side);
      setAssignedResource(shorePoint.assignedResource ?? '');
      setShoreType(shorePoint.shoreType);
      setMeasurementEighths(shorePoint.measurementEighths);
      setDeductions(shorePoint.deductions);
      setEstimatedLoad(shorePoint.estimatedLoad != null ? String(shorePoint.estimatedLoad) : '');
      setLabel(shorePoint.label ?? '');
    } else {
      // Last-used defaults (#220, #248 re-drive): the newest point in the op seeds
      // the LOCATION block — building / division / area / crew — so a new point in
      // the same spot is near-zero effort. Shore type is DELIBERATELY not carried
      // (SIM-IV O-6, Alex 2026-07-02): each shore's type is its own decision, and a
      // silent carry-over made SP2 a 3-Post nobody chose. It resets to T-Shore every
      // open; the operator picks it per point.
      const last = shorePoints[shorePoints.length - 1];
      setDivision(parseDivisionNumber(last?.division) ?? 1);
      setBuilding(last?.building ?? '');
      setArea(last?.area ?? '');
      setSide(last?.side); // side is a location attribute — carries over like division/area
      setAssignedResource(last?.assignedResource ?? '');
      setShoreType('t-shore');
      setMeasurementEighths(0);
      setDeductions(NO_DEDUCTIONS);
      setEstimatedLoad('');
      setLabel('');
    }
    setQty('1');
    setFound(false);
    setDeploying(false);
    setDeployError(null);
    // Deliberately keyed on open alone — the form must NOT re-seed itself from
    // a mid-edit store update (e.g. a peer event re-rendering the board).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function selectShoreType(next: ShoreTypeId) {
    setShoreType(next);
    if (next === '3-post') setDeductions((d) => ({ ...d, ...THREE_POST_WOOD }));
  }

  const qtyNum = qty.trim() === '' ? NaN : Number(qty);
  const qtyValid = Number.isInteger(qtyNum) && qtyNum >= 1;
  // KB-7: qty = number of SHORES; the shore type drives struts per shore
  // (T-Shore 1, Double-T 2, 3-Post 3). Cards created = shores × struts/shore.
  const strutsPerShore = strutsPerShoreOf(shoreType);
  const totalStruts = qtyValid ? qtyNum * strutsPerShore : 0;
  const effective = effectiveLengthFrom(measurementEighths, deductions);

  // "Number of Shore Sets" stamps N INDEPENDENT physical shores — they do NOT share
  // a groupId or move in lock-step (that grouping is per-shore, driven by the shore
  // TYPE: Double-T = 2 struts, 3-Post = 3). The v3 "qty>1 shares a groupId" mental
  // model primes exactly the wrong expectation, so the form says so out loud when
  // qty>1 (SIM-IV O-5, #400). The struts-per-shore ratio note rides alongside it.
  const qtyHelper = (() => {
    if (!qtyValid) return undefined;
    const parts: string[] = [];
    if (qtyNum > 1) parts.push('Each set is its own independent shore point');
    // The KB-7 struts-per-shore ratio, shown only when it's non-trivial (Double-T,
    // 3-Post). For a 1-strut T-Shore "N T-Shore = N struts" is noise.
    if (strutsPerShore > 1)
      parts.push(
        `${qtyNum} ${shoreTypeLabel(shoreType)} = ${totalStruts} struts${
          totalStruts > QTY_WARN_THRESHOLD ? ' — double-check the count' : ''
        }`,
      );
    return parts.length ? parts.join(' · ') : undefined;
  })();

  // Estimated load (lbs) — optional planning input feeding the engine's capacity
  // gating. Blank = 0 (no-load). Must be non-negative and within range.
  const { loadNum, loadValid } = parseLoad(estimatedLoad);

  const buildingRequired = !!operation?.multiBuilding;
  // Distinct buildings already placed in this op — the BuildingPicker's list. A
  // new name joins it once its first shore point is saved (building is per-point,
  // not operation-level — it rides the same carry-over as division/shore type).
  const buildingsUsed = useMemo(
    () => [...new Set(shorePoints.map((sp) => sp.building).filter((b): b is string => !!b))].sort(compareBuildingValues),
    [shorePoints],
  );

  const disabledReason =
    measurementEighths <= 0
      ? 'Enter the opening measurement'
      : effective <= 0
        ? 'Deductions consume the whole opening'
        : !loadValid
          ? 'Load must be between 0 and 500,000 lbs'
          : !editing && !qtyValid
            ? 'Number of Shore Sets must be a whole number of 1 or more'
            : buildingRequired && building.trim() === ''
              ? 'Enter the building'
              : null;
  const canSubmit = disabledReason === null;

  // Group picker source: the distinct apparatus already on scene (40-inventory).
  // assignedResource stores the rig NAME (what the card + Command roll-up show).
  const apparatusOptions = useMemo(() => {
    const names = [...new Set(inventory.map((i) => i.apparatus).filter(Boolean))].sort();
    return [{ value: '', label: '— None —' }, ...names.map((n) => ({ value: n, label: n }))];
  }, [inventory]);

  // #409: in-stock plates sort first in the deduction pickers — scoped to the
  // assigned rig when one is set, department-wide otherwise. Only filters when
  // plate stock is tracked at all (an empty inventory keeps the flat catalog).
  const availablePlateIds = useMemo(() => {
    const plates = inventory.filter((i) => i.type === 'plate' && i.plateId);
    if (plates.length === 0) return undefined;
    const scoped = assignedResource ? plates.filter((i) => i.apparatus === assignedResource) : plates;
    return new Set(scoped.filter((i) => i.available > 0).map((i) => i.plateId!));
  }, [inventory, assignedResource]);

  // Draft shore point for the inline recommendation engine — same fields a saved
  // point carries, so findForShorePoint computes identically (no UI-side math).
  const draftSp = useMemo<ShorePoint | null>(() => {
    if (!operation || measurementEighths <= 0) return null;
    return {
      id: 'draft',
      opId: operation.id,
      division: String(division),
      ...(building.trim() ? { building: building.trim() } : {}),
      ...(area.trim() ? { area: area.trim() } : {}),
      shoreType,
      measurementEighths,
      deductions,
      ...(loadNum > 0 ? { estimatedLoad: loadNum } : {}),
      status: 'pending',
    };
  }, [operation, division, building, area, shoreType, measurementEighths, deductions, loadNum]);

  const recommendations = useRecommendations(inlineMode && found ? draftSp : null);
  const noResultsReason =
    inlineMode && found && draftSp && recommendations.length === 0 ? pendingReasonFor(draftSp, inventory) : undefined;

  const draftLocation = useMemo(
    () => [divisionLabel(String(division)), building.trim() || undefined, area.trim() || undefined].filter(Boolean).join(' · '),
    [division, building, area],
  );

  // The struts of ONE physical shore (KB-7: T-Shore=1, Double-T=2, 3-Post=3,
  // sharing a groupId), carrying the given created-order number. Shared by the add
  // flow (one call per shore) and the edit-time type-change rebuild (handleSaveEdit).
  // `type` overrides the form's selection for the Add-N-struts one-tap fix.
  function buildShoreStruts(seq: number | undefined, type: ShoreTypeId = shoreType): ShorePoint[] {
    const perShore = strutsPerShoreOf(type);
    const groupId = perShore > 1 ? newId() : undefined;
    return Array.from({ length: perShore }, (_, strut) => ({
      id: newId(),
      opId: operation!.id,
      ...(seq != null ? { seq } : {}),
      division: String(division),
      ...(building.trim() ? { building: building.trim() } : {}),
      ...(area.trim() ? { area: area.trim() } : {}),
      ...(side ? { side } : {}),
      shoreType: type,
      ...(groupId ? { groupId, groupIndex: strut + 1, groupTotal: perShore } : {}),
      measurementEighths,
      deductions,
      ...(label.trim() ? { label: label.trim() } : {}),
      ...(assignedResource ? { assignedResource } : {}),
      ...(loadNum > 0 ? { estimatedLoad: loadNum } : {}),
      status: 'pending',
    }));
  }

  // One add fans out to cards = shores × struts/shore (KB-7); multi-strut shores
  // share one groupId per physical shore. Shared by Save-as-Pending and Deploy.
  // Stable per-op number: max(existing)+1 per PHYSICAL shore (max, not count, so a
  // deleted number is never reused).
  function buildPoints(type: ShoreTypeId = shoreType): ShorePoint[] {
    const baseSeq = nextSeqBase(shorePoints);
    const points: ShorePoint[] = [];
    for (let shore = 0; shore < qtyNum; shore++) {
      points.push(...buildShoreStruts(baseSeq + shore + 1, type));
    }
    return points;
  }

  // Create the Pending card(s) — the two-step "Add Shore Point" and the one-step
  // "Save as Pending" both land here. One atomic batch (#220).
  async function handleCreatePending() {
    if (!canSubmit || !operation) return;
    const uid = await getUid();
    const at = Date.now();
    const points = buildPoints();
    const result = await commitMany(
      points.map((sp) => ({ type: 'ShorePointAdded', id: newId(), opId: operation.id, at, by: uid, shorePoint: sp })),
    );
    if (result.ok) {
      commitHaptic();
      // #441 — background GPS capture where the inputter stands; one fix fans to
      // every point of the add. Never awaited, never blocks the workflow.
      void captureLocation(points.map((p) => p.id), operation.id, commitMany, uid);
      onAdded?.(points);
      onClose();
    }
  }

  // One-step deploy: create the point(s), then put the chosen combo on each.
  // `typeOverride` is the Add-N-struts one-tap fix — build at the shore type the
  // load needs instead of the form's selection (accepted mockup 2026-07-01).
  async function handleDeploy(combo: StrutCombination, typeOverride?: ShoreTypeId) {
    if (!operation || deploying) return;
    const type = typeOverride ?? shoreType;
    const inventoryId = combo.strut.inventoryId;
    const item = inventoryId ? inventory.find((i) => i.id === inventoryId) : undefined;
    if (!inventoryId || !item) {
      setDeployError('That strut is no longer in inventory — re-check stock.');
      return;
    }
    setDeploying(true);
    setDeployError(null);
    const uid = await getUid();
    const at = Date.now();
    const points = buildPoints(type);
    // Per-strut over-capacity at the BUILT type: deploying short of the struts the
    // load needs. The card gated Deploy behind the team ack, so firing IS the ack.
    const shortDeploy =
      !combo.unrated && combo.capacity > 0 && loadNum > 0 && loadNum / strutsPerShoreOf(type) > combo.capacity;
    const addResult = await commitMany(
      points.map((sp) => ({ type: 'ShorePointAdded', id: newId(), opId: operation.id, at, by: uid, shorePoint: sp })),
    );
    if (!addResult.ok) {
      setDeployError('Could not create the shore point — try again.');
      setDeploying(false);
      return;
    }
    // #441 — same background capture as the two-step path, fired once the points
    // exist (deploy outcomes don't change where the shore physically is).
    void captureLocation(points.map((p) => p.id), operation.id, commitMany, uid);
    // commitMany can't carry inventory events — deploy each created point with a
    // single commit (its own pre-flight + decrement-abort-on-zero transaction).
    // The chosen combo goes on every point of the add (same opening, same strut).
    // Honor each result: when stock runs out mid-batch the overflow points stay
    // Pending — surface "deployed X of N" instead of a silent success (audit W1).
    const model = comboModel(combo);
    const deployed: ShorePoint[] = [];
    for (const p of points) {
      // Each member sources its own full BOM (ADR-033); the store decrements every
      // tracked component atomically. Honor each result so an exhausted-stock member
      // stays Pending (audit W1) rather than failing the whole group.
      const deployedBom = assembleBom(combo, p.deductions, { apparatus: item.apparatus, inventoryId }, inventory);
      const result = await commit({
        type: 'EquipmentDeployed',
        id: newId(),
        opId: operation.id,
        at: Date.now(),
        by: uid,
        spId: p.id,
        deployedBom,
        // The card's gates held Deploy until acknowledged — persist the acks so the
        // store's off-UI deploy guard accepts what the operator already recorded.
        ...(combo.unrated ? { unratedAcknowledged: true } : {}),
        ...(shortDeploy ? { overCapacityAcknowledged: true } : {}),
      });
      if (result.ok) deployed.push(p);
      else break; // stock exhausted — every remaining point stays Pending
    }
    const pending = points.slice(deployed.length);
    if (deployed.length > 0) commitHaptic(); // no success buzz when nothing deployed
    onDeployed?.(deployed, pending, model); // board owns the lane focus + announce
    onClose();
  }

  // Edit an existing Pending point (#220 3-R). assignedResource is reassignable
  // throughout the op; measurement/shore type lock once past Pending (reducer).
  async function handleSaveEdit(confirmed = false) {
    if (!canSubmit || !operation || !shorePoint) return;
    const uid = await getUid();
    const sp = shorePoint;

    // A shore-type change that changes the STRUT COUNT can't be a simple patch — it
    // restructures the physical shore (T-Shore=1, Double-T=2, 3-Post=3 struts). When
    // the whole physical shore is still Pending, rebuild it: hard-remove the old
    // struts and recreate the group at the new count, KEEPING the shore's number
    // (seq) and applying the edited location/measurement. Grow adds struts; shrink
    // drops the extras (Alex's call). A mate already deployed (mixed-status group)
    // falls through to the plain patch below — never tear down a deployed strut.
    const members = editMembers;
    if (members.every((m) => m.status === 'pending') && strutsPerShore !== members.length) {
      const at = Date.now();
      // #441 — the rebuild recreates the SAME physical shore at a new strut count;
      // its captured location carries over (buildShoreStruts only knows form fields).
      const rebuilt = buildShoreStruts(sp.seq).map((p) => ({
        ...p,
        ...(sp.coords ? { coords: sp.coords } : {}),
        ...(sp.w3w ? { w3w: sp.w3w } : {}),
      }));
      const result = await commitMany(restructureBatch(members, rebuilt, operation.id, uid, at));
      if (result.ok) {
        commitHaptic();
        onAdded?.(rebuilt);
        onClose();
      }
      return;
    }

    const patch: ShorePointPatch = {};
    if (String(division) !== sp.division) patch.division = String(division);
    const newBuilding = building.trim() || null;
    if (newBuilding !== (sp.building ?? null)) patch.building = newBuilding;
    const newArea = area.trim() || null;
    if (newArea !== (sp.area ?? null)) patch.area = newArea;
    const newSide = side ?? null;
    if (newSide !== (sp.side ?? null)) patch.side = newSide;
    const newResource = assignedResource || null;
    if (newResource !== (sp.assignedResource ?? null)) patch.assignedResource = newResource;
    if (shoreType !== sp.shoreType) patch.shoreType = shoreType;
    if (measurementEighths !== sp.measurementEighths) patch.measurementEighths = measurementEighths;
    const newLoad = loadNum > 0 ? loadNum : null;
    if (newLoad !== (sp.estimatedLoad ?? null)) patch.estimatedLoad = newLoad;
    if (
      deductions.headerWood !== sp.deductions.headerWood ||
      deductions.footerWood !== sp.deductions.footerWood ||
      deductions.topPlate !== sp.deductions.topPlate ||
      deductions.bottomPlate !== sp.deductions.bottomPlate
    ) {
      patch.deductions = deductions;
    }
    const newLabel = label.trim() || null;
    if (newLabel !== (sp.label ?? null)) patch.label = newLabel;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    // A grouped shore is ONE physical shore — its legs must stay identical in every
    // edited field (measurement, deductions, location, load, label, assigned crew),
    // or they diverge into different effective + cut lengths for the same shore
    // (2026-07-02 audit #3: editing one leg's measurement left its mate at the old
    // length — an unbuildable, un-warned shore). Fan the SAME patch to every live
    // group-mate (`members`, computed above); an ungrouped shore is just [sp], so a
    // single-strut edit keeps the existing one-event path. A shore-type change never
    // reaches here (it always changes the strut count → the rebuild branch above).
    // D2 (2026-07-04 audit H3/#417): the fan-out above now reaches DEPLOYED legs too,
    // so one physical shore keeps one length. Don't re-spec a set strut silently — when
    // a fit-affecting field changed and a leg is already set, confirm first (the set
    // strut then flags for re-check via the honest re-verify verdict).
    const sizingChanged =
      patch.measurementEighths !== undefined || patch.deductions !== undefined || patch.shoreType !== undefined;
    if (sizingChanged && setLegCount > 0 && !confirmed) {
      setRemeasureConfirm(true);
      return;
    }

    const at = Date.now();
    const edits = members.map((m) => ({
      type: 'ShorePointEdited' as const,
      id: newId(),
      opId: operation.id,
      at,
      by: uid,
      spId: m.id,
      patch,
    }));
    const result = edits.length > 1 ? await commitMany(edits) : await commit(edits[0]!);
    if (result.ok) {
      commitHaptic();
      onClose();
    }
  }

  // The submit action: edit → Save; one-step create → Save as Pending (Deploy
  // lives on the result cards); two-step create → Add Shore Point. It rides at the
  // BOTTOM OF THE FORM CONTENT (#248 re-drive) — NOT the modal's pinned footer — so
  // a long form reads as scrollable. A pinned bar capped the form and hid the
  // measurement / deductions / load fields below it.
  const submitAction = editing ? (
    <Button
      variant="primary"
      fullWidth
      disabled={!canSubmit}
      disabledReason={disabledReason ?? undefined}
      onPress={() => handleSaveEdit()}
    >
      Save
    </Button>
  ) : inlineMode ? (
    <Button
      // No stock to deploy → this IS the action, so emphasize it (primary) and
      // name it for what it does. Otherwise it's the secondary escape hatch.
      variant={noDeployableStock ? 'primary' : 'secondary'}
      fullWidth
      disabled={!canSubmit}
      disabledReason={disabledReason ?? undefined}
      onPress={handleCreatePending}
    >
      {noDeployableStock ? 'Add to Pending' : 'Save as Pending'}
    </Button>
  ) : (
    <Button
      variant="primary"
      fullWidth
      disabled={!canSubmit}
      disabledReason={disabledReason ?? undefined}
      onPress={handleCreatePending}
    >
      Add Shore Point
    </Button>
  );

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Shore Point' : 'Add Shore Point'}
      variant="form"
    >
      {/* Field order (#248 re-drive 2): Building → Division · Area/Room # · Group →
          Label → Shore Type → Quantity → Measurement → Deductions → Est. Load →
          (inline) Find. Location first, then identity, then sizing. */}
      <div className="fs-ops-form">
        {buildingRequired && (
          <BuildingPicker value={building} onChange={setBuilding} buildings={buildingsUsed} />
        )}
        {/* Division · Side · Area/Room # share one line (O-9); Group drops below. */}
        <div className="fs-ops-row3">
          <DivisionPicker value={division} onChange={setDivision} />
          <SidePicker value={side} onChange={setSide} />
          <TextField label="Area / Room #" value={area} onChange={setArea} placeholder="Optional" />
        </div>
        {(apparatusOptions.length > 1 || assignedResource) && (
          <BottomSheetPicker
            label="Group"
            options={apparatusOptions}
            value={assignedResource}
            onSelect={setAssignedResource}
          />
        )}
        <TextField label="Label" value={label} onChange={setLabel} placeholder="Optional — e.g. West Wall Window" />
        <InlineSegmented label="Shore type" options={SHORE_TYPE_OPTIONS} value={shoreType} onChange={selectShoreType} />
        {!editing && (
          <TextField
            label="Number of Shore Sets"
            value={qty}
            onChange={setQty}
            inputMode="numeric"
            maxLength={3}
            helper={qtyHelper}
          />
        )}
        <MeasurementInput value={measurementEighths} onChange={setMeasurementEighths} />
        <DeductionPicker
          measurementEighths={measurementEighths}
          value={deductions}
          onChange={setDeductions}
          collapsible
          availablePlateIds={availablePlateIds}
          stockLabel={assignedResource || undefined}
        />
        <TextField
          label="Estimated load (lbs) — optional"
          value={estimatedLoad}
          onChange={setEstimatedLoad}
          inputMode="numeric"
          maxLength={7}
          placeholder="e.g. 15000"
          helper="Leave blank if unknown"
        />

        {inlineMode && noDeployableStock && (
          <p className="fs-assign-notice" role="status">
            No stock available to deploy — this will be added to Pending.
          </p>
        )}
        {inlineMode && !noDeployableStock && (
          <>
            {!found && (
              <Button
                variant="primary"
                fullWidth
                disabled={!canSubmit}
                disabledReason={disabledReason ?? undefined}
                onPress={() => setFound(true)}
              >
                Find Available Struts
              </Button>
            )}
            {found && recommendations.length > 0 && (
              <div className="fs-assign-list">
                {recommendations.map((combo) => (
                  <RecommendationCard
                    key={`${combo.strut.inventoryId ?? combo.strut.id}|${combo.extensions.join('+')}`}
                    combo={combo}
                    deductions={deductions}
                    source={
                      combo.strut.inventoryId
                        ? inventory.find((i) => i.id === combo.strut.inventoryId)?.apparatus
                        : undefined
                    }
                    location={draftLocation}
                    onDeploy={handleDeploy}
                    deployDisabled={deploying}
                    estimatedLoad={loadNum > 0 ? loadNum : undefined}
                    currentStruts={strutsPerShore}
                    onAddStruts={(c, targetType) => {
                      // One tap: build at the shore type the load needs. The form
                      // control follows so the officer sees what was built.
                      setShoreType(targetType);
                      void handleDeploy(c, targetType);
                    }}
                  />
                ))}
              </div>
            )}
            {found && recommendations.length === 0 && noResultsReason === 'no-match' && (
              <EmptyState
                variant="filtered"
                headline={NO_MATCH_EMPTY.headline}
                reason={NO_MATCH_EMPTY.reason}
              />
            )}
            {found && recommendations.length === 0 && noResultsReason === 'no-inventory' && (
              <EmptyState
                variant="upstream-blocked"
                headline="No apparatus stock available"
                reason="A strut that fits exists, but none is available on scene"
              />
            )}
            {found && recommendations.length === 0 && noResultsReason === 'over-capacity' && (
              <EmptyState
                variant="upstream-blocked"
                headline={OVER_CAPACITY_EMPTY.headline}
                reason={OVER_CAPACITY_EMPTY.reason}
              />
            )}
            {deployError && (
              <p role="alert" className="fs-assign-error">
                {deployError}
              </p>
            )}
          </>
        )}
        {/* Submit rides at the end of the scrolling form, not a pinned footer (#248). */}
        {submitAction}
      </div>
    </Modal>

    {/* D2 re-measure confirmation (H3/#417): a sizing edit on a group with an already-
        set leg fans to every leg (so one shore keeps one length) — confirm first, since
        the set strut's recorded length changes and it must be physically re-checked. */}
    <Modal
      open={remeasureConfirm}
      onClose={() => setRemeasureConfirm(false)}
      title="Re-measure this shore?"
      variant="destructive"
      footer={
        <>
          <Button variant="secondary" onPress={() => setRemeasureConfirm(false)}>
            <span data-modal-cancel>Cancel</span>
          </Button>
          <Button
            variant="primary"
            destructive
            onPress={() => {
              setRemeasureConfirm(false);
              void handleSaveEdit(true);
            }}
          >
            Update all legs
          </Button>
        </>
      }
    >
      <p>
        This shore has <strong>{setLegCount}</strong> of <strong>{editMembers.length}</strong> struts already set.
        Updating the measurement changes every leg so the shore stays one length — the set strut
        {setLegCount > 1 ? 's' : ''} will be flagged for re-check.
      </p>
    </Modal>
    </>
  );
}
