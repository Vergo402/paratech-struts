import { useEffect, useRef, useState } from 'react';
import type { ShorePoint } from '@core/schema';
import type { StrutCombination } from '@core/load';
import { newId } from '@core/id';
import { divisionLabel } from '@core/operation';
import { assembleBom, pendingReasonFor } from '@core/shorepoint';
import { EmptyState, MeasurementValue, Sheet } from '@ui/primitives';
import { commitHaptic } from '@ui/primitives/haptics';
import { useCommit, useDeviceUid, useInventory, useRecommendations } from '@ui/hooks';
import { RecommendationCard, comboModel } from './RecommendationCard';
import { SHORE_TYPE_LABELS } from './ShorePointCard';

/**
 * Assign Equipment — the Pending card's primary action (#221 step 2). A
 * picker SHEET, not a modal (ADR-016): the board stays visible above while
 * the officer reads RecommendationCards and taps Deploy. Deploy commits
 * EquipmentDeployed — the full bill of materials (ADR-033) — through the store's
 * inventory transaction (pre-flight + per-component decrement-abort-on-zero, S2);
 * on success the sheet dismisses and the board announces the In Process move.
 * Dismissing without deploying changes nothing. Warning-gated cards never dismiss
 * the sheet (#247 state 5).
 */
export interface AssignEquipmentSheetProps {
  /** The Pending point to equip; null renders closed. The board derives this LIVE by id. */
  shorePoint: ShorePoint | null;
  onClose: () => void;
  /** Fires after a successful deploy — the board closes the sheet, expands In Process, announces. */
  onDeployed: (sp: ShorePoint, model: string) => void;
}

export function AssignEquipmentSheet({ shorePoint: sp, onClose, onDeployed }: AssignEquipmentSheetProps) {
  const recommendations = useRecommendations(sp);
  const inventory = useInventory();
  const commit = useCommit();
  const getUid = useDeviceUid();

  // Single-flight lock — two in-flight deploys for the same SP would BOTH pass
  // the store pre-flight and both decrement stock. The ref is the guard; the
  // state disables every card's Deploy for the visible half of the same rule.
  const inFlight = useRef(false);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stale-state reset when the sheet retargets/reopens.
  useEffect(() => {
    setError(null);
    setDeploying(false);
    inFlight.current = false;
  }, [sp?.id]);

  async function handleDeploy(combo: StrutCombination) {
    if (!sp || inFlight.current) return;
    const inventoryId = combo.strut.inventoryId;
    const item = inventoryId ? inventory.find((i) => i.id === inventoryId) : undefined;
    if (!inventoryId || !item) {
      setError('That strut is no longer in inventory — pull down to re-check stock.');
      return;
    }
    inFlight.current = true;
    setDeploying(true);
    setError(null);
    const model = comboModel(combo);
    // ADR-033 — deploy the full bill of materials (strut + plates + extensions),
    // each auto-sourced from its rig; the store decrements every tracked component
    // atomically. Phase 3 layers the multi-rig confirm + missing-piece chooser on
    // top of this assembly.
    const deployedBom = assembleBom(combo, sp.deductions, { apparatus: item.apparatus, inventoryId }, inventory);
    const result = await commit({
      type: 'EquipmentDeployed',
      id: newId(),
      opId: sp.opId,
      at: Date.now(),
      by: await getUid(),
      spId: sp.id,
      deployedBom,
    });
    if (result.ok) {
      commitHaptic();
      onDeployed(sp, model);
    } else {
      setError(result.reason);
      inFlight.current = false;
      setDeploying(false);
    }
  }

  const reason = sp && recommendations.length === 0 ? pendingReasonFor(sp, inventory) : undefined;

  // The shore point's identity line (division · building · area) — reused for
  // the sheet header AND passed to each RecommendationCard's `location` (S12 §3.1).
  const spLocation = sp ? [divisionLabel(sp.division), sp.building, sp.area].filter(Boolean).join(' · ') : undefined;

  const context = sp ? (
    <p className="fs-assign-context">
      {spLocation}
      {' · '}
      {SHORE_TYPE_LABELS[sp.shoreType]}
      {' · '}
      <MeasurementValue eighths={sp.measurementEighths} />
    </p>
  ) : null;

  return (
    <Sheet open={!!sp} onClose={onClose} title="Assign Equipment">
      {context}
      {error && (
        <p role="alert" className="fs-assign-error">
          {error}
        </p>
      )}
      {sp && recommendations.length > 0 && (
        <div className="fs-assign-list">
          {recommendations.map((combo) => (
            <RecommendationCard
              key={`${combo.strut.inventoryId ?? combo.strut.id}|${combo.extensions.join('+')}`}
              combo={combo}
              deductions={sp.deductions}
              source={
                combo.strut.inventoryId
                  ? inventory.find((i) => i.id === combo.strut.inventoryId)?.apparatus
                  : undefined
              }
              location={spLocation}
              onDeploy={handleDeploy}
              deployDisabled={deploying}
            />
          ))}
        </div>
      )}
      {sp && recommendations.length === 0 && reason === 'no-match' && (
        <EmptyState
          variant="filtered"
          headline="No matching struts"
          reason="Nothing fits this opening at this load — adjust deductions or re-measure"
        />
      )}
      {sp && recommendations.length === 0 && reason === 'no-inventory' && (
        <EmptyState
          variant="upstream-blocked"
          headline="No apparatus stock available"
          reason="A strut that fits exists, but none is available on scene"
        />
      )}
      {sp && recommendations.length === 0 && reason === 'over-capacity' && (
        <EmptyState
          variant="upstream-blocked"
          headline="Over capacity"
          reason="A strut fits, but the estimated load exceeds the 4-strut limit — escalate to engineering"
        />
      )}
    </Sheet>
  );
}
