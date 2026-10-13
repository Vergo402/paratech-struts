import { useMemo } from 'react';
import { inventoryStore, apparatusStore, type AddSpec, type ImportResult } from '@data/store';
import { parseCsv, toCsv, getTemplateCSV, type ParsedImportRow } from '@data/inventory/excel';

// Stock mutations + CSV round-trip, behind the @ui/hooks seam. Stable callbacks
// (singleton stores → empty deps). Reads happen at call time from the store, so the
// export always reflects current stock without re-subscribing here.

export type { ImportResult };

/** The no-UI CSV path's result: the store's ImportResult plus the parser's per-row notes. */
export interface ImportOutcome extends ImportResult {
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
  /** Commit already-validated rows (the 4-step flow's Step-4 path — mapping + any
   *  inline fixes are resolved in the UI). Resolves the store's ImportResult — skips by
   *  guard + the cloud outcome (#514); rejects only when nothing was saved. */
  importRows(rows: ParsedImportRow[]): Promise<ImportResult>;
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
        return { ...(await inventoryStore.upsertImport(rows, apparatusStore)), warnings };
      },
      importRows: (rows: ParsedImportRow[]) => inventoryStore.upsertImport(rows, apparatusStore),
    }),
    [],
  );
}
