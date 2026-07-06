import { STRUTS, BASE_PLATES } from '@core/load';
import { Badge } from '@ui/primitives';
import type { InventoryItem } from '@core/schema';

// One stock row (craft.md): identity + 3px depletion bar + one status chip, and the
// hero-numeral count (available dominant, "/ total" as the quiet denominator). The
// stepper is plain buttons (the Button primitive has no aria-label hook) carrying
// explicit labels + the current count in an aria-live region (40-inventory.md
// §Accessibility, Principle 9). − is disabled when every unit is out.

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
  const out = item.quantity > 0 && item.available === 0;
  const low = !out && item.available > 0 && item.available * 3 <= item.quantity;
  const pct = item.quantity > 0 ? Math.round((item.available / item.quantity) * 100) : 0;
  return (
    <div className="fs-inv-row">
      <div className="fs-inv-row-id">
        <span className="fs-inv-row-label">{label}</span>
        {sub && <span className="fs-inv-row-sub">{sub}</span>}
        <span className="fs-inv-bar" aria-hidden="true">
          <i
            className={low ? 'fs-inv-bar-fill fs-inv-bar-fill--low' : 'fs-inv-bar-fill'}
            style={{ width: `${pct}%` }}
          />
        </span>
        {out ? (
          <span className="fs-inv-chip-out">all {item.quantity} deployed</span>
        ) : low ? (
          <Badge variant="dot" tone="accent" text="running low" />
        ) : (
          deployed > 0 && <Badge variant="dot" tone="accent" text={`${deployed} deployed`} />
        )}
      </div>
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
        <span
          className={out ? 'fs-inv-count fs-inv-count--out' : 'fs-inv-count'}
          aria-live="polite"
          aria-label={`${item.available} of ${item.quantity} available`}
        >
          <b>{item.available}</b>
          <span className="fs-inv-count-of" aria-hidden="true">
            /{item.quantity}
          </span>
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
