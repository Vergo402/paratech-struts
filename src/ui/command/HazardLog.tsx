import { useEffect, useMemo, useState } from 'react';
import type { Hazard, HazardSeverity, HazardType } from '@core/hazard';
import { openHazardsBySeverity, severityWord } from '@core/hazard';
import { newId } from '@core/id';
import { Badge, Button, Card, EmptyState, Sheet, TextField } from '@ui/primitives';
import { commitHaptic } from '@ui/primitives/haptics';
import { BottomSheetPicker, InlineSegmented } from '@ui/picker';
import { useCommit, useDeviceUid, useDeviceUidValue, useHazards, useOperation, usePermissions, useUserManager } from '@ui/hooks';
import { download } from '@ui/util/download';
import { clock } from '@ui/util/time';

// The ICS-208 hazard register (#394, 09-workflows/21-hazard-log.md). Make hazards
// VISIBLE to everyone, BLOCKING to no one (Principle 10): any role adds via a
// sheet; the list sorts by severity (open first, mitigated to the bottom); Safety
// mitigates/reopens; the record exports as an ICS-208. No safety-hold — the SP-card
// badge (OperationsBoard) informs the slide-to-advance, it never gates it.
// All data plumbing (schema/events/reducer/sort/attribution) is pre-built; this is
// the UI. Renders both as the desktop Command-Deck pane and inside the phone Sheet.

// Display labels — the Add picker and the register rows share these. The full
// names live here (the schema stores the enum).
const TYPE_OPTIONS: { value: HazardType; label: string }[] = [
  { value: 'structural', label: 'Structural instability' },
  { value: 'utility', label: 'Utility' },
  { value: 'atmospheric', label: 'Atmospheric' },
  { value: 'fall', label: 'Fall' },
  { value: 'other', label: 'Other' },
];
const TYPE_LABEL = Object.fromEntries(TYPE_OPTIONS.map((o) => [o.value, o.label])) as Record<HazardType, string>;

const SEVERITY_OPTIONS = [
  { value: 'low' as const, label: 'Low' },
  { value: 'medium' as const, label: 'Medium' },
  { value: 'high' as const, label: 'High' },
];

/** RFC-4180 cell: quote only when it must (comma, quote, newline). */
function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function HazardLog() {
  const hazards = useHazards();
  const operation = useOperation();
  const myUid = useDeviceUidValue();
  // Names for the reporter / mitigator (the mockup's "Reported · {who}"). Mirrors the
  // Audit Log: the members read is manageUsers-gated (a non-admin never fires a denied
  // read), so admins see names; everyone else falls back to You / a teammate. The uid
  // is still captured on the record either way (#394, Alex 2026-06-29).
  const canReadMembers = usePermissions().manageUsers;
  const { members } = useUserManager(canReadMembers);
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');

  const sorted = useMemo(() => openHazardsBySeverity(hazards), [hazards]);
  const open = sorted.filter((h) => h.mitigatedAt == null);
  const mitigated = sorted.filter((h) => h.mitigatedAt != null);
  const total = sorted.length;

  // Live detail target — re-derived from the store so mitigate/reopen update the
  // open sheet in place (the button flips Mitigate ⇄ Reopen without reopening).
  const detail = detailId != null ? (hazards[detailId] ?? null) : null;

  const who = (uid: string | undefined) =>
    (uid ? members?.[uid]?.displayName : undefined) ?? (uid && uid === myUid ? 'You' : 'A teammate');

  function exportIcs208() {
    const header = ['Type', 'Location', 'Severity', 'Status', 'Reported', 'Reported by', 'Mitigated', 'Mitigated by'];
    const body = sorted.map((h) => [
      TYPE_LABEL[h.type],
      h.location,
      severityWord(h.severity),
      h.mitigatedAt != null ? 'Mitigated' : 'Open',
      new Date(h.reportedAt).toLocaleString(),
      h.reportedBy,
      h.mitigatedAt != null ? new Date(h.mitigatedAt).toLocaleString() : '',
      h.mitigatedBy ?? '',
    ]);
    const csv = [header, ...body].map((r) => r.map(csvCell).join(',')).join('\r\n');
    const name = (operation?.name ?? 'operation').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    download(`ICS-208-hazards-${name}.csv`, csv);
  }

  return (
    <div className="fs-haz">
      <p aria-live="polite" className="fs-sr-only">{announce}</p>

      {/* Add Hazard leads — the view's one gold. Export ICS-208 (an admin/records
          action) sits at the END as a quiet button, not above the primary (#434). */}
      <Button variant="primary" size="operational" fullWidth onPress={() => setAddOpen(true)}>
        Add Hazard
      </Button>

      {total === 0 ? (
        <EmptyState
          variant="all-clear"
          headline="No hazards logged"
          reason="The incident is clear. Add a hazard the moment you spot one."
        />
      ) : (
        <>
          <section className="fs-haz-sec" aria-label="Open hazards">
            <h3 className="fs-haz-sec-title">Open ({open.length})</h3>
            {open.length === 0 ? (
              <p className="fs-haz-none">None open — all hazards mitigated.</p>
            ) : (
              open.map((h) => <HazardRow key={h.id} hazard={h} who={who} onOpen={() => setDetailId(h.id)} />)
            )}
          </section>

          {mitigated.length > 0 && (
            <section className="fs-haz-sec is-mitigated" aria-label="Mitigated hazards">
              <h3 className="fs-haz-sec-title">Mitigated ({mitigated.length})</h3>
              {mitigated.map((h) => (
                <HazardRow key={h.id} hazard={h} who={who} onOpen={() => setDetailId(h.id)} />
              ))}
            </section>
          )}
        </>
      )}

      <div className="fs-haz-foot">
        <Button variant="tertiary" onPress={exportIcs208} disabled={total === 0} disabledReason="No hazards to export">
          Export ICS-208
        </Button>
      </div>

      <AddHazardSheet
        open={addOpen}
        opId={operation?.id ?? null}
        onClose={() => setAddOpen(false)}
        onAdded={(label) => setAnnounce(`Hazard added. ${label}.`)}
      />
      <HazardDetailSheet
        hazard={detail}
        opId={operation?.id ?? null}
        who={who}
        onClose={() => setDetailId(null)}
        onAnnounce={setAnnounce}
      />
    </div>
  );
}

function HazardRow({
  hazard: h,
  who,
  onOpen,
}: {
  hazard: Hazard;
  who: (uid: string | undefined) => string;
  onOpen: () => void;
}) {
  const mitigated = h.mitigatedAt != null;
  return (
    <Card onPress={onOpen} className={`fs-haz-row${mitigated ? ' is-mitigated' : ''}`}>
      <span className="fs-haz-row-head">
        {mitigated ? (
          <span className="fs-haz-cleared">CLEARED</span>
        ) : (
          <Badge variant="severity">{severityWord(h.severity)}</Badge>
        )}
        <span className="fs-haz-row-type">{TYPE_LABEL[h.type]}</span>
      </span>
      <span className="fs-haz-row-loc">{h.location}</span>
      <span className="fs-haz-row-meta">
        {mitigated
          ? `Mitigated ${clock(h.mitigatedAt!)} · ${who(h.mitigatedBy)}`
          : `Reported ${clock(h.reportedAt)} · ${who(h.reportedBy)}`}
      </span>
    </Card>
  );
}

function AddHazardSheet({
  open,
  opId,
  onClose,
  onAdded,
}: {
  open: boolean;
  opId: string | null;
  onClose: () => void;
  onAdded: (label: string) => void;
}) {
  const commit = useCommit();
  const getUid = useDeviceUid();
  const [type, setType] = useState<HazardType>('structural');
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState<HazardSeverity>('medium');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType('structural');
      setLocation('');
      setSeverity('medium');
      setNotes('');
      setError(null);
      setSaving(false);
    }
  }, [open]);

  const add = async () => {
    const loc = location.trim();
    if (!opId || !loc || saving) return;
    setSaving(true);
    setError(null);
    const uid = await getUid();
    const at = Date.now();
    const note = notes.trim();
    const res = await commit({
      type: 'HazardLogged',
      id: newId(),
      opId,
      at,
      by: uid,
      hazard: {
        id: newId(),
        type,
        location: loc,
        severity,
        ...(note ? { notes: note } : {}),
        reportedBy: uid,
        reportedAt: at,
      },
    });
    setSaving(false);
    if (res.ok) {
      commitHaptic();
      onAdded(`${severityWord(severity)}, ${TYPE_LABEL[type]}, ${loc}`);
      onClose();
    } else {
      setError('Could not add the hazard. Try again.');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add Hazard">
      <div className="flex flex-col gap-4">
        <BottomSheetPicker label="Type" options={TYPE_OPTIONS} value={type} onSelect={setType} />
        <TextField
          label="Location"
          value={location}
          onChange={(v) => {
            setLocation(v);
            if (error) setError(null);
          }}
          placeholder="NE corner, Div 2"
          helper="Where it is. Enter just a Division number (e.g. 2) to also flag that Division's shore-point cards."
          error={error ?? undefined}
        />
        <InlineSegmented label="Severity" options={SEVERITY_OPTIONS} value={severity} onChange={setSeverity} />
        <TextField label="Notes (optional)" value={notes} onChange={setNotes} multiline rows={3} maxLength={2000} />
        <Button
          variant="primary"
          size="operational"
          onPress={() => void add()}
          disabled={saving || !location.trim()}
          disabledReason="Enter a location"
        >
          {saving ? 'Adding…' : 'Add Hazard'}
        </Button>
      </div>
    </Sheet>
  );
}

function HazardDetailSheet({
  hazard: h,
  opId,
  who,
  onClose,
  onAnnounce,
}: {
  hazard: Hazard | null;
  opId: string | null;
  who: (uid: string | undefined) => string;
  onClose: () => void;
  onAnnounce: (msg: string) => void;
}) {
  const commit = useCommit();
  const getUid = useDeviceUid();
  const [busy, setBusy] = useState(false);

  const mitigated = h != null && h.mitigatedAt != null;

  const toggle = async () => {
    if (!h || !opId || busy) return;
    setBusy(true);
    const uid = await getUid();
    const res = await commit({
      type: mitigated ? 'HazardReopened' : 'HazardMitigated',
      id: newId(),
      opId,
      at: Date.now(),
      by: uid,
      hazardId: h.id,
    });
    setBusy(false);
    if (res.ok) {
      commitHaptic();
      onAnnounce(mitigated ? 'Hazard reopened.' : `Hazard mitigated. Marked by ${who(uid)}, ${clock(Date.now())}.`);
    }
  };

  return (
    <Sheet open={h != null} onClose={onClose} title={h ? TYPE_LABEL[h.type] : 'Hazard'}>
      {h && (
        <div className="fs-haz-detail">
          {mitigated ? (
            <span className="fs-haz-cleared">CLEARED · {severityWord(h.severity)}</span>
          ) : (
            <Badge variant="severity">{severityWord(h.severity)}</Badge>
          )}
          <p className="fs-haz-detail-loc">{h.location}</p>
          {h.notes ? <p className="fs-haz-detail-notes">{h.notes}</p> : null}
          <p className="fs-haz-detail-meta">
            Reported {clock(h.reportedAt)} · {who(h.reportedBy)}
          </p>
          {mitigated && (
            <p className="fs-haz-detail-meta">
              Mitigated {clock(h.mitigatedAt!)} · {who(h.mitigatedBy)}
            </p>
          )}
          <Button
            variant={mitigated ? 'secondary' : 'primary'}
            size="operational"
            fullWidth
            onPress={() => void toggle()}
            disabled={busy}
          >
            {mitigated ? 'Reopen hazard' : 'Mitigate hazard'}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
