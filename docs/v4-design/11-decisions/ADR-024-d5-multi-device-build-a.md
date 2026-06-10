# ADR-024: D5 multi-device — Build A default in v4.0, Build C deferred to v5

> Architecture Decision Record. The Phase H ordering record for the D5 multi-device-no-comms problem: v4.0 ships **Build A** (accept-and-reconcile) only; **Build C** (CP hub / local relay) is a v5 React-Native unlock. **Refines** the older "v4.5" guess to v5 and **formalizes the D5 ordering** that [ADR-009](ADR-009-database-firebase-rtdb.md) left to Phase H. Closes board [#241](https://github.com/Vergo402/paratech-struts/issues/241).

---

## Status

- [x] Proposed

**Date:** 2026-06-09
**Author:** Claude Opus 4.8 (architect agent, drafting)
**Reviewer(s):** Alex — pending Phase H foundation mini-gate

---

## Context

D5 is the multi-device, no-comms problem: several devices work one incident with the WAN down for hours, then reconcile when it returns. Alex's framing names two builds — **Build A** (each device appends locally, queues, and reconciles through Firebase on reconnect) and **Build C** (a tablet/Toughbook at the command post hosts a local WebSocket relay on the scene SSID; other devices sync through the host until WAN returns). [ADR-009](ADR-009-database-firebase-rtdb.md) locked Firebase RTDB behind the `data/sync` seam with the event-sourced log and named the **D5 ordering as a Phase H decision** (its matrix row A-9, "Build A only"). The synthesis converged on Build-A-only for v4.0 (§1.7) and the choice was **confirmed at the Phase D gate (PR #282)**. This ADR is the ordering record [ADR-009](ADR-009-database-firebase-rtdb.md) deferred, pending the Phase H foundation mini-gate. It closes board [#241](https://github.com/Vergo402/paratech-struts/issues/241).

---

## Decision

**v4.0 ships Build A (accept-and-reconcile) only; Build C (CP hub / local relay) is deferred to v5.0 with React Native.** A PWA cannot bind a local IP and serve a WebSocket relay — hosting the hub is a React-Native unlock, not a v4 feature. The Build C Settings toggle is **shown but disabled, labeled "Coming with mobile app."** Build B (local mesh) stays dropped.

Build A's mechanics for v4.0:
- A **per-device Firebase anonymous UID**, persisted to IndexedDB at `fieldshore_auth_uid`, Firebase `LOCAL` persistence — the same per-device anon UID [ADR-009](ADR-009-database-firebase-rtdb.md) and [ADR-022](ADR-022-mutual-aid-v40-qr-guest.md) describe (one UID per device; provisioned members and guests both ride it — see Reconciliation below).
- **Storage moves `localStorage` → IndexedDB via Dexie** (the 5 MB localStorage cap is a real constraint at task-force scale).
- **Per-row sync state** on the Accountability screen (the PAR test case): synced / pending + freshness-on-tap. A global sync dot is not enough where staleness is life-safety.
- Reconciliation rides the **event-sourced append log** ([ADR-009](ADR-009-database-firebase-rtdb.md)): each device appends locally; on reconnect the outgoing queue flushes and incoming events merge; the v3.5.3 local-first contract, v3.9.0 `STATUS_ORDER` progression guard, v3.16.4 `offlineTouched` pipe, and the `/diagnostics/sync/` ledger all cross verbatim.

---

## Rationale

- **A PWA cannot host the relay** (synthesis §1.7; essay 01 §7). Build C needs a device to bind a local IP and serve WebSockets on the SSID; the browser sandbox forbids it. RN lifts that limit — so Build C is genuinely a v5 capability, not a deferred v4 feature.
- **Build A covers the real v4.0 incident.** Small departments, a handful of devices, hours of outage, reconcile on WAN return — Build A's accept-and-reconcile is exactly that shape, and it inherits the entire v3 offline-hardening investment with zero migration ([ADR-009](ADR-009-database-firebase-rtdb.md)).
- **The seam makes Build C a transport variant, not an application mode** (synthesis §1.7; essay 01 §7). Because every mutation is an event on the append log, Build C swaps the transport (host relay vs. Firebase) beneath the same reducers — the app above `data/sync` never learns which is on. Designing the seam now keeps the v5 add affordable.
- **"v5, not v4.5" is the correction.** The older roadmap guessed v4.5 for the hub (essay 01 §2 ramp); this ADR refines it to v5.0 because the hub and the RN shell are the same unlock and ship together. The shown-but-disabled toggle keeps the promise visible without overclaiming.

---

## Alternatives Considered

- **Ship Build C in v4.0 via WebRTC + QR fallback (data-resilience, essay 09).** Rejected/deferred (synthesis §1.7, §2.2): the WebRTC path is real, but iOS Safari mDNS limits and the QR-exchange UX are not v4.0 work; the hub is a v5 RN unlock.
- **Ship Build C in v4.0 via an Electron companion "Hub" app** (essay 01 §7 option 2). Rejected: the Electron tax to host the relay on a Toughbook for one build mode is more engineering than the v4.0 scope absorbs; RN gives the same hosting capability as part of v5's reason to exist.
- **Build B — local mesh (peer-to-peer, no host).** Stays dropped (synthesis §1.7): the host-relay model (Build C) is the chosen hub architecture; a hostless mesh adds conflict-surface without a matching field need.
- **Build A *and* C both in v4.0 behind the live toggle.** Rejected: the toggle's "C" side has no PWA implementation to enable — hence shown-but-disabled, not shipped-then-hidden.

---

## Consequences

**Positive:**
- v4.0 ships the offline model the everyday incident needs, inheriting v3's hardening verbatim with no migration.
- Per-row sync state on Accountability closes the PAR staleness gap a global dot leaves open.
- The event-log seam keeps Build C a v5 transport add, not a v5 rewrite.

**Negative:**
- The large/connectivity-poor incident that wants a CP hub waits for v5 — the shown-but-disabled toggle is the honest placeholder, not a capability.
- Build A's path-level last-write-wins still rides on the event log absorbing field-level edits; if field tests surface a loss the log doesn't catch, [ADR-009](ADR-009-database-firebase-rtdb.md)'s Supabase + PowerSync second choice is the escape hatch.

**Neutral:**
- Storage moving `localStorage` → IndexedDB (Dexie) is independent of Build A vs. C but ships in this same v4.0 cutover.

---

## Related

- **Principles:** 8 (local-first — the in-app record is authoritative; reconcile, don't block), 10 (visible state, not a push — per-row sync state surfaces; no notification when a peer syncs).
- **Other ADRs:** [ADR-009](ADR-009-database-firebase-rtdb.md) (**parent** — Firebase RTDB, the `data/sync` seam, the event-sourced log, IndexedDB/Dexie; this ADR is its D5-ordering record), [ADR-022](ADR-022-mutual-aid-v40-qr-guest.md) (the per-device anon UID — provisioned members and guests both ride one device UID; consistent here), [ADR-006](ADR-006-reserved-schema-fields.md) (the event-sourced append model these reservations and this reconciliation share), [ADR-025](ADR-025-authentication-implementation.md) (the provisioned-member identity on top of the same per-device UID).
- **Board issue closed:** [#241](https://github.com/Vergo402/paratech-struts/issues/241) — and its **D5 ordering** ([#7](../99-open-questions.md)) is the question this ADR settles.
- **Open questions resolved:** [#7](../99-open-questions.md) (D5 A-vs-C ordering → A default v4.0, C at v5.0).
- **Synthesis:** §1.7 (Build A only; C deferred), §2.2 (the skeptic's Build-C-to-v5 deferral accepted), §4 Offline/sync.

---

## Notes

This ADR refines two older guesses to one date: the roadmap's "v4.5 hub" (essay 01 §2) and the synthesis's occasional "v4.5+" phrasing both resolve to **v5.0**, because the hub and the RN shell are the same unlock. The reconciliation that [ADR-009](ADR-009-database-firebase-rtdb.md) describes (append, flush, merge by the event log) is unchanged — this ADR only fixes *which build ships when* and the storage/UID/per-row-sync specifics that ride Build A. Build C's seam (event log + reducers + projections) is designed in v4.0 even though the transport is not built, so v5 adds a transport, not an architecture.
