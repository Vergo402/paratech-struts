import { createStore, type StoreApi } from 'zustand/vanilla';
import { newId } from '@core/id';
import { InventoryItem, type StockRow } from '@core/schema';
import { heldOf as heldOfCounts, type HeldCounts } from '@core/operation';
import type { ParsedImportRow } from '../inventory/excel';
import { type FieldShoreDB } from './db';
import { APPARATUS_ROSTER_KEY, type ApparatusStoreApi } from './apparatusStore';
import { wrapBlob, type CloudRow } from '../sync/stateSync';

// The in-memory mirror of the Dexie `inventory` table plus the stock mutators the
// Inventory screen drives. The Dexie table is the durable truth for what each rig
// CARRIES (`quantity`); this store is the synchronous read path for the hooks (L-4 — UI
// never does a fresh Dexie read per render).
//
// ADR-041 — stock OUT ON SCENE is not stored here. operationStore folds the event log and
// pushes `held` (units per row id held by deployed equipment, every op in the bucket) via
// setHeld(); the view `items` is `rows` joined with it: `available = quantity − held`,
// SIGNED (negative = over-allocated, two crews claimed one unit — the truthful rendering,
// D2). Deploy/return never write a stock row, so the only writer of a Dexie row is a
// manual edit (here) or a peer's manual edit (applyRemoteRow). Each mutator still reads
// AND writes inside one `rw` transaction via a fresh `get(id)` — two quick taps must not
// read the same stale quantity — and reads `held` from the in-memory fold, which is the
// only place it exists.
//
// Quantity is DIRECT-DEXIE, not event-sourced — inventory is pre-incident mutable state,
// last-write-wins across devices (cloud-sync Increment 3).

export interface InventoryState {
  /** The persisted rows (Dexie mirror). No derived fields. */
  rows: InventoryItem[];
  /** Units held per row id, from the folded event log (absent id = 0). */
  held: HeldCounts;
  /** The derived view every reader uses: rows + held + signed available. */
  items: StockRow[];
}

/** A new stock record minus the app-managed fields (id minted; quantity set). */
export type AddSpec = Omit<InventoryItem, 'id' | 'quantity'>;

/** Did the imported rows reach the cloud (#514)? 'synced' every push landed; 'pending'
 *  offline, or a push unacknowledged within the settle bound (RTDB keeps retrying);
 *  'failed' one or more pushes were refused (`failed` + `reverted` = how many); 'local'
 *  nothing to push — no cloud for this bucket (guest) or no row imported. */
export type ImportCloudStatus = 'synced' | 'pending' | 'failed' | 'local';

export interface ImportResult {
  /** Rows written — blank-ID rows of one identity aggregate into ONE (#469). */
  imported: number;
  /** Rows the store refused, by the guard that refused them: `strand` = the quantity
   *  would fall below the units deployed; `retype` = an id reused with a different kind.
   *  A refused row counts the blank-ID rows folded into it (#469) — they were dropped
   *  with it — so `sent − (imported + strand + retype)` = rows merged into APPLIED rows. */
  skipped: { strand: number; retype: number };
  /** Of the refused pushes: `failed` = the import's value is still on this device;
   *  `reverted` = the cloud held a newer row, which the LWW pull-down applied over it
   *  (ADR-041) — this device now shows the cloud's value for it. */
  cloud: { status: ImportCloudStatus; failed: number; reverted: number };
}

export interface InventoryStoreApi {
  store: StoreApi<InventoryState>;
  /** Read the whole table into memory (boot / after a bulk write). */
  boot(): Promise<void>;
  /** Upsert one row into the mirror (replace if present, else append). */
  applyLocal(item: InventoryItem): void;
  /** Drop one row from the mirror. */
  removeLocal(id: string): void;
  /** Replace the held counts (operationStore, after every fold). Skips — no state change,
   *  no re-render — when the counts are equal to the current ones. */
  setHeld(held: HeldCounts): void;
  /** Units of one row held by deployed equipment (0 when none). */
  heldOf(id: string): number;
  // ---- cloud-sync Increment 3 (LWW pull-down; the listener owns the newer-wins guard) ----
  /** Apply a remote row: durable write THEN mirror. The peer's quantity is persisted
   *  VERBATIM (ADR-041: a local floor clamp made quantity diverge per device; a quantity
   *  below held reads as over-allocated instead). Does NOT re-push (no echo). */
  applyRemoteRow(row: CloudRow): Promise<void>;
  /** Apply a remote tombstone: delete the row unless units are held (never strand a
   *  deployed unit). Does NOT re-push. */
  applyRemoteDelete(id: string): Promise<void>;
  /** Push cloud tombstones for rows deleted OUTSIDE the stock mutators (the apparatus
   *  cascade bulk-deletes directly), so peers don't resurrect orphaned cloud rows. */
  tombstoneCloud(ids: string[]): void;
  // ---- stock mutators (Inventory screen) ----
  /** Quick-add: increment the matching row on the rig, or create it at quantity 1.
   *  Resolves to the affected row's id. */
  addOne(spec: AddSpec): Promise<string>;
  /** ± up: one more physical unit. */
  incrementItem(id: string): Promise<void>;
  /** ± down: one fewer unit; no-op when none is available (quantity − held ≤ 0); removes
   *  the row when its last unit is dropped and nothing is held. */
  decrementItem(id: string): Promise<void>;
  /** Set the physical count; floored at held; 0 removes the row. */
  setQuantity(id: string, quantity: number): Promise<void>;
  /** Remove the row; refuses while any unit is held. */
  removeItem(id: string): Promise<void>;
  /** Merge stock from a parsed CSV: upsert by ID (blank-ID rows merge into identical
   *  stock on the same rig, else add), provision new apparatus for blank
   *  Apparatus-ID rows (atomic with the items, via the roster store), and skip any row
   *  whose quantity would fall below the units it holds. */
  upsertImport(rows: ParsedImportRow[], apparatus: ApparatusStoreApi): Promise<ImportResult>;
}

// The identity of a stock record on a rig: resolved rig + type + the per-type descriptor
// (strut -> model; extension -> length + system; plate -> plateId). ONE key shared by
// stock matching (sameIdentity) and the import's in-file aggregation so they cannot drift.
type IdentityFields = Pick<AddSpec, 'apparatusId' | 'type' | 'model' | 'length' | 'system' | 'plateId'>;
function identityKey(s: IdentityFields): string {
  const descriptor =
    s.type === 'strut' ? [s.model] : s.type === 'extension' ? [s.length, s.system] : [s.plateId];
  return JSON.stringify([s.apparatusId, s.type, ...descriptor]);
}

function sameIdentity(i: InventoryItem, s: AddSpec): boolean {
  return identityKey(i) === identityKey(s);
}

// Like sameIdentity but rig-agnostic — the KIND of a stock record (type + descriptor).
// An import that reuses an id must not change this (it would strand a deployed ref).
function sameKind(a: InventoryItem, b: AddSpec): boolean {
  if (a.type !== b.type) return false;
  if (b.type === 'strut') return a.model === b.model;
  if (b.type === 'extension') return a.length === b.length && a.system === b.system;
  return a.plateId === b.plateId; // plate
}

// Cloud-write hooks (cloud-sync Increment 3) — fired AFTER the durable write so the
// registry can push the row/tombstone to /orgs/{deptId}/inventory. Injected (default
// no-op) so the store stays sync-ignorant + unit tests stay firebase-free. Only manual
// mutators fire these — deploy/return are events and never touch a stock row.
export interface InventoryCloudHooks {
  /** May return the push's outcome (the registry returns syncService.setState's, which
   *  never rejects); the import awaits it to report what reached the cloud (#514). */
  onRow?: (item: InventoryItem) => Promise<CloudPushOutcome> | void;
  onDelete?: (id: string, lastWriteAt: number) => void;
}

/** One cloud push's outcome — structurally syncService's StateWriteOutcome (the store
 *  stays sync-ignorant, so it names its own copy). */
export type CloudPushOutcome = 'ok' | 'failed' | 'skipped';

/** How long an online import waits for its cloud pushes to settle before calling the
 *  unacknowledged ones 'pending' (#514). Bounded so a dead socket never hangs the UI. */
export const CLOUD_SETTLE_MS = 4000;

/** Injected cloud context for the import's outcome report (#514) — kept apart from the
 *  write hooks. Defaults: online, CLOUD_SETTLE_MS. */
export interface InventoryStoreOptions {
  /** The connectivity flag the sync layer already tracks (syncStatusStore.online). */
  isOnline?: () => boolean;
  cloudSettleMs?: number;
}

/** Fold the per-row push outcomes into the import's cloud verdict. Offline, a dept push
 *  buffers in RTDB and never settles, so only an immediate (same-tick) answer — a
 *  guest's 'skipped' — is taken; online, wait up to `settleMs`. Never rejects. */
async function settleCloud(
  pushes: Promise<CloudPushOutcome>[],
  online: boolean,
  settleMs: number,
): Promise<(CloudPushOutcome | undefined)[]> {
  const settled: (CloudPushOutcome | undefined)[] = pushes.map(() => undefined);
  if (pushes.length === 0) return settled;
  const tracked = pushes.map((p, i) => p.then((o) => void (settled[i] = o)));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const bound = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, online ? settleMs : 0);
  });
  await Promise.race([Promise.all(tracked), bound]);
  clearTimeout(timer);
  return settled; // undefined = still unsettled at the bound
}

/** The import's cloud verdict from the settled pushes and how many refused rows were
 *  overwritten by the cloud's newer value. */
function cloudVerdict(settled: (CloudPushOutcome | undefined)[], reverted: number): ImportResult['cloud'] {
  const refused = settled.filter((o) => o === 'failed').length;
  if (refused > 0) return { status: 'failed', failed: refused - reverted, reverted };
  if (settled.length === 0 || settled.every((o) => o === 'skipped')) return { status: 'local', failed: 0, reverted: 0 };
  if (settled.some((o) => o === undefined)) return { status: 'pending', failed: 0, reverted: 0 };
  return { status: 'synced', failed: 0, reverted: 0 };
}

/** The derived view: each row joined with its held count; available signed. */
function deriveItems(rows: readonly InventoryItem[], held: HeldCounts): StockRow[] {
  return rows.map((r) => {
    const h = heldOfCounts(held, r.id);
    return { ...r, held: h, available: r.quantity - h };
  });
}

/** Shallow equality of two held maps (same keys, same counts). */
function sameHeld(a: HeldCounts, b: HeldCounts): boolean {
  if (a === b) return true;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => Object.hasOwn(b, k) && a[k] === b[k]);
}

export function createInventoryStore(
  db: FieldShoreDB,
  hooks: InventoryCloudHooks = {},
  opts: InventoryStoreOptions = {},
): InventoryStoreApi {
  const isOnline = opts.isOnline ?? (() => true);
  const cloudSettleMs = opts.cloudSettleMs ?? CLOUD_SETTLE_MS;
  const EMPTY_HELD: HeldCounts = {};
  const store = createStore<InventoryState>(() => ({ rows: [], held: EMPTY_HELD, items: [] }));

  const heldOf = (id: string): number => heldOfCounts(store.getState().held, id);

  // The single write choke point for manual stock edits: stamps the LWW clock AND parses
  // through the schema, which strips anything that isn't a persisted field — a legacy
  // `available` spread from an old Dexie row, or a view row's `held`/`available` — so a
  // derived value can never be written to Dexie or pushed to the cloud.
  const stamped = (item: InventoryItem): InventoryItem => InventoryItem.parse({ ...item, lastWriteAt: Date.now() });

  function setRows(rows: InventoryItem[]): void {
    const { held } = store.getState();
    store.setState({ rows, held, items: deriveItems(rows, held) }, true);
  }

  function applyLocal(item: InventoryItem): void {
    const { rows } = store.getState();
    const exists = rows.some((i) => i.id === item.id);
    setRows(exists ? rows.map((i) => (i.id === item.id ? item : i)) : [...rows, item]);
  }

  function removeLocal(id: string): void {
    setRows(store.getState().rows.filter((i) => i.id !== id));
  }

  function setHeld(held: HeldCounts): void {
    const s = store.getState();
    if (sameHeld(s.held, held)) return; // a fold that moved no stock → no re-render
    store.setState({ rows: s.rows, held, items: deriveItems(s.rows, held) }, true);
  }

  async function boot(): Promise<void> {
    // Read trust boundary: parse every durable row. Parsing strips a legacy row's
    // persisted `available` (pre-ADR-041) from the mirror; a corrupt row is dropped with a
    // warning rather than crashing every stock read. Durable rows are left as they are —
    // the vestigial field is harmless there and disappears on the row's next write.
    const raw = await db.inventory.toArray();
    const rows: InventoryItem[] = [];
    let dropped = 0;
    for (const r of raw) {
      const parsed = InventoryItem.safeParse(r);
      if (parsed.success) rows.push(parsed.data);
      else dropped++;
    }
    if (dropped) console.warn(`FieldShore: skipped ${dropped} unreadable inventory row(s) on load.`);
    setRows(rows);
  }

  // Each mutator RETURNS its outcome from the Dexie transaction (rather than mutating a
  // captured variable) — the value is correctly typed and the read+write stay in one txn.

  // Returns the affected row's id — the created row, or the incremented match —
  // so a caller (the deploy missing-piece quick-add, #330 Phase 3b) can re-point a
  // BOM component at the exact stock record it just added, no reactive round-trip.
  async function addOne(spec: AddSpec): Promise<string> {
    const result = await db.transaction('rw', db.inventory, async () => {
      const rigItems = await db.inventory.where('apparatusId').equals(spec.apparatusId).toArray();
      const match = rigItems.find((i) => sameIdentity(i, spec));
      if (match) {
        const updated = stamped({ ...match, quantity: match.quantity + 1 });
        await db.inventory.put(updated);
        return updated;
      }
      const created = stamped({ id: `inv-${newId()}`, quantity: 1, ...spec });
      await db.inventory.add(created);
      return created;
    });
    applyLocal(result);
    hooks.onRow?.(result);
    return result.id;
  }

  async function incrementItem(id: string): Promise<void> {
    const result = await db.transaction('rw', db.inventory, async () => {
      const item = await db.inventory.get(id);
      if (!item) throw new Error(`inventory item ${id} not found`);
      const updated = stamped({ ...item, quantity: item.quantity + 1 });
      await db.inventory.put(updated);
      return updated;
    });
    applyLocal(result);
    hooks.onRow?.(result);
  }

  // Shared removed/updated/noop dispatch tail of decrementItem + setQuantity
  // (#435 dedup): mirror the txn's outcome to the hot state + the cloud hooks.
  type MutateOutcome = { kind: 'noop' } | { kind: 'removed' } | { kind: 'updated'; item: InventoryItem };
  function dispatchOutcome(id: string, outcome: MutateOutcome): void {
    if (outcome.kind === 'removed') {
      removeLocal(id);
      hooks.onDelete?.(id, Date.now());
    } else if (outcome.kind === 'updated') {
      applyLocal(outcome.item);
      hooks.onRow?.(outcome.item);
    }
  }

  async function decrementItem(id: string): Promise<void> {
    const outcome = await db.transaction('rw', db.inventory, async (): Promise<MutateOutcome> => {
      const item = await db.inventory.get(id);
      // a concurrent removal (fast double-tap of −) is benign — no-op, don't throw
      if (!item) return { kind: 'noop' };
      const held = heldOf(id);
      if (item.quantity - held <= 0) return { kind: 'noop' }; // every unit is out on scene
      if (item.quantity === 1 && held === 0) {
        await db.inventory.delete(id); // last unit dropped, nothing held → remove the row
        return { kind: 'removed' };
      }
      const updated = stamped({ ...item, quantity: item.quantity - 1 });
      await db.inventory.put(updated);
      return { kind: 'updated', item: updated };
    });
    dispatchOutcome(id, outcome);
  }

  async function setQuantity(id: string, quantity: number): Promise<void> {
    const outcome = await db.transaction('rw', db.inventory, async (): Promise<MutateOutcome> => {
      const item = await db.inventory.get(id);
      if (!item) throw new Error(`inventory item ${id} not found`);
      if (!Number.isFinite(quantity)) return { kind: 'noop' }; // never persist NaN
      const q = Math.max(Math.trunc(quantity), heldOf(id)); // never below the units held
      if (q <= 0) {
        await db.inventory.delete(id); // held is 0 here (floored), so nothing is stranded
        return { kind: 'removed' };
      }
      const updated = stamped({ ...item, quantity: q });
      await db.inventory.put(updated);
      return { kind: 'updated', item: updated };
    });
    dispatchOutcome(id, outcome);
  }

  async function removeItem(id: string): Promise<void> {
    await db.transaction('rw', db.inventory, async () => {
      const item = await db.inventory.get(id);
      if (!item) throw new Error(`inventory item ${id} not found`);
      if (heldOf(id) > 0) throw new Error(`inventory item ${id} has deployed units (cannot remove)`);
      await db.inventory.delete(id);
    });
    removeLocal(id);
    hooks.onDelete?.(id, Date.now());
  }

  async function upsertImport(rows: ParsedImportRow[], apparatus: ApparatusStoreApi): Promise<ImportResult> {
    // Resolve a blank-Apparatus-ID row's rig by NAME against the existing roster and
    // stock first, so a row named like an existing rig reuses it instead of minting a
    // duplicate; only a genuinely new name creates a rig (type unknown from a 10-col
    // file → 'Other').
    const roster = apparatus.store.getState().roster;
    const nameToId = new Map<string, string>();
    for (const a of roster) if (!nameToId.has(a.name)) nameToId.set(a.name, a.id);
    for (const i of store.getState().rows) if (!nameToId.has(i.apparatus)) nameToId.set(i.apparatus, i.apparatusId);

    const newRigs = new Map<string, { id: string; name: string; type: 'Other' }>();
    for (const r of rows) {
      if (!r.apparatusId && !nameToId.has(r.apparatus)) {
        const rig = { id: `app-${newId()}`, name: r.apparatus, type: 'Other' as const };
        newRigs.set(r.apparatus, rig);
        nameToId.set(r.apparatus, rig.id);
      }
    }
    const apparatusIdFor = (r: ParsedImportRow) => r.apparatusId || nameToId.get(r.apparatus)!;
    const nextRoster = [...roster, ...newRigs.values()];

    let imported = 0;
    const skipped = { strand: 0, retype: 0 };
    const now = Date.now(); // one LWW stamp for the whole import batch
    const importedIds: string[] = [];
    const written = new Map<string, number>(); // id → the quantity this import wrote (stamp `now`)
    // Blank-ID rows (a hand-kept / template CSV) carry no identity of their own, so the
    // file is aggregated first, per RESOLVED rig + kind (identityKey).
    // SUM vs SET (the rule): the file lists physical units, so WITHIN one file every row
    // of one identity SUMs into a single file total — identical blank rows (2 + 3 = 5),
    // and an id row plus blank rows of the same identity (the total lands on the id row,
    // the blank rows fold in; order-independent, counted once). AGAINST existing stock
    // that file total SETs the quantity (as the id path always did), so re-importing the
    // same file is idempotent rather than doubling the stock. An id row with no blank
    // sibling is plain SET, exactly as before.
    const keyOf = (r: ParsedImportRow) => identityKey({ ...r, apparatusId: apparatusIdFor(r) });
    const blankSums = new Map<string, number>();
    const idKeys = new Set<string>();
    for (const r of rows) {
      const k = keyOf(r);
      if (r.id) idKeys.add(k);
      else blankSums.set(k, (blankSums.get(k) ?? 0) + r.quantity);
    }
    const blankCounts = new Map<string, number>();
    for (const r of rows) if (!r.id) blankCounts.set(keyOf(r), (blankCounts.get(keyOf(r)) ?? 0) + 1);
    // `rows` = how many file rows this work item stands for (itself + the blank rows folded
    // into it), so a skip drops — and counts — all of them.
    const work: { r: ParsedImportRow; quantity: number; rows: number }[] = [];
    const carried = new Set<string>(); // keys whose blank total already has a carrier row
    for (const r of rows) {
      const k = keyOf(r);
      if (r.id) {
        // the first id row of a key carries its blank siblings' total; any further id
        // rows of that key stay plain SET
        const blank = carried.has(k) ? undefined : blankSums.get(k);
        if (blank !== undefined) carried.add(k);
        work.push({ r, quantity: r.quantity + (blank ?? 0), rows: 1 + (blank !== undefined ? blankCounts.get(k)! : 0) });
      } else if (!idKeys.has(k) && !carried.has(k)) {
        carried.add(k); // first blank row of an id-less key stands for the aggregate
        work.push({ r, quantity: blankSums.get(k)!, rows: blankCounts.get(k)! });
      }
      // else: a blank row whose identity an id row carries — folded into that row's total
    }
    await db.transaction('rw', db.meta, db.inventory, async () => {
      for (const { r, quantity, rows: represented } of work) {
        const apparatusId = apparatusIdFor(r);
        const fields: AddSpec = {
          type: r.type,
          model: r.model,
          system: r.system,
          plateId: r.plateId,
          length: r.length,
          apparatus: r.apparatus,
          apparatusId,
        };
        let id: string;
        if (r.id) {
          const existing = await db.inventory.get(r.id);
          if (existing) {
            // never re-TYPE a record by reusing its id — return resolves by id only,
            // so a transmuted row would restore the wrong item.
            if (!sameKind(existing, fields)) {
              skipped.retype += represented;
              continue;
            }
          }
          // The orphan guard: a quantity below the units held would strand a deployed
          // unit. Checked for a new id too — a peer's deploy may hold an id this device
          // has no row for yet.
          if (quantity < heldOf(r.id)) {
            skipped.strand += represented;
            continue;
          }
          id = r.id;
          await db.inventory.put({ ...fields, id, quantity, lastWriteAt: now });
        } else {
          // Merge into identical existing stock on the resolved rig (first match), with
          // the same SET semantics + held guard as the id path; otherwise a new row.
          const match = await db.inventory
            .where('apparatusId')
            .equals(apparatusId)
            .filter((i) => sameIdentity(i, fields))
            .first();
          if (match) {
            if (quantity < heldOf(match.id)) {
              skipped.strand += represented;
              continue;
            }
            id = match.id;
            await db.inventory.put({ ...match, quantity, lastWriteAt: now });
          } else {
            id = `inv-${newId()}`;
            await db.inventory.add({ ...fields, id, quantity, lastWriteAt: now });
          }
        }
        importedIds.push(id);
        written.set(id, quantity);
        imported++;
      }
      if (newRigs.size > 0) {
        await db.meta.put({ key: APPARATUS_ROSTER_KEY, value: JSON.stringify(wrapBlob(nextRoster, now)) });
      }
    });
    // The transaction committed: from here on NOTHING may throw (#514) — a rejection of
    // upsertImport must mean the transaction rolled back, so the UI can truthfully say
    // "Nothing was saved". Each post-commit step degrades instead of throwing.
    const revertedSinceImport = async (id: string): Promise<boolean> => {
      try {
        const row = await db.inventory.get(id);
        return !row || row.quantity !== written.get(id) || row.lastWriteAt !== now;
      } catch {
        return false; // unreadable → can't prove a revert; report it as failed (still local)
      }
    };
    const postCommit = async (step: string, fn: () => unknown): Promise<boolean> => {
      try {
        await fn();
        return true;
      } catch (err) {
        console.warn(`FieldShore: import saved, but ${step} failed:`, err);
        return false;
      }
    };
    const reloaded = await postCommit('reloading inventory', boot);
    const rosterReloaded = newRigs.size > 0 && (await postCommit('reloading apparatus', () => apparatus.boot()));
    // Push the imported rows + (if rigs were provisioned) the roster blob to the cloud.
    // After boot() the mirror holds the durable rows; push each by id (LWW, idempotent).
    // A FAILED reload leaves the mirror stale (an existing id would push its OLD quantity),
    // so push nothing and count every imported row as not reaching the cloud; the next
    // boot's first-merge re-pushes them from Dexie.
    const pushes: { id: string; outcome: Promise<CloudPushOutcome> }[] = [];
    if (hooks.onRow) {
      const byId = new Map(store.getState().rows.map((i) => [i.id, i]));
      for (const id of importedIds) {
        const it = reloaded ? byId.get(id) : undefined;
        let push: Promise<CloudPushOutcome> | void;
        try {
          push = it ? hooks.onRow(it) : Promise.resolve('failed');
        } catch {
          push = Promise.resolve('failed');
        }
        if (push) pushes.push({ id, outcome: Promise.resolve(push).catch((): CloudPushOutcome => 'failed') });
      }
    }
    // Same for the roster: a stale blob would overwrite the cloud without the new rigs.
    if (rosterReloaded) await postCommit('pushing the apparatus roster', () => apparatus.pushRoster());
    const settled = await settleCloud(
      pushes.map((p) => p.outcome),
      isOnline(),
      cloudSettleMs,
    );
    // A refused push is rolled back by the RTDB client, which re-raises the cloud row
    // BEFORE rejecting the write (subscribe.ts); when the cloud's row is newer, the state
    // listener's LWW pull-down (applyRemoteRow/-Delete) has therefore already ISSUED its
    // Dexie write, and IndexedDB orders this later read after it. A row no longer holding
    // this import's write was reverted to the cloud's value — not "saved on this device".
    let reverted = 0;
    for (let i = 0; i < pushes.length; i++) {
      if (settled[i] === 'failed' && (await revertedSinceImport(pushes[i]!.id))) reverted++;
    }
    return { imported, skipped, cloud: cloudVerdict(settled, reverted) };
  }

  // ---- cloud-sync Increment 3: LWW pull-down (listener decides newer-wins) ----
  async function applyRemoteRow(row: CloudRow): Promise<void> {
    // Validate the wire row before it touches local state (the read-side integrity
    // boundary — the cloud `.validate` is coarse, like the event envelope). A malformed
    // peer write (missing quantity, wrong type) is DROPPED, never persisted. The quantity
    // is taken VERBATIM — no floor at the units held here (ADR-041): every device must
    // persist the same quantity, and a quantity below held renders as over-allocated.
    const parsed = InventoryItem.safeParse(row);
    if (!parsed.success) return;
    await db.inventory.put(parsed.data);
    applyLocal(parsed.data); // no onRow — pulled-down, never re-pushed (no echo)
  }

  async function applyRemoteDelete(id: string): Promise<void> {
    if (heldOf(id) > 0) return; // units are out on scene — never strand them
    const removed = await db.transaction('rw', db.inventory, async () => {
      const local = await db.inventory.get(id);
      if (!local) return false; // already gone
      await db.inventory.delete(id);
      return true;
    });
    if (removed) removeLocal(id);
  }

  function tombstoneCloud(ids: string[]): void {
    const now = Date.now();
    for (const id of ids) hooks.onDelete?.(id, now);
  }

  return {
    store,
    boot,
    applyLocal,
    removeLocal,
    setHeld,
    heldOf,
    applyRemoteRow,
    applyRemoteDelete,
    tombstoneCloud,
    addOne,
    incrementItem,
    decrementItem,
    setQuantity,
    removeItem,
    upsertImport,
  };
}

/** The app's singleton inventory store, bound to the singleton DB. */
// The dept-scoped singleton lives in registry.ts (recreated per-department on a
// switch); this file exports only the factory + helpers.
