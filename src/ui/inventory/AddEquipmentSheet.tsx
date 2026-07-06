import type { ReactNode } from 'react';
import { STRUTS, EXTENSIONS, BASE_PLATES } from '@core/load';
import { Sheet } from '@ui/primitives';
import { PlateThumb } from '@ui/picker';
import type { InventoryItem, System } from '@core/schema';
import { SYSTEM_LABELS } from './systemLabels';

// Quick-add for the selected rig. Full-width tap rows for struts + extensions and a
// plate grid that reuses PlateSwatch's look (NOT the single-select VisualGridPicker —
// quick-add is stay-open multi-tap increment). Each tap adds one and the sheet stays
// open; a per-cell count badge tracks what's already on the rig.

// Derived from the @core domain type — keeps this component free of any @data import
// (lint invariant 3). Structurally identical to the store's AddSpec.
type NewEquipment = Omit<InventoryItem, 'id' | 'quantity' | 'available'>;

export interface AddEquipmentSheetProps {
  open: boolean;
  onClose: () => void;
  apparatusId: string;
  apparatusName: string;
  /** The rig's current items — drives the per-cell "already on rig" count. */
  items: InventoryItem[];
  onAdd: (spec: NewEquipment) => void;
}

const SYS_GROUPS: { system: System; label: string }[] = (
  ['LongShore', 'AcmeThread', 'LockStroke'] as System[]
).map((system) => ({ system, label: SYSTEM_LABELS[system] }));

interface CellProps {
  label: string;
  sub?: string;
  count: number;
  thumb?: ReactNode;
  onPick: () => void;
}

function QuickCell({ label, sub, count, thumb, onPick }: CellProps) {
  return (
    <button
      type="button"
      className="fs-qa-cell"
      onClick={onPick}
      aria-label={`Add one ${label}${count > 0 ? `, ${count} on rig` : ''}`}
    >
      {thumb}
      <span className="fs-qa-text">
        <span className="fs-qa-label">{label}</span>
        {sub && <span className="fs-qa-sub">{sub}</span>}
      </span>
      {count > 0 && <span className="fs-qa-count">{count}</span>}
    </button>
  );
}

export function AddEquipmentSheet({ open, onClose, apparatusId, apparatusName, items, onAdd }: AddEquipmentSheetProps) {
  const base = { apparatus: apparatusName, apparatusId };
  const strutCount = (model: string) =>
    items.filter((i) => i.type === 'strut' && i.model === model).reduce((n, i) => n + i.quantity, 0);
  const extCount = (system: System, length: number) =>
    items
      .filter((i) => i.type === 'extension' && i.system === system && i.length === length)
      .reduce((n, i) => n + i.quantity, 0);
  const plateCount = (plateId: string) =>
    items.filter((i) => i.type === 'plate' && i.plateId === plateId).reduce((n, i) => n + i.quantity, 0);

  return (
    <Sheet open={open} onClose={onClose} title={`Add equipment — ${apparatusName}`}>
      <div className="fs-qa">
        {SYS_GROUPS.map((g) => {
          const struts = STRUTS.filter((s) => s.system === g.system);
          const exts = EXTENSIONS[g.system];
          return (
            <section key={g.system} className="fs-qa-group">
              <h3 className="fs-qa-group-label">{g.label}</h3>
              {struts.map((s) => (
                <QuickCell
                  key={s.id}
                  label={s.model}
                  sub={`${s.collapsed}″–${s.extended}″`}
                  count={strutCount(s.model)}
                  onPick={() => onAdd({ ...base, type: 'strut', model: s.model, system: s.system })}
                />
              ))}
              {exts.map((len) => (
                <QuickCell
                  key={`${g.system}-${len}`}
                  label={`${len}″ extension`}
                  count={extCount(g.system, len)}
                  onPick={() => onAdd({ ...base, type: 'extension', system: g.system, length: len })}
                />
              ))}
            </section>
          );
        })}
        <section className="fs-qa-group">
          <h3 className="fs-qa-group-label">Connector Plates</h3>
          <div className="fs-qa-plate-grid">
            {BASE_PLATES.filter((p) => p.id !== 'none').map((p) => (
              <QuickCell
                key={p.id}
                label={p.name}
                count={plateCount(p.id)}
                thumb={<PlateThumb id={p.id} name={p.name} />}
                onPick={() => onAdd({ ...base, type: 'plate', plateId: p.id })}
              />
            ))}
          </div>
        </section>
      </div>
    </Sheet>
  );
}
