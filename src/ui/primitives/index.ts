// ui/primitives — the Phase-E primitive set (docs/v4-design/03-primitives/).
// Presentational + behavioral building blocks only: no @data imports ever
// (screens reach data through ui/hooks; primitives are fed by props).
import './primitives.css';

export { Badge, type BadgeProps } from './Badge';
export { Button, type ButtonProps } from './Button';
export { Card, type CardProps } from './Card';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export {
  fractionText,
  MeasurementValue,
  eighthsToParts,
  type MeasurementParts,
  type MeasurementValueProps,
} from './Measurement';
export { Modal, type ModalProps } from './Modal';
export { Segmented, type SegmentedProps, type SegmentedOption } from './Segmented';
export { Sheet, type SheetProps } from './Sheet';
export { Slider, shouldCommit, type SliderProps } from './Slider';
export { TextField, type TextFieldProps } from './Input';
export { Toggle, type ToggleProps } from './Toggle';
export { WarningGate, GATE_COPY, type WarningGateProps } from './WarningGate';
export { tapHaptic, commitHaptic } from './haptics';
export {
  claimOverlay,
  releaseOverlay,
  hasOverlayClaim,
  isTopOverlay,
  overlayContains,
  type OverlayClaimOptions,
} from './overlay';
