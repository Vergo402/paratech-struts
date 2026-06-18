import { useEffect, useRef, useState } from 'react';
import type { Deductions, DeployedComponent, ShorePoint } from '@core/schema';
import type { StrutCombination } from '@core/load';
import { newId } from '@core/id';
import { divisionLabel } from '@core/operation';
import { bomSourceStatus, pendingReasonFor } from '@core/shorepoint';
import { EmptyState, MeasurementValue, Sheet } from '@ui/primitives';
import { commitHaptic } from '@ui/primitives/haptics';
import { useCommit, useDeviceUid, useInventory, useRecommendations } from '@ui/hooks';
import { RecommendationCard, comboModel } from './RecommendationCard';
import { DeployResolution } from './DeployResolution';
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
  // The combo being resolved in the swaps-in-place "Review sources" step (#330
  // Phase 3b) — null = showing the recommendation list. Set when a deploy isn't a
  // clean one-rig assembly (cross-truck or a piece not on scene).
  const [resolving, setResolving] = useState<StrutCombination | null>(null);

  // Stale-state reset when the sheet retargets/reopens.
  useEffect(() => {
    setError(null);
    setDeploying(false);
    setResolving(null);
    inFlight.current = false;
  }, [sp?.id]);

  // The atomic deploy — single-flight, EquipmentDeployed, report back. Shared by
  // the one-tap complete path and the resolution panel's Confirm. When the operator
  // dropped a plate in the panel, `deductions` differs from the point's and is
  // persisted FIRST (while still Pending), so the deployed point never records a
  // plate it didn't use. Returns the store result so the panel shows failures inline.
  async function commitBom(
    deployedBom: DeployedComponent[],
    model: string,
    deductions?: Deductions,
  ): Promise<{ ok: boolean; reason?: string }> {
    if (!sp || inFlight.current) return { ok: false, reason: 'A deploy is already in flight.' };
    inFlight.current = true;
    setDeploying(true);
    setError(null);
    const uid = await getUid();
    if (deductions && deductions !== sp.deductions) {
      const edit = await commit({
        type: 'ShorePointEdited',
        id: newId(),
        opId: sp.opId,
        at: Date.now(),
        by: uid,
        spId: sp.id,
        patch: { deductions },
      });
      if (!edit.ok) {
        setError(edit.reason);
        inFlight.current = false;
        setDeploying(false);
        return edit;
      }
    }
    const result = await commit({
      type: 'EquipmentDeployed',
      id: newId(),
      opId: sp.opId,
      at: Date.now(),
      by: uid,
      spId: sp.id,
      deployedBom,
    });
    if (result.ok) {
      commitHaptic();
      onDeployed(sp, model);
      return { ok: true };
    }
    setError(result.reason);
    inFlight.current = false;
    setDeploying(false);
    return { ok: false, reason: result.reason };
  }

  function handleDeploy(combo: StrutCombination) {
    if (!sp || inFlight.current) return;
    const inventoryId = combo.strut.inventoryId;
    const item = inventoryId ? inventory.find((i) => i.id === inventoryId) : undefined;
    if (!inventoryId || !item) {
      setError('That strut is no longer in inventory — pull down to re-check stock.');
      return;
    }
    // ADR-033 — a deployed shore is a sourced bill of materials. A clean assembly
    // (strut + every piece on its own rig) deploys in one tap; anything else opens
    // the Review sources step so the operator confirms each source / resolves a
    // missing piece before commit.
    const status = bomSourceStatus(combo, sp.deductions, { apparatus: item.apparatus, inventoryId }, inventory);
    if (status.status === 'complete') {
      void commitBom(status.bom, comboModel(combo));
    } else {
      setError(null);
      setResolving(combo);
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
    <Sheet open={!!sp} onClose={onClose} title={resolving ? 'Review sources' : 'Assign Equipment'}>
      {context}
      {error && (
        <p role="alert" className="fs-assign-error">
          {error}
        </p>
      )}
      {sp && resolving && (
        <DeployResolution
          sp={sp}
          combo={resolving}
          submitting={deploying}
          onBack={() => setResolving(null)}
          onConfirm={(bom, deductions) => commitBom(bom, comboModel(resolving), deductions)}
        />
      )}
      {sp && !resolving && recommendations.length > 0 && (
        <div className="fs-assign-list">
          {recommendations.map((combo) => {
            const strutItem = combo.strut.inventoryId
              ? inventory.find((i) => i.id === combo.strut.inventoryId)
              : undefined;
            const stock =
              strutItem && combo.strut.inventoryId
                ? bomSourceStatus(
                    combo,
                    sp.deductions,
                    { apparatus: strutItem.apparatus, inventoryId: combo.strut.inventoryId },
                    inventory,
                  )
                : undefined;
            return (
              <RecommendationCard
                key={`${combo.strut.inventoryId ?? combo.strut.id}|${combo.extensions.join('+')}`}
                combo={combo}
                deductions={sp.deductions}
                source={strutItem?.apparatus}
                location={spLocation}
                stock={stock}
                onDeploy={handleDeploy}
                deployDisabled={deploying}
              />
            );
          })}
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
