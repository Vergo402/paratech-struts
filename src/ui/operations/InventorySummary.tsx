import { useMemo } from 'react';
import { STRUTS } from '@core/load';
import type { InventoryItem } from '@core/schema';
import type { Apparatus } from '@core/schema';
import { itemLabel } from '../inventory/EquipmentRow';

type Tone = 'depleted' | 'low' | 'ok';

interface ItemRow {
  id: string;
  label: string;
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

      if (item.type === 'strut') {
        const strut = STRUTS.find((s) => s.model === item.model);
        group.struts.push({ id: item.id, label, available: item.available, quantity: item.quantity, tone, sortKey: strut?.collapsed ?? 999 });
      } else if (item.type === 'extension') {
        group.extensions.push({ id: item.id, label, available: item.available, quantity: item.quantity, tone, sortKey: item.length ?? 999 });
      } else {
        group.plates.push({ id: item.id, label, available: item.available, quantity: item.quantity, tone, sortKey: 0 });
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
    return <p className="fs-inv-summary-empty">No inventory on file</p>;
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
              <span className="fs-inv-summary-label">{row.label}</span>
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
