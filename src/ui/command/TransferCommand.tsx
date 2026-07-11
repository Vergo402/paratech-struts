import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { OrgResourceRef } from '@core/schema';
import { currentIC, sameResource } from '@core/org';
import { Button, TextField, claimOverlay, releaseOverlay, isTopOverlay } from '@ui/primitives';
import { useOrg, useRoster } from '@ui/hooks';
import { useOrgCommit } from './useOrgCommit';
import { ICS201Brief } from './ICS201Brief';
import { BackChevronIcon, CheckIcon } from './icons';

/**
 * Transfer Command — the full-screen takeover (ADR-016: consequential enough to own the
 * screen, NOT a stacked modal). The outgoing IC names the incoming commander and
 * confirms; this INITIATES the two-party handshake (ADR-021) — command does NOT move
 * until the incoming accepts, so the outgoing IC stays IC of record meanwhile. Mirrors
 * OrgFullScreen's Radix Dialog + overlay-claim scaffold (focus trap, Esc, focus return).
 *
 * Recipients = people already on the org chart (individual/device refs, minus the
 * current IC) PLUS a type-a-name field that mints the incoming individual inline (the
 * ref rides the Initiated event; the reducer sets the IC leader to it on Accept — no
 * separate assignment). The brief is the live six-datum ICS-201 snapshot, derived, no
 * manual entry.
 */
// 4 digits, crypto-random, bias-free (256 % 10 ≠ 0, so use rejection-free scaling
// via two bytes per digit — overkill-simple: one byte, reject ≥250).
function mintClaimCode(): string {
  let out = '';
  while (out.length < 4) {
    const [b] = crypto.getRandomValues(new Uint8Array(1));
    if (b! < 250) out += String(b! % 10);
  }
  return out;
}

export function TransferCommand({ open, onClose }: { open: boolean; onClose: () => void }) {
  const positions = useOrg();
  const roster = useRoster(true); // department members (accounts), minus me
  const emit = useOrgCommit();
  const ic = currentIC(positions);

  const contentRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const claimRef = useRef(() => closeRef.current());

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const claim = claimRef.current;
    claimOverlay(claim, { container: () => contentRef.current, opener: openerRef.current });
    return () => releaseOverlay(claim);
  }, [open]);

  // Selected recipient (a roster pick) and the typed-name draft. A non-empty name wins,
  // so picking a roster row clears the draft and vice-versa.
  const [picked, setPicked] = useState<OrgResourceRef | null>(null);
  const [name, setName] = useState('');
  useEffect(() => {
    if (!open) {
      setPicked(null);
      setName('');
    }
  }, [open]);

  // Candidates: every assigned person across the org chart, deduped, minus the current IC.
  const candidates = useMemo(() => {
    const seen = new Set<string>();
    const out: OrgResourceRef[] = [];
    for (const p of Object.values(positions)) {
      for (const r of p.assignedResources) {
        if (r.ref !== 'individual' && r.ref !== 'device') continue;
        if (ic && sameResource(r, ic)) continue;
        const key = `${r.ref}:${r.value}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(r);
      }
    }
    return out;
  }, [positions, ic]);

  // Department members as account-ref targets (the #439 roster) — hand command to a
  // specific PERSON so it follows their account across devices. Drop the current IC and
  // anyone already listed above as an account on the chart (no duplicate row).
  const memberCandidates = useMemo(() => {
    const onChart = new Set(candidates.filter((c) => c.ref === 'account').map((c) => c.value));
    const icAcct = ic?.ref === 'account' ? ic.value : null;
    return roster
      .filter((m) => m.id !== icAcct && !onChart.has(m.id))
      .map((m) => ({ ref: 'account' as const, value: m.id, label: m.displayName }));
  }, [roster, candidates, ic]);

  const typed = name.trim();
  const toResource: OrgResourceRef | null = typed
    ? { ref: 'individual', value: typed, label: typed }
    : picked;

  const transfer = () => {
    if (!toResource) return;
    // #425 — individual/apparatus targets carry no uid, so the transfer mints a
    // 4-digit accept code: shown on THIS (outgoing) device, spoken with the
    // face-to-face/radio handoff, typed by the incoming commander to unlock
    // Accept/Decline. Device AND account targets are uid-verified (the accepting
    // account/device must match) — no code. Spread conditionally (RTDB rejects undefined).
    const claimCode = toResource.ref === 'device' || toResource.ref === 'account' ? null : mintClaimCode();
    emit({ type: 'CommandTransferInitiated', toResource, ...(claimCode ? { claimCode } : {}) });
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fs-scrim" />
        <Dialog.Content
          ref={contentRef}
          className="fs-xfer"
          aria-label="Transfer Command"
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => {
            if (!isTopOverlay(claimRef.current)) e.preventDefault();
          }}
          onCloseAutoFocus={(e) => {
            if (openerRef.current?.isConnected) {
              e.preventDefault();
              openerRef.current.focus();
            }
          }}
        >
          <div className="fs-xfer-head">
            <Dialog.Close asChild>
              <button type="button" className="fs-xfer-cancel" onPointerDown={(e) => e.stopPropagation()}>
                <BackChevronIcon /> Cancel
              </button>
            </Dialog.Close>
            <Dialog.Title className="fs-xfer-title">Transfer Command</Dialog.Title>
            <span className="fs-xfer-head-spacer" aria-hidden="true" />
          </div>

          <div className="fs-xfer-body">
            <div className="fs-xfer-current">
              <span className="fs-cmd-eyebrow">Current Incident Commander</span>
              <span className="fs-xfer-current-name">{ic?.label ?? 'Unassigned'}</span>
            </div>

            <span className="fs-cmd-eyebrow">Transfer command to</span>
            {candidates.length === 0 && memberCandidates.length === 0 ? (
              <p className="fs-cmd-roster-empty">No one else is assigned yet — type a name below.</p>
            ) : candidates.length === 0 ? null : (
              <ul className="fs-assign-list">
                {candidates.map((r) => {
                  const on = !typed && picked != null && sameResource(picked, r);
                  return (
                    <li key={`${r.ref}:${r.value}`}>
                      <button
                        type="button"
                        className={`fs-assign-row${on ? ' is-on' : ''}`}
                        aria-pressed={on}
                        onClick={() => {
                          setName('');
                          setPicked(r);
                        }}
                      >
                        <span className="fs-assign-name">{r.label}</span>
                        <span className="fs-assign-meta">
                          {on && (
                            <>
                              <CheckIcon /> selected
                            </>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {memberCandidates.length > 0 && (
              <>
                <span className="fs-cmd-eyebrow">Department members</span>
                <ul className="fs-assign-list">
                  {memberCandidates.map((r) => {
                    const on = !typed && picked != null && sameResource(picked, r);
                    return (
                      <li key={`account:${r.value}`}>
                        <button
                          type="button"
                          className={`fs-assign-row${on ? ' is-on' : ''}`}
                          aria-pressed={on}
                          onClick={() => {
                            setName('');
                            setPicked(r);
                          }}
                        >
                          <span className="fs-assign-name">{r.label}</span>
                          <span className="fs-assign-meta">
                            {on ? (
                              <>
                                <CheckIcon /> selected
                              </>
                            ) : (
                              'signed in'
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            <div className="fs-xfer-newname">
              <TextField
                label="Transfer to someone new"
                value={name}
                onChange={(v) => {
                  setName(v);
                  if (v.trim()) setPicked(null);
                }}
                placeholder="e.g. Chief Alvarez"
                size="standard"
              />
            </div>

            <ICS201Brief />
          </div>

          <div className="fs-xfer-foot">
            <Button variant="primary" size="standard" disabled={!toResource} onPress={transfer}>
              Hand over command
            </Button>
            {toResource && (
              <p className="fs-xfer-note">You keep command until {toResource.label} accepts.</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
