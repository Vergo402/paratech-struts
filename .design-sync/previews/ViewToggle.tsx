import { ViewToggle } from 'fieldshore-v4';

// ViewToggle (#356) — the List ↔ Status-tiles switcher for the Operations board.
// Phone (the preview default): ONE square button showing the icon of the view
// you'll switch TO. Desktop: a two-button radio pair, the selected one lit.

export const ListSelected = () => (
  <ViewToggle value="list" onChange={() => {}} />
);

export const TilesSelected = () => (
  <ViewToggle value="lanes" onChange={() => {}} />
);
