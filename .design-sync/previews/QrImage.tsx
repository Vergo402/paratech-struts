import { QrImage } from 'fieldshore-v4';

// QrImage — a scannable QR for a department invite code (ADR-022: QR-primary
// join). Always dark-on-white inside a white card so the scanner's contrast holds
// on any theme background. Just needs the code string to encode; the human-readable
// code rides beside it in the real screen.

// Default 176px square — the size shown in the "department is ready" sheet.
export const InviteCode = () => <QrImage value="FL-TF1-HAMD-4F2K" />;

// A smaller square — e.g. inline on a compact share card.
export const Compact = () => <QrImage value="MDFR-USAR-7Q3X" size={128} />;

// A larger square for projecting on a command-vehicle display.
export const Briefing = () => (
  <QrImage value="CA-TF2-RVSD-9KP2" size={224} label="Invite code for California Task Force 2" />
);
