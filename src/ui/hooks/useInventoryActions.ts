import { useMemo } from 'react';
import { inventoryStore, apparatusStore, type AddSpec } from '@data/store';
import { parseCsv, toCsv, getTemplateCSV } from '@data/inventory/excel';

// Stock mutations + CSV round-trip, behind the @ui/hooks seam. Stable callbacks
// (singleton stores → empty deps). Reads happen at call time from the store, so the
// export always reflects current stock without re-subscribing here.

export interface ImportOutcome {
  imported: number;
  skipped: number;
  warnings: string[];
}

export interface InventoryActionsApi {
  /** Add one unit; resolves to the affected stock record's id (created or incremented). */
  addOne(spec: AddSpec): Promise<string>;
  increment(id: string): Promise<void>;
  decrement(id: string): Promise<void>;
  setQuantity(id: string, quantity: number): Promise<void>;
  remove(id: string): Promise<void>;
  /** Current stock as CSV text (10-column contract). */
  exportCsv(): string;
  /** The blank template CSV (headers + example rows). */
  templateCsv(): string;
  /** Parse + merge a CSV file's stock; returns counts + per-row warnings. */
  importCsv(text: string): Promise<ImportOutcome>;
}

export function useInventoryActions(): InventoryActionsApi {
  return useMemo(
    () => ({
      addOne: (spec: AddSpec) => inventoryStore.addOne(spec),
      increment: (id: string) => inventoryStore.incrementItem(id),
      decrement: (id: string) => inventoryStore.decrementItem(id),
      setQuantity: (id: string, quantity: number) => inventoryStore.setQuantity(id, quantity),
      remove: (id: string) => inventoryStore.removeItem(id),
      exportCsv: () => toCsv(inventoryStore.store.getState().items),
      templateCsv: () => getTemplateCSV(),
      importCsv: async (text: string): Promise<ImportOutcome> => {
        const { rows, warnings } = parseCsv(text);
        const { imported, skipped } = await inventoryStore.upsertImport(rows, apparatusStore);
        return { imported, skipped, warnings };
      },
    }),
    [],
  );
}
