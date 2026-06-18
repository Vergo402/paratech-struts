import type { StrutCombination } from '../load';
import type { Deductions, DeployedComponent, InventoryItem, ShorePoint } from '../schema';
import { UNTRACKED_SOURCE } from '../schema';

// ADR-033 — small read helpers over a deployed shore's bill of materials. Pure;
// the reducer normalizes legacy StrutDeployed into a one-element deployedBom, so
// every deployed point reads through these uniformly (old logs included).

/** The strut member of the BOM (always present once a shore is deployed). */
export function deployedStrutOf(sp: ShorePoint): DeployedComponent | undefined {
  return sp.deployedBom?.find((c) => c.role === 'strut');
}

/** The cradle-to-grave strut identity string from a deployed BOM — "LS 203" or
 *  "LS 203 + 12″ + 6″" (strut model + each extension length). Mirrors the
 *  RecommendationCard's comboModel so a deployed card reads the SAME identity the
 *  operator deployed — now that extensions are their own BOM components, the strut
 *  member's `model` is the bare model and this reconstructs the combined label. */
export function bomModelLabel(sp: ShorePoint): string | undefined {
  const strut = deployedStrutOf(sp);
  if (!strut?.model) return strut?.model;
  const exts = (sp.deployedBom ?? []).filter((c) => c.role === 'extension' && c.length != null);
  if (exts.length === 0) return strut.model;
  return `${strut.model} + ${exts.map((e) => `${e.length}″`).join(' + ')}`;
}

/** A component carries NO stock consequence ⟺ it has no inventoryId — the
 *  untracked invariant (no decrement on deploy, no restore on return). */
export function isUntracked(c: DeployedComponent): boolean {
  return c.inventoryId === undefined;
}

/** True if any deployed component is off-book (untracked) — drives the subtle
 *  "revisit this piece" marker on the card (decisions 3 + 7). */
export function hasUntracked(sp: ShorePoint): boolean {
  return sp.deployedBom?.some(isUntracked) ?? false;
}

/** The distinct apparatus the BOM's TRACKED components were pulled from — for the
 *  board's per-rig "deployed stock is short" roll-up and the source summary. */
export function deployedRigs(sp: ShorePoint): string[] {
  const rigs = new Set<string>();
  for (const c of sp.deployedBom ?? []) if (c.inventoryId !== undefined) rigs.add(c.source);
  return [...rigs];
}

/**
 * Assemble a deployed bill of materials from a chosen recommendation (ADR-033).
 * Strut from the chosen rig; extensions from the rows the engine already resolved
 * (combo.extensionSources, availability-gated, W8 pooling preserved); plates from
 * the shore's deductions, auto-sourced preferring the strut's rig (carried-forward
 * decision 3), falling back to any on-scene rig that stocks the plate.
 *
 * A plate the shore needs but no on-scene rig stocks is recorded UNTRACKED here
 * (inventoryId absent). This is the AUTO-SOURCE foundation only; Phase 3's
 * missing-piece chooser replaces that silent fallback with an explicit choice
 * (quick-add ∥ deploy-untracked-with-confirm ∥ set-to-None) before commit.
 */
export function assembleBom(
  combo: StrutCombination,
  deductions: Pick<Deductions, 'topPlate' | 'bottomPlate'>,
  strutSource: { apparatus: string; inventoryId: string },
  inventory: InventoryItem[],
): DeployedComponent[] {
  // Units already claimed from each inventory row by THIS one assembly — so two
  // components that draw from the same row (the same plate at both ends, or two
  // same-size extensions) take DISTINCT units instead of double-claiming one row.
  // Without this, same-plate-both-ends with a single unit in stock would force the
  // deploy's all-or-nothing transaction to abort a shore that should deploy.
  const claimed: Record<string, number> = {};
  const claim = (id: string) => {
    claimed[id] = (claimed[id] ?? 0) + 1;
  };

  const bom: DeployedComponent[] = [
    {
      role: 'strut',
      model: combo.strut.model,
      system: combo.strut.system,
      source: strutSource.apparatus,
      inventoryId: strutSource.inventoryId,
    },
  ];
  claim(strutSource.inventoryId);

  // Pair each required extension LENGTH with a row the engine resolved for it
  // (combo.extensionSources, one entry per instance), consuming each source once.
  // A length with no resolved source (catalog mode, or not in tracked stock) is
  // recorded UNTRACKED — extensions follow the same model as plates (decision 2),
  // and the extension must never silently vanish from the deployed identity.
  const extSources = [...(combo.extensionSources ?? [])];
  for (const length of combo.extensions) {
    const idx = extSources.findIndex((s) => s.length === length);
    const src = idx >= 0 ? extSources.splice(idx, 1)[0] : undefined;
    const row = src ? inventory.find((i) => i.id === src.inventoryId) : undefined;
    bom.push({
      role: 'extension',
      length,
      system: combo.strut.system,
      source: row?.apparatus ?? UNTRACKED_SOURCE,
      inventoryId: src?.inventoryId,
    });
    if (src) claim(src.inventoryId);
  }

  pushPlate(bom, 'top-plate', deductions.topPlate, strutSource.apparatus, inventory, claimed, claim);
  pushPlate(bom, 'bottom-plate', deductions.bottomPlate, strutSource.apparatus, inventory, claimed, claim);
  return bom;
}

function pushPlate(
  bom: DeployedComponent[],
  role: 'top-plate' | 'bottom-plate',
  plateId: string,
  preferRig: string,
  inventory: InventoryItem[],
  claimed: Record<string, number>,
  claim: (id: string) => void,
): void {
  if (plateId === 'none') return;
  // Only rows with an unclaimed unit left for THIS assembly are eligible.
  const rows = inventory.filter(
    (i) => i.type === 'plate' && i.plateId === plateId && i.available - (claimed[i.id] ?? 0) > 0,
  );
  const pick = rows.find((r) => r.apparatus === preferRig) ?? rows[0];
  bom.push({
    role,
    plateId,
    source: pick?.apparatus ?? UNTRACKED_SOURCE,
    inventoryId: pick?.id,
  });
  if (pick) claim(pick.id);
}
