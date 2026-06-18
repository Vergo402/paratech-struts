import { useMemo, useState } from 'react';
import type { Apparatus, Deductions, DeployedComponent, InventoryItem, ShorePoint } from '@core/schema';
import { UNTRACKED_SOURCE } from '@core/schema';
import type { StrutCombination } from '@core/load';
import { assembleBom, componentLabel, findForShorePoint } from '@core/shorepoint';
import { Button, MeasurementValue } from '@ui/primitives';
import { BottomSheetPicker } from '@ui/picker';
import { useApparatus, useInventory, useInventoryActions } from '@ui/hooks';
import { pieceIdentity, sameExtensions } from './pieceIdentity';

/**
 * DeployResolution — the swaps-in-place "Review sources" step (#330 Phase 3b,
 * ADR-033). A complete BOM (strut + every piece on the strut's own rig) deploys
 * in one tap from the card; anything else (cross-truck OR a piece not on scene)
 * lands here so the operator confirms WHERE each piece comes from before commit.
 *
 * Built on the auto-sourced draft from assembleBom: every override (re-point a
 * piece to another truck, quick-add a missing one, deploy it off-book, or drop a
 * plate) mutates the local working BOM, which Confirm hands to the store's atomic
 * deploy. No silent untracked deploy: a missing piece BLOCKS Confirm until the
 * operator picks one of the three explicit ways out. Dropping a plate amends the
 * shore point's deductions (the record stays honest) and re-runs the real fit
 * (findForShorePoint) — only if the strut no longer reaches does it warn +
 * acknowledge; it never hard-blocks (field judgment, ADR-033 gate).
 */
export interface DeployResolutionProps {
  sp: ShorePoint;
  /** The recommendation being deployed — its strut is the BOM's locked first member. */
  combo: StrutCombination;
  /** Return to the recommendation list (the chosen combo is discarded). */
  onBack: () => void;
  /**
   * Commit the finalized BOM. `deductions` is the (possibly amended) deduction set
   * — when a plate was dropped it differs from sp.deductions and the caller
   * persists it first, so the deployed point never claims a plate it didn't use.
   * Resolves to the store result so failures show inline.
   */
  onConfirm: (bom: DeployedComponent[], deductions: Deductions) => Promise<{ ok: boolean; reason?: string }>;
  /** Sheet-level single-flight lock while a deploy is in flight. */
  submitting: boolean;
}

/** A working BOM member: a stable id (for React reconciliation across a drop),
 *  the committed component, and whether the operator has explicitly chosen to
 *  deploy it off-book (untracked = decided, not missing). */
interface WorkPiece {
  id: string;
  c: DeployedComponent;
  offBook: boolean;
}

/** Inventory rows that physically match this component (by catalog identity). */
function matchRows(c: DeployedComponent, inventory: InventoryItem[]): InventoryItem[] {
  if (c.role === 'extension') {
    return inventory.filter((i) => i.type === 'extension' && i.length === c.length && i.system === c.system);
  }
  return inventory.filter((i) => i.type === 'plate' && i.plateId === c.plateId);
}

interface SourceOption {
  apparatusId: string;
  apparatus: string;
  inventoryId: string;
  available: number;
}

/** The distinct trucks that stock this piece (available > 0), one entry per rig. */
function sourceOptions(c: DeployedComponent, inventory: InventoryItem[]): SourceOption[] {
  const byApp = new Map<string, SourceOption>();
  for (const r of matchRows(c, inventory)) {
    if (r.available <= 0) continue;
    const e = byApp.get(r.apparatusId);
    if (e) e.available += r.available;
    else byApp.set(r.apparatusId, { apparatusId: r.apparatusId, apparatus: r.apparatus, inventoryId: r.id, available: r.available });
  }
  return [...byApp.values()];
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="fs-stepper" role="group" aria-label="Quantity">
      <button type="button" className="fs-stepper-btn" aria-label="One fewer" disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))}>
        −
      </button>
      <span className="fs-stepper-val" aria-live="polite">{value}</span>
      <button type="button" className="fs-stepper-btn" aria-label="One more" onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

function MissingPieceChooser({
  c,
  roster,
  defaultApparatusId,
  busy,
  onQuickAdd,
  onOffBook,
  onDrop,
}: {
  c: DeployedComponent;
  roster: Apparatus[];
  defaultApparatusId: string;
  busy: boolean;
  onQuickAdd: (count: number, apparatusId: string, apparatusName: string) => void;
  onOffBook: () => void;
  onDrop: (() => void) | null;
}) {
  const [count, setCount] = useState(1);
  const [appId, setAppId] = useState(defaultApparatusId || roster[0]?.id || '');
  const app = roster.find((a) => a.id === appId);

  return (
    <div className="fs-chooser">
      <p className="fs-chooser-head">{pieceIdentity(c)} — not on scene</p>

      <div className="fs-chooser-opt">
        <span className="fs-chooser-opt-title">Add to inventory</span>
        <div className="fs-chooser-addrow">
          <Stepper value={count} onChange={setCount} />
          <BottomSheetPicker
            label="Truck"
            value={appId}
            options={roster.map((a) => ({ value: a.id, label: a.name }))}
            onSelect={setAppId}
          />
        </div>
        <Button variant="secondary" fullWidth disabled={!app || busy} onPress={() => app && onQuickAdd(count, app.id, app.name)}>
          {app ? `Add ${count} to ${app.name}` : 'Add a truck first'}
        </Button>
      </div>

      <Button variant="secondary" fullWidth disabled={busy} onPress={onOffBook}>
        Deploy off-book (untracked)
      </Button>

      {onDrop && (
        <Button variant="secondary" fullWidth disabled={busy} onPress={onDrop}>
          Drop this plate (set to none)
        </Button>
      )}
    </div>
  );
}

export function DeployResolution({ sp, combo, onBack, onConfirm, submitting }: DeployResolutionProps) {
  const inventory = useInventory();
  const { addOne } = useInventoryActions();
  const { roster } = useApparatus();

  const strutItem = combo.strut.inventoryId ? inventory.find((i) => i.id === combo.strut.inventoryId) : undefined;
  const strutApparatus = strutItem?.apparatus ?? combo.strut.model;
  const strutApparatusId = strutItem?.apparatusId ?? '';

  const [pieces, setPieces] = useState<WorkPiece[]>(() =>
    assembleBom(combo, sp.deductions, { apparatus: strutApparatus, inventoryId: combo.strut.inventoryId ?? '' }, inventory).map(
      (c, i) => ({ id: `${c.role}-${c.plateId ?? c.length ?? 'strut'}-${i}`, c, offBook: false }),
    ),
  );
  // The (possibly amended) deductions — a dropped plate flips its slot to 'none'.
  // Persisted with the deploy so the point never records a plate it didn't use.
  const [deductions, setDeductions] = useState<Deductions>(sp.deductions);
  const [ack, setAck] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ⅛-floor fit re-run with the amended deductions (a dropped plate shrinks the
  // deduction, so the strut must span MORE). The chosen strut either still appears
  // in the results or it doesn't — a confirmed determination, not a guess.
  const stillReaches = useMemo(() => {
    if (deductions === sp.deductions) return true;
    const combos = findForShorePoint({ ...sp, deductions }, inventory);
    return combos.some((x) => x.strut.model === combo.strut.model && sameExtensions(x.extensions, combo.extensions));
  }, [deductions, inventory, sp, combo]);

  const needsAck = !stillReaches;
  const unresolved = pieces.some((w) => !w.c.inventoryId && !w.offBook);

  // ≥2 distinct rigs (by apparatus id, not display name) supplying TRACKED pieces.
  const rigIds = new Set(
    pieces
      .filter((w) => w.c.inventoryId)
      .map((w) => inventory.find((i) => i.id === w.c.inventoryId)?.apparatusId)
      .filter((id): id is string => !!id),
  );
  const crossTruck = rigIds.size >= 2;

  // Over-claim guard: the operator can re-point two pieces at the same row; the
  // store would abort all-or-nothing with an internal message, so catch it here
  // with a plain one and block Confirm before the failed round-trip.
  const claimCounts: Record<string, number> = {};
  for (const w of pieces) if (w.c.inventoryId) claimCounts[w.c.inventoryId] = (claimCounts[w.c.inventoryId] ?? 0) + 1;
  const overClaim = pieces.find((w) => {
    if (!w.c.inventoryId) return false;
    const avail = inventory.find((i) => i.id === w.c.inventoryId)?.available ?? 0;
    return (claimCounts[w.c.inventoryId] ?? 0) > avail;
  });
  const overClaimMsg = overClaim
    ? `Not enough ${pieceIdentity(overClaim.c)} on ${overClaim.c.source} — re-point one piece to another truck.`
    : null;

  const confirmDisabled = submitting || adding !== null || unresolved || !!overClaim || (needsAck && !ack);

  // Whole-group up-front advisory (never blocks): does the scene carry enough of
  // this strut model for every member of a grouped physical shore?
  const groupTotal = sp.groupTotal ?? 1;
  const strutAvailable = inventory
    .filter((i) => i.type === 'strut' && i.model === combo.strut.model)
    .reduce((n, i) => n + i.available, 0);
  const groupShort = groupTotal > 1 && strutAvailable < groupTotal;

  function setSource(id: string, apparatus: string, inventoryId: string) {
    setPieces((ps) => ps.map((w) => (w.id === id ? { ...w, c: { ...w.c, source: apparatus, inventoryId }, offBook: false } : w)));
  }

  function setOffBook(id: string) {
    setPieces((ps) =>
      ps.map((w) => {
        if (w.id !== id) return w;
        const c = { ...w.c, source: UNTRACKED_SOURCE };
        delete c.inventoryId;
        return { ...w, c, offBook: true };
      }),
    );
  }

  function undoOffBook(id: string) {
    setPieces((ps) => ps.map((w) => (w.id === id ? { ...w, offBook: false } : w)));
  }

  function dropPlate(id: string, role: DeployedComponent['role']) {
    if (role !== 'top-plate' && role !== 'bottom-plate') return;
    setPieces((ps) => ps.filter((w) => w.id !== id));
    setDeductions((d) => ({ ...d, [role === 'top-plate' ? 'topPlate' : 'bottomPlate']: 'none' }));
  }

  async function quickAdd(id: string, c: DeployedComponent, count: number, apparatusId: string, apparatusName: string) {
    if (adding !== null) return; // single-flight — a gloved double-tap must not add 2×
    setAdding(id);
    const spec =
      c.role === 'extension'
        ? ({ type: 'extension', length: c.length!, system: c.system!, apparatus: apparatusName, apparatusId } as const)
        : ({ type: 'plate', plateId: c.plateId!, apparatus: apparatusName, apparatusId } as const);
    let rowId = '';
    try {
      for (let k = 0; k < count; k++) rowId = await addOne(spec);
    } catch {
      // A mid-loop write failure is rare; re-point to whatever did land (so the
      // already-added units aren't orphaned) and surface a plain error.
      setError('Could not add all units to inventory — re-check the count.');
    }
    if (rowId) setSource(id, apparatusName, rowId);
    setAdding(null);
  }

  async function handleConfirm() {
    setError(null);
    const bom = pieces.map((w) => w.c);
    const result = await onConfirm(bom, deductions);
    if (!result.ok) setError(result.reason ?? 'Deploy failed');
  }

  return (
    <div className="fs-resolve">
      <button type="button" className="fs-resolve-back" onClick={onBack}>
        <span aria-hidden="true">←</span> Back to struts
      </button>

      {crossTruck && (
        <p className="fs-resolve-banner fs-resolve-banner--cross">
          Pieces come from {rigIds.size} trucks — confirm each source before deploying.
        </p>
      )}
      {groupShort && (
        <p className="fs-resolve-banner fs-resolve-banner--advisory">
          This shore needs {groupTotal} {combo.strut.model} struts — {strutAvailable} on scene.
        </p>
      )}

      <ul className="fs-resolve-list">
        {pieces.map((w) => {
          const tracked = !!w.c.inventoryId;
          const row = tracked ? inventory.find((i) => i.id === w.c.inventoryId) : undefined;
          const opts = w.c.role === 'strut' ? [] : sourceOptions(w.c, inventory);
          const ambiguous = tracked && opts.length >= 2;
          const currentAppId = row?.apparatusId ?? '';

          return (
            <li key={w.id} className="fs-resolve-piece">
              <div className="fs-resolve-piece-head">
                <span className="fs-resolve-piece-kind">{componentLabel(w.c)}</span>
                <span className="fs-resolve-piece-id">{pieceIdentity(w.c)}</span>
              </div>

              {tracked && !ambiguous && (
                <p className="fs-resolve-piece-src">
                  {w.c.source}
                  {row ? ` · ${row.available} available` : ''}
                </p>
              )}

              {ambiguous && (
                <BottomSheetPicker
                  label="Source truck"
                  value={currentAppId}
                  options={opts.map((o) => ({ value: o.apparatusId, label: o.apparatus, sub: `${o.available} available` }))}
                  onSelect={(appId) => {
                    const o = opts.find((x) => x.apparatusId === appId);
                    if (o) setSource(w.id, o.apparatus, o.inventoryId);
                  }}
                />
              )}

              {!tracked && w.offBook && (
                <p className="fs-resolve-piece-offbook">
                  Off-book — won&rsquo;t draw from stock.{' '}
                  <button type="button" className="fs-resolve-undo" onClick={() => undoOffBook(w.id)}>
                    Undo
                  </button>
                </p>
              )}

              {!tracked && !w.offBook && (
                <MissingPieceChooser
                  c={w.c}
                  roster={roster}
                  defaultApparatusId={strutApparatusId}
                  busy={adding === w.id}
                  onQuickAdd={(count, appId, name) => void quickAdd(w.id, w.c, count, appId, name)}
                  onOffBook={() => setOffBook(w.id)}
                  onDrop={w.c.role === 'top-plate' || w.c.role === 'bottom-plate' ? () => dropPlate(w.id, w.c.role) : null}
                />
              )}
            </li>
          );
        })}
      </ul>

      {needsAck && (
        <div className="fs-gate fs-gate--unrated" role="alert">
          <p className="fs-gate-caveat">
            Without this plate, {combo.strut.model} no longer reaches <MeasurementValue eighths={sp.measurementEighths} /> at
            this load.
          </p>
          <button
            type="button"
            className="fs-gate-ack"
            role="checkbox"
            aria-checked={ack}
            onClick={() => setAck((a) => !a)}
          >
            <span className="fs-gate-ack-box" aria-hidden="true">
              {ack ? '✓' : ''}
            </span>
            I&rsquo;ve accounted for this
          </button>
        </div>
      )}

      {overClaimMsg && (
        <p role="alert" className="fs-assign-error">
          {overClaimMsg}
        </p>
      )}
      {error && (
        <p role="alert" className="fs-assign-error">
          {error}
        </p>
      )}

      <Button variant="primary" fullWidth disabled={confirmDisabled} onPress={handleConfirm}>
        Confirm &amp; deploy
      </Button>
    </div>
  );
}
