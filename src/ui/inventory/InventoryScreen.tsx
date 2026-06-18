import { useMemo, useState } from 'react';
import { useInventory, useApparatus, useInventoryActions, useOperation } from '@ui/hooks';
import { EmptyState, Button } from '@ui/primitives';
import { STRUTS, BASE_PLATES } from '@core/load';
import type { InventoryItem, System } from '@core/schema';
import { ApparatusScopeTabs, type ScopeRig } from './ApparatusScopeTabs';
import { EquipmentRow } from './EquipmentRow';
import { AddEquipmentSheet } from './AddEquipmentSheet';
import { AddApparatusModal } from './AddApparatusModal';
import { ImportExport } from './ImportExport';

// The Inventory screen — apparatus-scoped stock, phone-first. Scope tabs are the
// UNION of the roster and the distinct apparatusIds on stock (so a seeded/legacy rig
// with no roster row still shows, labeled from item.apparatus). Stock-setting is
// direct-Dexie behind the hooks; deploy/return touch available elsewhere.

const SYS_GROUPS: { system: System; label: string }[] = [
  { system: 'LongShore', label: 'Gold (LongShore)' },
  { system: 'AcmeThread', label: 'Grey (AcmeThread)' },
  { system: 'LockStroke', label: 'LockStroke' },
];

const collapsedOf = (model?: string) => STRUTS.find((s) => s.model === model)?.collapsed ?? 0;
const plateNameOf = (id?: string) => BASE_PLATES.find((p) => p.id === id)?.name ?? '';
const byCollapsed = (a: InventoryItem, b: InventoryItem) => collapsedOf(a.model) - collapsedOf(b.model);
const byLength = (a: InventoryItem, b: InventoryItem) => (a.length ?? 0) - (b.length ?? 0);
const byPlateName = (a: InventoryItem, b: InventoryItem) => plateNameOf(a.plateId).localeCompare(plateNameOf(b.plateId));

export function InventoryScreen() {
  const items = useInventory();
  const { roster, add: addApparatus, remove: removeApparatus } = useApparatus();
  const actions = useInventoryActions();
  const op = useOperation();

  const rigs: ScopeRig[] = useMemo(() => {
    const byId = new Map<string, ScopeRig>();
    for (const a of roster) byId.set(a.id, { id: a.id, name: a.name, count: 0 });
    for (const i of items) {
      const r = byId.get(i.apparatusId) ?? { id: i.apparatusId, name: i.apparatus, count: 0 };
      r.count += 1;
      byId.set(i.apparatusId, r);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [roster, items]);

  const [selected, setSelected] = useState<string | null>(null);
  const [addEquipOpen, setAddEquipOpen] = useState(false);
  const [addApparatusOpen, setAddApparatusOpen] = useState(false);

  // The selection self-heals if the chosen rig is removed.
  const activeId = selected && rigs.some((r) => r.id === selected) ? selected : rigs[0]?.id ?? null;
  const activeRig = rigs.find((r) => r.id === activeId) ?? null;
  const rigItems = useMemo(() => items.filter((i) => i.apparatusId === activeId), [items, activeId]);

  const addApparatusModal = (
    <AddApparatusModal
      open={addApparatusOpen}
      onClose={() => setAddApparatusOpen(false)}
      onAdd={async (name, type) => {
        const a = await addApparatus(name, type);
        setSelected(a.id);
      }}
    />
  );

  if (rigs.length === 0) {
    return (
      <div className="fs-inv">
        <EmptyState
          variant="first-run"
          headline="No apparatus yet"
          reason="Add an apparatus to start stocking struts, extensions, and plates."
          action={{ label: 'Add apparatus', onPress: () => setAddApparatusOpen(true) }}
        />
        {addApparatusModal}
      </div>
    );
  }

  return (
    <div className="fs-inv">
      <header className="fs-inv-header">
        <h1 className="fs-inv-title">Inventory</h1>
        <ImportExport
          opActive={op != null}
          exportCsv={actions.exportCsv}
          templateCsv={actions.templateCsv}
          onImport={actions.importCsv}
        />
      </header>

      <ApparatusScopeTabs rigs={rigs} value={activeId!} onChange={setSelected} />

      <div className="fs-inv-actions">
        <Button variant="primary" onPress={() => setAddEquipOpen(true)}>
          Add equipment
        </Button>
        <Button variant="secondary" onPress={() => setAddApparatusOpen(true)}>
          Add apparatus
        </Button>
      </div>

      {rigItems.length === 0 ? (
        <>
          <EmptyState
            variant="first-run"
            headline={`No equipment on ${activeRig?.name ?? 'this rig'}`}
            reason="Add the struts, extensions, or plates this apparatus carries."
            action={{ label: 'Add equipment', onPress: () => setAddEquipOpen(true) }}
          />
          <div className="fs-inv-remove">
            <Button
              variant="tertiary"
              destructive
              onPress={() => {
                void removeApparatus(activeId!);
                setSelected(null);
              }}
            >
              Remove {activeRig?.name}
            </Button>
          </div>
        </>
      ) : (
        <div className="fs-inv-list">
          {SYS_GROUPS.map((g) => {
            const struts = rigItems.filter((i) => i.type === 'strut' && i.system === g.system).sort(byCollapsed);
            const exts = rigItems.filter((i) => i.type === 'extension' && i.system === g.system).sort(byLength);
            if (struts.length === 0 && exts.length === 0) return null;
            return (
              <section key={g.system} className="fs-inv-group">
                <h2 className="fs-inv-group-label">{g.label}</h2>
                {[...struts, ...exts].map((i) => (
                  <EquipmentRow key={i.id} item={i} onIncrement={actions.increment} onDecrement={actions.decrement} />
                ))}
              </section>
            );
          })}
          {(() => {
            const plates = rigItems.filter((i) => i.type === 'plate').sort(byPlateName);
            if (plates.length === 0) return null;
            return (
              <section className="fs-inv-group">
                <h2 className="fs-inv-group-label">Connector Plates</h2>
                {plates.map((i) => (
                  <EquipmentRow key={i.id} item={i} onIncrement={actions.increment} onDecrement={actions.decrement} />
                ))}
              </section>
            );
          })()}
        </div>
      )}

      <AddEquipmentSheet
        open={addEquipOpen}
        onClose={() => setAddEquipOpen(false)}
        apparatusId={activeId!}
        apparatusName={activeRig?.name ?? ''}
        items={rigItems}
        onAdd={(spec) => actions.addOne(spec)}
      />
      {addApparatusModal}
    </div>
  );
}
