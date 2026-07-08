import { useMemo } from 'react';
import { STRUTS } from '@core/load';
import type { InventoryItem } from '@core/schema';
import type { Apparatus } from '@core/schema';
import { itemLabel } from '../inventory/EquipmentRow';
import { SYSTEM_LABELS } from '../inventory/systemLabels';
import { EmptyState } from '@ui/primitives';

type Tone = 'depleted' | 'low' | 'ok';

// The strut-family / category tag shown under each item name, mirroring v3's
// "Grey / Gold / Plate" sub-label (common.ts: AcmeThread + LockStroke = Grey,
// LongShore = Gold). Extensions carry a system too; plates are always "Plate".
function systemLabel(item: InventoryItem): string {
  if (item.type === 'plate') return 'Plate';
  // The system name, never the v3 color code (§8). Extensions carry no system — the
  // old code mislabeled them "Grey"; a blank sublabel is honest (data has no system).
  return item.system ? SYSTEM_LABELS[item.system] : '';
}

interface ItemRow {
  id: string;
  label: string;
  system: string;
  available: number;
  quantity: number;
  tone: Tone;
  sortKey: number;
}

interface ApparatusGroup {
  apparatusId: string;
  name: string;
  struts: ItemRow[];
  extensions: ItemRow[];
  plates: ItemRow[];
  isExternal: boolean;
}

interface Props {
  items: InventoryItem[];
  roster: Apparatus[];
}

export function InventorySummary({ items, roster }: Props) {
  const rosterIds = useMemo(() => new Set(roster.map((r) => r.id)), [roster]);
  const rosterById = useMemo(() => new Map(roster.map((r) => [r.id, r])), [roster]);

  const groups = useMemo<ApparatusGroup[]>(() => {
    const map = new Map<string, ApparatusGroup>();

    for (const item of items) {
      let group = map.get(item.apparatusId);
      if (!group) {
        const rig = rosterById.get(item.apparatusId);
        group = {
          apparatusId: item.apparatusId,
          name: rig?.name ?? item.apparatus,
          struts: [],
          extensions: [],
          plates: [],
          isExternal: !rosterIds.has(item.apparatusId),
        };
        map.set(item.apparatusId, group);
      }

      const tone: Tone = item.available === 0 ? 'depleted' : item.available === 1 ? 'low' : 'ok';
      const { label } = itemLabel(item);
      const system = systemLabel(item);
      const base = { id: item.id, label, system, available: item.available, quantity: item.quantity, tone };

      if (item.type === 'strut') {
        const strut = STRUTS.find((s) => s.model === item.model);
        group.struts.push({ ...base, sortKey: strut?.collapsed ?? 999 });
      } else if (item.type === 'extension') {
        group.extensions.push({ ...base, sortKey: item.length ?? 999 });
      } else {
        group.plates.push({ ...base, sortKey: 0 });
      }
    }

    for (const g of map.values()) {
      g.struts.sort((a, b) => a.sortKey - b.sortKey);
      g.extensions.sort((a, b) => a.sortKey - b.sortKey);
      g.plates.sort((a, b) => a.label.localeCompare(b.label));
    }

    return [...map.values()].sort((a, b) => {
      if (a.isExternal !== b.isExternal) return a.isExternal ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [items, rosterIds, rosterById]);

  if (groups.length === 0) {
    return (
      <EmptyState
        variant="first-run"
        headline="No inventory on file"
        reason="Add equipment in the Inventory tab to source deployments here."
      />
    );
  }

  return (
    <div className="fs-inv-summary">
      {groups.map((g) => (
        <section key={g.apparatusId} className="fs-inv-summary-rig">
          <h3 className="fs-inv-summary-rig-name">
            {g.isExternal && <span className="fs-inv-summary-external-tag">External</span>}
            {g.name}
          </h3>
          {[...g.struts, ...g.extensions, ...g.plates].map((row) => (
            <div key={row.id} className={`fs-inv-summary-row is-${row.tone}`}>
              <div className="fs-inv-summary-id">
                <span className="fs-inv-summary-label">{row.label}</span>
                <span className="fs-inv-summary-system">{row.system}</span>
              </div>
              <span
                className="fs-inv-summary-count"
                aria-label={`${row.available} of ${row.quantity} available`}
              >
                {row.available}/{row.quantity}
              </span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
