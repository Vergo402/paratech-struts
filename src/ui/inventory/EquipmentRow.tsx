import { STRUTS, BASE_PLATES } from '@core/load';
import { Badge } from '@ui/primitives';
import type { InventoryItem } from '@core/schema';

// One stock row: identity, a deployed-count badge (whenever quantity − available > 0
// — durable state, not op-gated, so the badge and the ± clamp read the SAME number),
// and the ± stepper. The stepper is plain buttons (the Button primitive has no
// aria-label hook) carrying explicit labels + the current count in an aria-live region
// (40-inventory.md §Accessibility, Principle 9). − is disabled when every unit is out.

export interface EquipmentRowProps {
  item: InventoryItem;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  /** Hide the ± stepper for a member without manageInventory — the count stays visible (read info). */
  readOnly?: boolean;
}

export function itemLabel(item: InventoryItem): { label: string; sub?: string } {
  if (item.type === 'strut') {
    const s = STRUTS.find((x) => x.model === item.model);
    return { label: item.model ?? 'Strut', sub: s ? `${s.collapsed}″–${s.extended}″` : undefined };
  }
  if (item.type === 'extension') return { label: `${item.length}″ extension` };
  return { label: BASE_PLATES.find((x) => x.id === item.plateId)?.name ?? 'Plate' };
}

export function EquipmentRow({ item, onIncrement, onDecrement, readOnly = false }: EquipmentRowProps) {
  const { label, sub } = itemLabel(item);
  const deployed = item.quantity - item.available;
  const canDecrement = item.available > 0;
  return (
    <div className="fs-inv-row">
      <div className="fs-inv-row-id">
        <span className="fs-inv-row-label">{label}</span>
        {sub && <span className="fs-inv-row-sub">{sub}</span>}
      </div>
      {deployed > 0 && <Badge variant="dot" tone="accent" text={`${deployed} deployed`} />}
      <div className="fs-inv-stepper">
        {!readOnly && (
          <button
            type="button"
            className="fs-inv-step"
            aria-label={
              canDecrement ? `Decrease ${label} quantity` : `Decrease ${label} quantity, none available`
            }
            aria-disabled={!canDecrement}
            disabled={!canDecrement}
            onClick={() => canDecrement && onDecrement(item.id)}
          >
            −
          </button>
        )}
        <span className="fs-inv-count" aria-live="polite" aria-label={`${item.available} of ${item.quantity} available`}>
          {item.available} / {item.quantity}
        </span>
        {!readOnly && (
          <button
            type="button"
            className="fs-inv-step"
            aria-label={`Increase ${label} quantity`}
            onClick={() => onIncrement(item.id)}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
