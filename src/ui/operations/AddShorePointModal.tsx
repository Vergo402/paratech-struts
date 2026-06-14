import { useEffect, useMemo, useState } from 'react';
import type { Deductions, ShorePoint, ShorePointPatch, ShoreTypeId } from '@core/schema';
import type { StrutCombination } from '@core/load';
import { NO_DEDUCTIONS } from '@core/schema';
import { SHORE_TYPES } from '@core/load';
import { newId } from '@core/id';
import { divisionLabel, nextSeqBase } from '@core/operation';
import { effectiveLengthFrom, pendingReasonFor } from '@core/shorepoint';
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
import { RecommendationCard, comboModel } from './RecommendationCard';

// Short labels for the form control; full names (`Vertical T-Shore`, …) stay in
// the verbatim-ported SHORE_TYPES catalog (core/load/plates.ts) — display only.
const SHORE_TYPE_OPTIONS = [
  { value: 't-shore', label: 'T-Shore' },
  { value: 'double-t', label: 'Double-T' },
  { value: '3-post', label: '3-Post' },
] as const;

// v3.9.1 lesson: ONLY 3-Post auto-fills its wood (6×6 per USACE/FEMA spec).
// T-Shore / Double-T can be built 4×4 or 6×6 by load and span — the operator
// must choose explicitly; switching away from 3-Post never resets the choice.
const THREE_POST_WOOD: Pick<Deductions, 'headerWood' | 'footerWood'> = {
  headerWood: '6x6',
  footerWood: '6x6',
};

/** Total-cards sanity threshold (shores × struts/shore) — warn, never block (#220 OQ2). */
const QTY_WARN_THRESHOLD = 10;

/** v3 MAX_LOAD_LBS — estimated load upper bound (planning input only). */
const MAX_LOAD_LBS = 500_000;

const shoreTypeLabel = (id: ShoreTypeId) => SHORE_TYPE_OPTIONS.find((o) => o.value === id)!.label;
const strutsPerShoreOf = (id: ShoreTypeId) => SHORE_TYPES.find((t) => t.id === id)!.strutsPerShore;

function parseDivision(division: string | undefined): number {
  if (division && /^-?\d{1,3}$/.test(division.trim())) {
    const n = parseInt(division, 10);
    if (n !== 0) return n;
  }
  return 1;
}

export interface AddShorePointModalProps {
  open: boolean;
  onClose: () => void;
  /** When truthy the modal pre-populates for editing (Pending only, #220 3-R). */
  shorePoint?: ShorePoint | null;
  /** Create mode only — receives the committed points (board scroll + announce). */
  onAdded?: (added: ShorePoint[]) => void;
}

export function AddShorePointModal({ open, onClose, shorePoint, onAdded }: AddShorePointModalProps) {
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

  const [division, setDivision] = useState(1);
  const [building, setBuilding] = useState('');
  const [area, setArea] = useState('');
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

  useEffect(() => {
    if (!open) return;
    if (shorePoint) {
      setDivision(parseDivision(shorePoint.division));
      setBuilding(shorePoint.building ?? '');
      setArea(shorePoint.area ?? '');
      setAssignedResource(shorePoint.assignedResource ?? '');
      setShoreType(shorePoint.shoreType);
      setMeasurementEighths(shorePoint.measurementEighths);
      setDeductions(shorePoint.deductions);
      setEstimatedLoad(shorePoint.estimatedLoad != null ? String(shorePoint.estimatedLoad) : '');
      setLabel(shorePoint.label ?? '');
    } else {
      // Last-used defaults (#220): the newest point in the op seeds division /
      // shore type / building / crew; first point of the op starts Div 1 / T-Shore.
      const last = shorePoints[shorePoints.length - 1];
      setDivision(parseDivision(last?.division));
      setBuilding(last?.building ?? '');
      setArea('');
      setAssignedResource(last?.assignedResource ?? '');
      setShoreType(last?.shoreType ?? 't-shore');
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

  // Estimated load (lbs) — optional planning input feeding the engine's capacity
  // gating. Blank = 0 (no-load). Must be non-negative and within range.
  const loadTrim = estimatedLoad.trim();
  const loadNum = loadTrim === '' ? 0 : Number(loadTrim);
  const loadValid = loadTrim === '' || (Number.isFinite(loadNum) && loadNum >= 0 && loadNum <= MAX_LOAD_LBS);

  const buildingRequired = !!operation?.multiBuilding;

  const disabledReason =
    measurementEighths <= 0
      ? 'Enter the opening measurement'
      : effective <= 0
        ? 'Deductions consume the whole opening'
        : !loadValid
          ? 'Load must be between 0 and 500,000 lbs'
          : !editing && !qtyValid
            ? 'Number of shores must be a whole number of 1 or more'
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

  // One add fans out to cards = shores × struts/shore (KB-7); multi-strut shores
  // share one groupId per physical shore. Shared by Save-as-Pending and Deploy.
  function buildPoints(): ShorePoint[] {
    const points: ShorePoint[] = [];
    // Stable per-op number: max(existing)+1, one per PHYSICAL shore (a grouped
    // shore's struts share it). max — not count — so a deleted number is never reused.
    const baseSeq = nextSeqBase(shorePoints);
    for (let shore = 0; shore < qtyNum; shore++) {
      const groupId = strutsPerShore > 1 ? newId() : undefined;
      const seq = baseSeq + shore + 1;
      for (let strut = 0; strut < strutsPerShore; strut++) {
        points.push({
          id: newId(),
          opId: operation!.id,
          seq,
          division: String(division),
          ...(building.trim() ? { building: building.trim() } : {}),
          ...(area.trim() ? { area: area.trim() } : {}),
          shoreType,
          ...(groupId ? { groupId, groupIndex: strut + 1, groupTotal: strutsPerShore } : {}),
          measurementEighths,
          deductions,
          ...(label.trim() ? { label: label.trim() } : {}),
          ...(assignedResource ? { assignedResource } : {}),
          ...(loadNum > 0 ? { estimatedLoad: loadNum } : {}),
          status: 'pending',
        });
      }
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
      onAdded?.(points);
      onClose();
    }
  }

  // One-step deploy: create the point(s), then put the chosen combo on each.
  async function handleDeploy(combo: StrutCombination) {
    if (!operation || deploying) return;
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
    const points = buildPoints();
    const addResult = await commitMany(
      points.map((sp) => ({ type: 'ShorePointAdded', id: newId(), opId: operation.id, at, by: uid, shorePoint: sp })),
    );
    if (!addResult.ok) {
      setDeployError('Could not create the shore point — try again.');
      setDeploying(false);
      return;
    }
    // commitMany can't carry inventory events — deploy each created point with a
    // single commit (its own pre-flight + decrement-abort-on-zero transaction).
    // The chosen combo goes on every point of the add (same opening, same strut).
    // ponytail: partial stock leaves the overflow points Pending on the board;
    // a "deployed X of N" toast can come if field use asks — the board shows it.
    const model = comboModel(combo);
    for (const p of points) {
      await commit({
        type: 'StrutDeployed',
        id: newId(),
        opId: operation.id,
        at: Date.now(),
        by: uid,
        spId: p.id,
        deployedStrut: { model, source: item.apparatus, inventoryId },
      });
    }
    commitHaptic();
    onAdded?.(points);
    onClose();
  }

  // Edit an existing Pending point (#220 3-R). assignedResource is reassignable
  // throughout the op; measurement/shore type lock once past Pending (reducer).
  async function handleSaveEdit() {
    if (!canSubmit || !operation || !shorePoint) return;
    const uid = await getUid();
    const sp = shorePoint;
    const patch: ShorePointPatch = {};
    if (String(division) !== sp.division) patch.division = String(division);
    const newBuilding = building.trim() || null;
    if (newBuilding !== (sp.building ?? null)) patch.building = newBuilding;
    const newArea = area.trim() || null;
    if (newArea !== (sp.area ?? null)) patch.area = newArea;
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

    const result = await commit({
      type: 'ShorePointEdited',
      id: newId(),
      opId: operation.id,
      at: Date.now(),
      by: uid,
      spId: sp.id,
      patch,
    });
    if (result.ok) {
      commitHaptic();
      onClose();
    }
  }

  // Footer: edit → Save; one-step create → Save as Pending (Deploy lives on the
  // result cards); two-step create → Add Shore Point.
  const footer = editing ? (
    <Button
      variant="primary"
      fullWidth
      disabled={!canSubmit}
      disabledReason={disabledReason ?? undefined}
      onPress={handleSaveEdit}
    >
      Save
    </Button>
  ) : inlineMode ? (
    <Button
      variant="secondary"
      fullWidth
      disabled={!canSubmit}
      disabledReason={disabledReason ?? undefined}
      onPress={handleCreatePending}
    >
      Save as Pending
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
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Shore Point' : 'Add Shore Point'}
      variant="form"
      footer={footer}
    >
      {/* v3 field order: Shore Type → Label → Building → Division · Area · Group
          → Measurement → Deductions → Est. Load → Quantity → (inline) Find. */}
      <div className="fs-ops-form">
        <InlineSegmented label="Shore type" options={SHORE_TYPE_OPTIONS} value={shoreType} onChange={selectShoreType} />
        <TextField label="Label" value={label} onChange={setLabel} placeholder="Optional — e.g. West Wall Window" />
        {buildingRequired && (
          <TextField label="Building" value={building} onChange={setBuilding} placeholder="e.g. North tower" />
        )}
        {/* v3 form-row-3: Division · Area · Group share one line. */}
        <div className="fs-ops-row3">
          <DivisionPicker value={division} onChange={setDivision} />
          <TextField label="Area" value={area} onChange={setArea} placeholder="Optional" />
          {(apparatusOptions.length > 1 || assignedResource) && (
            <BottomSheetPicker
              label="Group"
              options={apparatusOptions}
              value={assignedResource}
              onSelect={setAssignedResource}
            />
          )}
        </div>
        <MeasurementInput value={measurementEighths} onChange={setMeasurementEighths} />
        <DeductionPicker measurementEighths={measurementEighths} value={deductions} onChange={setDeductions} />
        <TextField
          label="Estimated load (lbs) — optional"
          value={estimatedLoad}
          onChange={setEstimatedLoad}
          inputMode="numeric"
          maxLength={7}
          placeholder="e.g. 15000"
          helper="Leave blank if unknown"
        />
        {!editing && (
          <TextField
            label="Number of shores"
            value={qty}
            onChange={setQty}
            inputMode="numeric"
            maxLength={3}
            helper={
              qtyValid && totalStruts > 1
                ? `${qtyNum} × ${shoreTypeLabel(shoreType)} = ${totalStruts} struts${
                    totalStruts > QTY_WARN_THRESHOLD ? ' — double-check the count' : ''
                  }`
                : undefined
            }
          />
        )}

        {inlineMode && (
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
                  />
                ))}
              </div>
            )}
            {found && recommendations.length === 0 && noResultsReason === 'no-match' && (
              <EmptyState
                variant="filtered"
                headline="No matching struts"
                reason="Nothing fits this opening at this load — adjust deductions or re-measure"
              />
            )}
            {found && recommendations.length === 0 && noResultsReason === 'no-inventory' && (
              <EmptyState
                variant="upstream-blocked"
                headline="No apparatus stock available"
                reason="A strut that fits exists, but none is available on scene"
              />
            )}
            {deployError && (
              <p role="alert" className="fs-assign-error">
                {deployError}
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
