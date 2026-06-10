import { useEffect, useState } from 'react';
import type { Deductions, ShorePoint, ShorePointPatch, ShoreTypeId } from '@core/schema';
import { NO_DEDUCTIONS } from '@core/schema';
import { newId } from '@core/id';
import { effectiveLengthFrom } from '@core/shorepoint';
import { Button, Modal, TextField } from '@ui/primitives';
import { commitHaptic } from '@ui/primitives/haptics';
import { InlineSegmented } from '@ui/picker';
import { MeasurementInput, DeductionPicker } from '@ui/quickfind';
import { useCommit, useCommitMany, useDeviceUid, useOperation, useShorePoints } from '@ui/hooks';
import { DivisionPicker } from './DivisionPicker';

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

/** Grouped-quantity sanity threshold — warn, never block (#220 OQ2). */
const QTY_WARN_THRESHOLD = 10;

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
  const commit = useCommit();
  const commitMany = useCommitMany();
  const getUid = useDeviceUid();
  const editing = !!shorePoint;

  const [division, setDivision] = useState(1);
  const [building, setBuilding] = useState('');
  const [area, setArea] = useState('');
  const [shoreType, setShoreType] = useState<ShoreTypeId>('t-shore');
  const [qty, setQty] = useState('1');
  const [measurementEighths, setMeasurementEighths] = useState(0);
  const [deductions, setDeductions] = useState<Deductions>(NO_DEDUCTIONS);
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!open) return;
    if (shorePoint) {
      setDivision(parseDivision(shorePoint.division));
      setBuilding(shorePoint.building ?? '');
      setArea(shorePoint.area ?? '');
      setShoreType(shorePoint.shoreType);
      setMeasurementEighths(shorePoint.measurementEighths);
      setDeductions(shorePoint.deductions);
      setLabel(shorePoint.label ?? '');
    } else {
      // Last-used defaults (#220): the newest point in the op seeds division /
      // shore type / building; first point of the op starts Div 1 / T-Shore.
      const last = shorePoints[shorePoints.length - 1];
      setDivision(parseDivision(last?.division));
      setBuilding(last?.building ?? '');
      setArea('');
      setShoreType(last?.shoreType ?? 't-shore');
      setMeasurementEighths(0);
      setDeductions(NO_DEDUCTIONS);
      setLabel('');
    }
    setQty('1');
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
  const effective = effectiveLengthFrom(measurementEighths, deductions);
  const buildingRequired = !!operation?.multiBuilding;

  const disabledReason =
    measurementEighths <= 0
      ? 'Enter the opening measurement'
      : effective <= 0
        ? 'Deductions consume the whole opening'
        : !editing && !qtyValid
          ? 'Quantity must be a whole number of 1 or more'
          : buildingRequired && building.trim() === ''
            ? 'Enter the building'
            : null;
  const canSubmit = disabledReason === null;

  async function handleSubmit() {
    if (!canSubmit || !operation) return;
    const uid = await getUid();

    if (editing) {
      const sp = shorePoint!;
      const patch: ShorePointPatch = {};
      if (String(division) !== sp.division) patch.division = String(division);
      const newBuilding = building.trim() || null;
      if (newBuilding !== (sp.building ?? null)) patch.building = newBuilding;
      const newArea = area.trim() || null;
      if (newArea !== (sp.area ?? null)) patch.area = newArea;
      if (shoreType !== sp.shoreType) patch.shoreType = shoreType;
      if (measurementEighths !== sp.measurementEighths) patch.measurementEighths = measurementEighths;
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
      return;
    }

    // Create: qty > 1 fans out N linked points sharing a groupId — committed as
    // ONE atomic batch (#220 "N cards in a single commit").
    const n = qtyNum;
    const groupId = n > 1 ? newId() : undefined;
    const at = Date.now();
    const points: ShorePoint[] = Array.from({ length: n }, (_, i) => ({
      id: newId(),
      opId: operation.id,
      division: String(division),
      ...(building.trim() ? { building: building.trim() } : {}),
      ...(area.trim() ? { area: area.trim() } : {}),
      shoreType,
      ...(groupId ? { groupId, groupIndex: i + 1, groupTotal: n } : {}),
      measurementEighths,
      deductions,
      ...(label.trim() ? { label: label.trim() } : {}),
      status: 'pending',
    }));

    const result = await commitMany(
      points.map((sp) => ({
        type: 'ShorePointAdded',
        id: newId(),
        opId: operation.id,
        at,
        by: uid,
        shorePoint: sp,
      })),
    );
    if (result.ok) {
      commitHaptic();
      onAdded?.(points);
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Shore Point' : 'Add Shore Point'}
      variant="form"
      footer={
        <Button
          variant="primary"
          fullWidth
          disabled={!canSubmit}
          disabledReason={disabledReason ?? undefined}
          onPress={handleSubmit}
        >
          {editing ? 'Save' : 'Add Shore Point'}
        </Button>
      }
    >
      <div className="fs-ops-form">
        {buildingRequired && (
          <TextField
            label="Building"
            value={building}
            onChange={setBuilding}
            placeholder="e.g. North tower"
          />
        )}
        <DivisionPicker value={division} onChange={setDivision} />
        <TextField
          label="Area"
          value={area}
          onChange={setArea}
          placeholder='Optional — e.g. "Northwest corner"'
        />
        <InlineSegmented
          label="Shore type"
          options={SHORE_TYPE_OPTIONS}
          value={shoreType}
          onChange={selectShoreType}
        />
        {!editing && (
          <TextField
            label="Quantity"
            value={qty}
            onChange={setQty}
            inputMode="numeric"
            maxLength={3}
            helper={
              qtyValid && qtyNum > QTY_WARN_THRESHOLD
                ? `Creates ${qtyNum} linked shore points — double-check the count`
                : qtyValid && qtyNum > 1
                  ? `Creates ${qtyNum} linked shore points`
                  : undefined
            }
          />
        )}
        <MeasurementInput value={measurementEighths} onChange={setMeasurementEighths} />
        <DeductionPicker
          measurementEighths={measurementEighths}
          value={deductions}
          onChange={setDeductions}
        />
        <TextField
          label="Label"
          value={label}
          onChange={setLabel}
          placeholder="Optional — appears on the card"
        />
      </div>
    </Modal>
  );
}
