import Dexie, { type Table } from 'dexie';
import type { FieldShoreEvent, InventoryItem } from '@core/schema';

// data/store — the local-first persistence layer (module-boundaries.md). The
// `events` table IS the device's source of truth (ADR-009): every mutation is
// one appended row; current state is projectOperation() over it. Storage is
// IndexedDB via Dexie, not localStorage — the 5 MB cap is real at task-force
// scale (ADR-024).
//
// Primary key is an auto-increment `seq`, NOT the event id: projection must
// fold in a total, stable append order, and event ids are UUIDs (random sort)
// while `at` can collide within one millisecond (a grouped T-Shore add emits N
// events in one commit). `seq` is true local append order; `id` stays a unique
// index (duplicate appends — e.g. a peer event already merged — fail on it).
export type EventRow = FieldShoreEvent & { seq?: number };

export interface MetaRow {
  key: string;
  value: string;
}

export class FieldShoreDB extends Dexie {
  events!: Table<EventRow, number>;
  inventory!: Table<InventoryItem, string>;
  meta!: Table<MetaRow, string>;

  constructor(name = 'fieldshore') {
    super(name);
    this.version(1).stores({
      events: '++seq, &id, opId, at',
      inventory: '&id, apparatusId',
      meta: '&key',
    });
  }
}

/** Fresh DB instance — tests pass a unique name for isolation. */
export function createDB(name?: string): FieldShoreDB {
  return new FieldShoreDB(name);
}

/** The app's singleton database. Opened lazily by Dexie on first operation. */
export const db = createDB();
