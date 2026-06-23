import { WarningGate } from 'fieldshore-v4';
import { useState } from 'react';

// WarningGate — the persistent safety disclosure. One primitive, three uses:
// unrated zone (deployable WITH explicit ack), over capacity (deploy closed),
// and the standing liability disclaimer. Rides the result; no timer, no dismiss.

export const Unrated = () => {
  const [ack, setAck] = useState(false);
  return (
    <div style={{ width: 340 }}>
      <WarningGate use="unrated" acknowledged={ack} onAcknowledge={() => setAck((a) => !a)} />
    </div>
  );
};

export const UnratedAcknowledged = () => {
  const [ack, setAck] = useState(true);
  return (
    <div style={{ width: 340 }}>
      <WarningGate use="unrated" acknowledged={ack} onAcknowledge={() => setAck((a) => !a)} />
    </div>
  );
};

export const OverCapacity = () => (
  <div style={{ width: 340 }}>
    <WarningGate use="over-capacity" />
  </div>
);

export const Disclaimer = () => (
  <div style={{ width: 340 }}>
    <WarningGate use="disclaimer" />
  </div>
);
