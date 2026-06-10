import { useInventory } from '@ui/hooks';
import { EmptyState } from '@ui/primitives';

/** Inventory stub — the real screen is Phase I; the count proves the data layer. */
export function InventoryScreen() {
  const inventory = useInventory();
  return (
    <EmptyState
      variant="upstream-blocked"
      headline="Inventory screen isn't built yet"
      reason={`${inventory.length} seeded items are loaded and feeding recommendations`}
    />
  );
}
