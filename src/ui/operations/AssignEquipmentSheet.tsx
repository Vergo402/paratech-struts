import { useEffect, useMemo, useRef, useState } from 'react';
import type { Deductions, DeployedComponent, ShorePoint, ShoreTypeId } from '@core/schema';
import { UNTRACKED_SOURCE } from '@core/schema';
import type { StrutCombination } from '@core/load';
import { newId } from '@core/id';
import { restructureBatch } from './restructure';
import { divisionLabel } from '@core/operation';
import { bomSourceStatus, findForShorePoint, pendingReasonFor, strutLoadShare } from '@core/shorepoint';
import { EmptyState, MeasurementValue, Modal } from '@ui/primitives';
import { commitHaptic } from '@ui/primitives/haptics';
import { useCommit, useCommitMany, useDeviceUid, useInventory, useRecommendations, useShorePoints } from '@ui/hooks';
import { RecommendationCard, comboModel } from './RecommendationCard';
import { DeployResolution } from './DeployResolution';
import { SHORE_TYPE_LABELS } from './ShorePointCard';
import { NO_MATCH_EMPTY, OVER_CAPACITY_EMPTY } from './cardParts';

/**
 * Assign Equipment — the Pending card's primary action (#221 step 2). A
 * center-anchored MODAL popup (Alex's call — the bottom sheet read poorly on
 * the wider command-post surface). `variant="form"` pins the header, scrolls
 * the body, and won't discard the in-progress Review-sources state on a stray
 * outside tap (X / Esc are the way out). Deploy commits
 * EquipmentDeployed — the full bill of materials (ADR-033) — through the store's
 * inventory transaction (pre-flight + per-component decrement-abort-on-zero, S2);
 * on success the sheet dismisses and the board announces the Equipment Assigned move.
 * Dismissing without deploying changes nothing. Warning-gated cards never dismiss
 * the sheet (#247 state 5).
 */
export interface AssignEquipmentSheetProps {
  /** The Pending point to equip; null renders closed. The board derives this LIVE by id. */
  shorePoint: ShorePoint | null;
  onClose: () => void;
  /** Fires after a successful deploy — the board closes the sheet, expands Equipment Assigned, announces. */
  onDeployed: (sp: ShorePoint, model: string) => void;
  /**
   * Fires after the Add-N-struts rebuild, whose per-member deploys can run out of
   * stock partway (or entirely). REQUIRED, not optional — an unwired optional prop
   * would silently restore the "announced as a full success" bug (#451). The board
   * routes it to the same partial-honesty handler the inline Add Shore Point deploy
   * uses (audit W1): deployed-vs-pending counts, and an assertive out-of-stock
   * announcement when nothing deployed at all.
   */
  onPartialDeployed: (deployed: ShorePoint[], pending: ShorePoint[], model: string) => void;
}

export function AssignEquipmentSheet({ shorePoint: sp, onClose, onDeployed, onPartialDeployed }: AssignEquipmentSheetProps) {
  const recommendations = useRecommendations(sp);
  const inventory = useInventory();
  const commit = useCommit();
  const commitMany = useCommitMany();
  const getUid = useDeviceUid();
  const shorePoints = useShorePoints();

  // The physical shore's live members (the point itself when ungrouped). The
  // Add-N-struts fix rebuilds the WHOLE shore, so it's offered only while every
  // member is still Pending — never tear down a deployed mate (the edit-path rule).
  const members = useMemo(
    () => (sp ? (sp.groupId ? shorePoints.filter((p) => p.groupId === sp.groupId && p.deletedAt == null) : [sp]) : []),
    [sp, shorePoints],
  );
  const allPending = members.length > 0 && members.every((m) => m.status === 'pending');

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
  // plate it didn't use — AND so the store's own deployVerdict judges the assembly
  // against the amended geometry rather than the more forgiving pre-drop one.
  //
  // #450 — the amended deductions must not survive a deploy that never landed.
  // The patch can't ride WITH the deploy (the store refuses to batch
  // inventory-consequential events) and can't follow it (that would leave the
  // store's guard judging stale geometry), so a failed deploy is compensated: a
  // second ShorePointEdited restores the original deductions. Append-only history
  // keeps both events; the projection ends where it started, so "Back" and a failed
  // Confirm both leave the record untouched.
  // Returns the store result so the panel shows failures inline.
  async function commitBom(
    deployedBom: DeployedComponent[],
    model: string,
    // True when the chosen combo is in the LongShore unrated zone — by the time
    // Deploy fires, RecommendationCard's gate has the operator's acknowledgment
    // (the button is disabled until then), so reaching here IS the ack. Persisted
    // on the event so the store's deploy guard can re-verify it off-UI (#76).
    unratedAck: boolean,
    // True when this deploy leaves the shore short of the struts its load needs
    // (per-strut over-capacity) — the card's short-deploy gate held Deploy until
    // the team acknowledged, so reaching here IS that ack too.
    overCapacityAck: boolean,
    deductions?: Deductions,
  ): Promise<{ ok: boolean; reason?: string }> {
    if (!sp || inFlight.current) return { ok: false, reason: 'A deploy is already in flight.' };
    inFlight.current = true;
    setDeploying(true);
    setError(null);
    const uid = await getUid();
    const amended = !!deductions && deductions !== sp.deductions;
    const priorDeductions = sp.deductions;
    if (amended) {
      const edit = await commit({
        type: 'ShorePointEdited',
        id: newId(),
        opId: sp.opId,
        at: Date.now(),
        by: uid,
        spId: sp.id,
        patch: { deductions: deductions! },
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
      ...(unratedAck ? { unratedAcknowledged: true } : {}),
      ...(overCapacityAck ? { overCapacityAcknowledged: true } : {}),
    });
    if (result.ok) {
      commitHaptic();
      onDeployed(sp, model);
      return { ok: true };
    }
    // Nothing deployed — roll the amended deductions back off the live record.
    let reason = result.reason;
    if (amended) {
      const undo = await commit({
        type: 'ShorePointEdited',
        id: newId(),
        opId: sp.opId,
        at: Date.now(),
        by: uid,
        spId: sp.id,
        patch: { deductions: priorDeductions },
      });
      // A failed rollback is the same bug wearing a hat — say so plainly rather
      // than leaving an amended record behind a generic deploy error.
      if (!undo.ok) {
        reason = `${result.reason} — and the amended deductions could not be rolled back. Re-check the base plates on this shore point.`;
      }
    }
    setError(reason);
    inFlight.current = false;
    setDeploying(false);
    return { ok: false, reason };
  }

  // This deploy leaves the shore short of the struts its load needs (per-strut
  // over-capacity). The card gated Deploy behind the team acknowledgment, so a
  // deploy that fires with this true carries the recorded ack on its event.
  function isShortDeploy(combo: StrutCombination): boolean {
    return !!sp && !combo.unrated && !combo.exceedsCapacity && combo.capacity > 0 && strutLoadShare(sp) > combo.capacity;
  }

  function handleDeploy(combo: StrutCombination) {
    if (!sp || inFlight.current) return;
    const inventoryId = combo.strut.inventoryId;
    // A not-in-stock (catalog) strut has no inventoryId — route straight to Review
    // sources, where the strut resolves like a missing plate: add it to a truck, or
    // deploy it off-book. Never the "no longer in inventory" error (it never was).
    if (!inventoryId) {
      setError(null);
      setResolving(combo);
      return;
    }
    const item = inventory.find((i) => i.id === inventoryId);
    if (!item) {
      setError('That strut is no longer in inventory — pull down to re-check stock.');
      return;
    }
    // ADR-033 — a deployed shore is a sourced bill of materials. A clean assembly
    // (strut + every piece on its own rig) deploys in one tap; anything else opens
    // the Review sources step so the operator confirms each source / resolves a
    // missing piece before commit.
    const status = bomSourceStatus(combo, sp.deductions, { apparatus: item.apparatus, inventoryId }, inventory);
    if (status.status === 'complete') {
      void commitBom(status.bom, comboModel(combo), !!combo.unrated, isShortDeploy(combo));
    } else {
      setError(null);
      setResolving(combo);
    }
  }

  // The Add-N-struts one-tap fix (accepted mockup 2026-07-01): rebuild the physical
  // shore at the strut count its load needs (the edit path's hard-remove + re-add
  // pattern, KEEPING the shore's number), then deploy the chosen combo to every
  // member. An exhausted-stock / unclean-source member stays Pending — honest
  // partial, never a silent success (the modal batch's W1 rule).
  async function handleAddStruts(combo: StrutCombination, targetType: ShoreTypeId, targetTotal: number) {
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
    const uid = await getUid();
    const at = Date.now();
    const gid = newId();
    const rebuilt: ShorePoint[] = Array.from({ length: targetTotal }, (_, i) => ({
      id: newId(),
      opId: sp.opId,
      ...(sp.seq != null ? { seq: sp.seq } : {}),
      division: sp.division,
      ...(sp.building ? { building: sp.building } : {}),
      ...(sp.area ? { area: sp.area } : {}),
      ...(sp.side ? { side: sp.side } : {}),
      shoreType: targetType,
      groupId: gid,
      groupIndex: i + 1,
      groupTotal: targetTotal,
      measurementEighths: sp.measurementEighths,
      deductions: sp.deductions,
      ...(sp.label ? { label: sp.label } : {}),
      ...(sp.assignedResource ? { assignedResource: sp.assignedResource } : {}),
      ...(sp.estimatedLoad != null ? { estimatedLoad: sp.estimatedLoad } : {}),
      status: 'pending',
    }));
    const restructure = await commitMany(restructureBatch(members, rebuilt, sp.opId, uid, at));
    if (!restructure.ok) {
      setError(restructure.reason);
      inFlight.current = false;
      setDeploying(false);
      return;
    }
    // #452 — every member re-resolves its OWN source row. The old loop pinned the
    // first member's row for the whole set, so member 2 aborted "stock exhausted"
    // while identical struts sat on another rig. This closure's `inventory` is a
    // snapshot that can't refresh mid-loop, so sourcing draws from a working copy
    // decremented after each member — member 2 then finds the next rig's row on its
    // own. Per-rig sourcing (ADR-033) is intact: each member gets a NEW complete
    // source row; a single member is never split across rows.
    const working = inventory.map((i) => ({ ...i }));
    const consume = (bom: DeployedComponent[]) => {
      for (const c of bom) {
        if (c.inventoryId === undefined) continue; // untracked — no stock consequence
        const row = working.find((i) => i.id === c.inventoryId);
        if (row) row.available -= 1;
      }
    };

    const deployed: ShorePoint[] = [];
    const pending: ShorePoint[] = [];
    let exhausted = false;
    for (const p of rebuilt) {
      if (exhausted) {
        pending.push(p);
        continue;
      }
      // Prefer the row the operator's card pointed at; fall back to any rig still
      // stocking the same model.
      const strutRow =
        working.find((i) => i.id === inventoryId && i.available > 0) ??
        working.find((i) => i.type === 'strut' && i.model === combo.strut.model && i.available > 0);
      // Each member sources its own full BOM (ADR-033). Post-conversion every
      // member's load share is within rating, so no acknowledgment rides these.
      const status = strutRow
        ? bomSourceStatus(combo, p.deductions, { apparatus: strutRow.apparatus, inventoryId: strutRow.id }, working)
        : undefined;
      if (!status || status.status !== 'complete') {
        pending.push(p); // no stock, or an unclean source → stays Pending for the per-point flow
        continue;
      }
      const result = await commit({
        type: 'EquipmentDeployed',
        id: newId(),
        opId: sp.opId,
        at: Date.now(),
        by: uid,
        spId: p.id,
        deployedBom: status.bom,
      });
      if (result.ok) {
        deployed.push(p);
        consume(status.bom);
      } else {
        // The store refused a source this pass judged complete — stock moved under
        // us. Stop rather than hammer; every remaining member stays Pending and the
        // announcement reports the shortfall honestly.
        pending.push(p);
        exhausted = true;
      }
    }
    const model = comboModel(combo);
    if (deployed.length > 0) commitHaptic();
    // #451 — always the honest report: deployed-vs-pending counts on a partial, and
    // an assertive out-of-stock announcement when nothing deployed (the members sit
    // in Pending; the sheet closes so the board shows them, not a stale target).
    onPartialDeployed(deployed, pending, deployed.length > 1 ? `${deployed.length}× ${model}` : model);
    onClose();
  }

  const reason = sp && recommendations.length === 0 ? pendingReasonFor(sp, inventory) : undefined;

  // No stock fits, but the catalog does: offer the fitting struts to deploy NOT from
  // stock (decision: only when no in-stock option). Each routes to Review sources to
  // resolve the strut (add to a truck ∥ off-book). Capacity sentinels stay excluded.
  const offBookCombos = useMemo(
    () => (sp && reason === 'no-inventory' ? findForShorePoint(sp, null).filter((c) => !c.exceedsCapacity) : []),
    [sp, reason],
  );

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
    <Modal open={!!sp} onClose={onClose} title={resolving ? 'Review sources' : 'Assign Equipment'} variant="form">
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
          // The panel's verdicts are computed against the AMENDED deductions, so its
          // unrated flag — not the pre-drop combo's — is what rides the event (#448).
          onConfirm={(bom, deductions, overCapacityAck, unratedAck) =>
            commitBom(bom, comboModel(resolving), unratedAck || !!resolving.unrated, overCapacityAck, deductions)
          }
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
                estimatedLoad={sp.estimatedLoad}
                currentStruts={sp.groupTotal ?? 1}
                onAddStruts={allPending ? handleAddStruts : undefined}
              />
            );
          })}
        </div>
      )}
      {sp && recommendations.length === 0 && reason === 'no-match' && (
        <EmptyState
          variant="filtered"
          headline={NO_MATCH_EMPTY.headline}
          reason={NO_MATCH_EMPTY.reason}
        />
      )}
      {sp && !resolving && recommendations.length === 0 && reason === 'no-inventory' && (
        <>
          <p className="fs-assign-notice" role="status">
            No fitting strut is on scene. Deploy one off-book, or add it to a truck.
          </p>
          <div className="fs-assign-list">
            {offBookCombos.map((combo) => (
              <RecommendationCard
                key={`${combo.strut.id}|${combo.extensions.join('+')}`}
                combo={combo}
                deductions={sp.deductions}
                location={spLocation}
                stock={bomSourceStatus(combo, sp.deductions, { apparatus: UNTRACKED_SOURCE }, inventory)}
                onDeploy={handleDeploy}
                deployDisabled={deploying}
                estimatedLoad={sp.estimatedLoad}
                currentStruts={sp.groupTotal ?? 1}
              />
            ))}
          </div>
        </>
      )}
      {sp && recommendations.length === 0 && reason === 'over-capacity' && (
        <EmptyState
          variant="upstream-blocked"
          headline={OVER_CAPACITY_EMPTY.headline}
          reason={OVER_CAPACITY_EMPTY.reason}
        />
      )}
    </Modal>
  );
}
