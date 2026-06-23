import { Welcome } from 'fieldshore-v4';

// Welcome — the stepped first-run intro (a Modal stop surface). Opens on its first
// slide ("Measure the opening") with the inline field diagram, body copy, the
// step-dots, and the Skip / Next footer. Always skippable. The component owns its
// own step state, so the card shows the opening slide it mounts on.

export const FirstRun = () => <Welcome onDone={() => {}} onSkip={() => {}} />;
