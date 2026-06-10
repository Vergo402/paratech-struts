# Phase G Gate Review — Independent Verification

**Date:** 2026-06-09 · **Branch:** `v4-redesign` · **Reviewers:** the same 8-person panel that raised the original findings, each re-checking only the items they personally flagged against the current design docs.

> **✅ UPDATE — gate now CLEAR (2026-06-09).** The two open items from the first pass (M8 Block, M12 Partial) were fixed and **re-verified RESOLVED by the officers who raised them** (independent re-checks against the updated files — Brunner on M8, Okonkwo on M12). See **§6 — Re-verification**. With those closed, **every blocker is Resolved and every deferral Accepted; zero Not-resolved / Block remain.** The §1 "not clear to sign yet" below records the *first*-pass state and is left intact for the audit trail.

---

## 1. Bottom line

**NOT clear to sign yet — one must-fix-now blocker remains (M8), plus one half-resolved item (M12).** Everything else the panel raised is either confirmed fixed in the docs or formally accepted as a Phase-H deferral. Of the eight reviewers, six signed off clean; two raised concerns. The single hard blocker is small but real: the **display-name capture** (the human name attached to every audit-log entry and signed attestation) is still parked as a "we'll figure it out later" assumption — but the accountability features that depend on it ship in v4.0. If that name field isn't locked as a mandatory step before those features are built, the audit log ships attributing actions to a device code (`FF (device-abc123)`) instead of a person. Lock that one decision and the gate is clean.

The good news: **every command-tier blocker about command transfer, the empty hand-off brief, the inventory foot-gun, mutual-aid records, and bulk crew onboarding is confirmed resolved in the docs.** The doctrine spine — no automatic pages, no software lockout that stops a firefighter from acting — survived every change intact.

---

## 2. Verdict matrix

| Verifier | Finding | Kind | Verdict | One-line reason |
|---|---|---|---|---|
| BC Reyes (IC) | B1 command transfer (two ICs or none) | encoded | **Resolved** | Outgoing IC keeps command + End-Op authority until the incoming IC accepts — never zero, never two ICs. |
| BC Reyes (IC) | M3 End-Op inventory foot-gun | encoded | **Resolved** | Modal names the count and the "short for the next call" cost; warns without blocking. |
| BC Reyes (IC) | Hazard→SP card matching | encoded | **Resolved** | Conservative Division-level match; never badges the wrong card — falls back to log + header. |
| BC Reyes (IC) | M1 PAR indicator in command chrome | deferred | **Accept-deferral** | Capability exists (Accountability screen); only the glanceable shortcut defers to Phase H. |
| DC Okonkwo (US&R) | B3 multi-agency unified record at v4.0 | encoded | **Resolved** | Cross-dept sharing, QR join, guest path, merged roll-up all ship v4.0 (ADR-022). |
| DC Okonkwo (US&R) | M12 audit-log gaps at scale | encoded | **Partial** | Roll-up fixed to v4.0, but only ICS-201 committed (rest "likely later") and no operational-period filter. |
| DC Okonkwo (US&R) | B1 cross-dept (assisting) incoming IC | encoded | **Resolved** | Same retain-until-accept handshake explicitly extended to an out-of-dept assisting IC. |
| DC Okonkwo (US&R) | M3 unreturned-equipment warning | encoded | **Resolved** | One-sentence modal naming count + inventory-shortfall, ships v4.0, informs without blocking. |
| DC Okonkwo (US&R) | M2 per-Division SitStat roll-up | deferred | **Accept-deferral** | Data exists (every SP has a Division); only the command-picture roll-up view defers to Phase H. |
| AC Brunner (Training) | B4 bulk onboarding code | encoded | **Resolved** | One-time 24h code retired; multi-use, regenerable, revocable code admits the whole crew. |
| AC Brunner (Training) | B5/M5 checklist editor + content = v4.1 | deferred | **Accept-deferral** | Deferral fully disclosed in UI + ADR; authoring decision locked, not vague. |
| AC Brunner (Training) | **M8 mandatory display-name capture** | deferred | **Block** | Audit log + signed attestations ship v4.0 and attribute to display-name, but the name is only a Phase-H "working assumption" — accountability layer ships broken if unlocked. |
| AC Brunner (Training) | M9 User-Manager UI ship version | deferred | **Accept-deferral** | Governance bones (model, rules, anti-lockout, first-Admin) are v4.0; only the editor UI render-timing is open. |
| Capt. Marchetti (Shoring) | B6 plain Advance/Step-back buttons + off-axis step-back | deferred | **Accept-deferral** | Commitment written + tracked (#37, near-must); pixel/affordance work proper to the slice. |
| Capt. Marchetti (Shoring) | M4 ⅛″ measurement + Division as gloved tap targets | deferred | **Accept-deferral** | Scroll-wheel ban + big tap targets written into #38/#20; form geometry belongs in the slice. |
| Capt. Marchetti (Shoring) | M7 over-capacity card visually unmistakable | deferred | **Accept-deferral** | Deploy path already closed on over-capacity; only the visual loudness defers to #40. |
| Lt. Whitfield (Cutting) | B6 slide-button danger | deferred | **Accept-deferral** | Resolution principle written (#37); only pixel geometry defers — slide stays primary. |
| Lt. Whitfield (Cutting) | M10 cutting-station next-cut marker | deferred | **Accept-deferral** | Landing already specced; explicit NEXT/#1 badge is a slice-level card affordance (#44). |
| Lt. Whitfield (Cutting) | M11 sync attention-grab without push | deferred | **Accept-deferral** | Count badge + persistent red-slash, respects no-push; motion/badge treatment (#45). |
| Lt. Whitfield (Cutting) | M14 tablet-primary saw deck | deferred | **Accept-deferral** | Phone-only fully works; tablet-primary is a surface-priority note (#46). |
| Lt. Whitfield (Cutting) | Cutting-station design intact | encoded | **Resolved** | Promoted cut-length, capacity hidden, two-step done/send, red-slash all intact. |
| Lt. Soto (Engine) | B6 buttons beside the slide (not just AT) | deferred | **Accept-deferral** | Everyone-button + off-axis step-back locked (#37); directions already hard opposites. |
| Lt. Soto (Engine) | Cutting group/individual split clarity | encoded | **Resolved** | Split signposted at every layer — role, screen title, card prints "[1/3] — now individual." |
| Lt. Soto (Engine) | Guest-first cold-open + Quick Find intact | encoded | **Resolved** | No auth wall in the path; Quick Find change was a presentation demote only. |
| Lt. Nair (Rescue) | Hazard→SP matching + no-safety-hold | encoded | **Resolved** | Conservative fallback + advance slide never gated; "badge informs, never blocks." |
| Lt. Nair (Rescue) | B5/M5 checklist + briefing content = v4.1 | deferred | **Accept-deferral** | Structure ships v4.0; only approved wording defers — safer than shipping un-sourced doctrine. |
| Lt. Nair (Rescue) | Briefing attach-target (per-Group/task) | encoded | **Resolved** | Scoped per-Group/per-task, not op-wide — preserves multi-Group accountability. |
| Gate reviewer (BC, ICS-300/400) | B1 command-transfer handshake | encoded | **Resolved** | Outgoing-retains invariant doctrinally sound; offline-stranding removed; no timed mechanic. |
| Gate reviewer | B2 ICS-201 brief not empty | encoded | **Resolved** | Six live auto-pulled datums; never a complete-looking blank; narrative fields defer honestly. |
| Gate reviewer | M13 task-checklist attach-target | encoded | **Resolved** | Per-Group/per-task binding prevents two supervisors attesting one tree. |
| Gate reviewer | Integrity — Principle 10 no-push | encoded | **Resolved** | Join/transfer are visible states on sync, never alerts; no comms channel introduced. |
| Gate reviewer | Integrity — no safety-hold | encoded | **Resolved** | Checklist records-not-blocks; span-of-control advisory; timed auto-accept rejected. |

---

## 3. Open items — must-fix-now and not-fully-resolved

### Block (must fix before the gate can sign)

**M8 — Mandatory display-name capture is unlocked (AC Dale Brunner, Training & Safety)**

- **What's wrong:** The per-device-ID model, the audit log, and every signed attestation all ship in v4.0 — and all three attach the firefighter's **display name** to each entry. But the display-name field itself is still only a Phase-H "working assumption (at account creation)," not a locked, mandatory onboarding step (`99-open-questions.md` row 41).
- **Why it blocks:** If the name capture is still an open TBD when the v4.0 accountability layer is built, the audit log ships attributing actions to a device code — `FF (device-abc123)` — instead of a human. Brunner's words: that "guts accountability." Every signed-attestation governance win this gate is selling depends on the name being mandatory and present.
- **What fixes it:** Promote display-name capture from a Phase-H assumption to a **locked, mandatory onboarding decision NOW** — settle the capture point (e.g. at account creation) and mark it required — before the v4.0 audit/attestation model is built. This is a small decision, not new design work.

### Not fully resolved (Partial — should be closed or consciously accepted)

**M12 — Audit-log completeness at scale (DC Angela Okonkwo, US&R/MCI)**

- **What's fixed:** The merged multi-agency audit roll-up is genuinely pulled forward to v4.0 (only the export *format* remains Phase H).
- **What's still open — two prongs:**
  1. **Which ICS forms actually render in v4.0** is unresolved — only ICS-201 is committed; 203/207/208/209 are "likely later (v4.1)." Step 3 of the audit-log spec describes assembling all five, but the open question keeps all but 201 deferred. That is the exact "captured it but can't export the form yet" gap she flagged.
  2. **No operational-period filter** — the audit-log scope can be segmented by All / user / action / time, but there is no first-class operational-period axis for multi-day incident review.
- **What would fully resolve it:** Either commit a defined ICS-form set for v4.0 (or state plainly which forms a v4.0 user can and cannot export), and decide whether the operational-period filter is in-scope for v4.0 or a conscious Phase-H deferral. Right now it sits between the two.

---

## 4. Deferrals accepted (Phase-H-tracked, signed off by the officers)

These are tracked in `99-open-questions.md` and the relevant ADRs; the officer who raised each one agreed it is genuinely slice/affordance/roadmap work, not a missing capability — provided it actually lands in the Phase-H vertical slice and isn't quietly dropped.

- **M1 (Reyes)** — Glanceable PAR / pending-rows indicator in the command chrome (#39). Accountability screen already runs a PAR; only the at-a-glance shortcut defers.
- **M2 (Okonkwo)** — Per-Division / per-Group SitStat roll-up view at scale (Q#43). Data exists on every SP; this is a command-picture aggregation. *Standing condition: must land in the slice, not slip to v4.1.*
- **B5 / M5 (Brunner, Nair)** — Checklist editor + FieldShore baseline/TCRM content = v4.1 (ADR-020, #25). Structure ships v4.0; only approved wording defers. Disclosed in-UI.
- **M9 (Brunner)** — User-Manager management UI ship version (#32). Governance model, rules, Default role, anti-lockout, creator-is-first-Admin all v4.0; only the editor UI render-timing is open.
- **B6 (Marchetti, Whitfield, Soto)** — Plain Advance/Step-back buttons beside every slide on the phone (not just assistive tech), with step-back moved off-axis (#37, flagged near-must). Slide stays primary.
- **M4 (Marchetti)** — ⅛″ measurement + Division as big gloved tap targets, no spinners/scroll-wheels (#38/#20). Scroll-wheel ban written in.
- **M7 (Marchetti)** — Over-capacity Deploy card made visually unmistakable (#40). Deploy path already physically closed; only the visual loudness defers.
- **M10 (Whitfield)** — Cutting-station explicit NEXT/#1 cut marker (#44). Landing already specced; badge is slice work.
- **M11 (Whitfield)** — Sync attention-grab: count badge + persistent red-slash, respecting no-push (#45).
- **M14 (Whitfield)** — Tablet-primary posture note for the saw deck (#46). Phone-only fully works; surface-priority annotation only.

---

## 5. Doctrine integrity — did no-push / no-safety-hold survive?

**Yes — verified clean by the doctrine-aware gate reviewer (BC, ICS-300/400). Zero regression.**

- **No-push (Principle 10) survived intact.** Across ADR-021 (command transfer), ADR-022 (mutual aid), and both workflows, joining an incident and command-transfer-pending are **visible states surfaced on sync** — a joined-units list and audit-log events, a pending badge on the incoming IC's surface — never an alert, page, or message. No in-app comms channel was introduced anywhere. The cast-to-board QR is a rendered image with no interactive control.
- **No safety-hold survived intact.** Nothing in the new scope hard-stops a firefighter from acting. The IC command checklist explicitly **records, does not block**; span-of-control is advisory ("the IC may exceed it"); a guest can work the incident in seconds with no provisioning gate; and a **timed auto-accept / auto-revert on command transfer was explicitly rejected** because a timer is a de-facto safety-hold. The hazard badge "informs, never blocks" — the advance slide is never gated.

Both load-bearing doctrines came through the Phase-G changes without a scratch.

---

## 6. Re-verification (after the two fixes) — 2026-06-09

The two open items were fixed at the spec level and re-checked by the officers who raised them, each
independently re-reading the updated files.

**M8 — display-name → RESOLVED (AC Brunner).** Promoted from a Phase-H assumption to a **locked v4.0
requirement**: a **required Display name field at account creation** ([`06-signing-in-and-out.md`](06-signing-in-and-out.md)
§Display name — "the form will not submit without it," can never be empty); **guests** attributed by their
**required unit tag** at incident join; 99-OQ #41 moved to Resolved. Brunner: *"the v4.0 audit log will
attribute to a person or a named unit, never to a bare device code. Block lifted."*

**M12 — audit completeness → RESOLVED (DC Okonkwo).** The **v4.0 export set is committed** —
**ICS-201 + ICS-208 + PAR snapshot + raw event-log CSV** (what auto-assembles from held data); **ICS-203 /
207 / 209 = v4.1**; the raw CSV always covers the underlying data. **Operational period** added as a
**first-class v4.0 filter axis** for multi-day / mutual-aid review. Stated identically in
[`31-audit-log-review.md`](31-audit-log-review.md) Step 3 and [`53-audit-log.md`](../08-information-architecture/53-audit-log.md).
Okonkwo: *"the 'between the two' ambiguity is gone… a field user now knows exactly what comes out formatted
versus as raw CSV."*

**Final tally:** 18 Resolved · 13 deferrals Accepted · **0 Not-resolved · 0 Block.** The gate is clear to sign.
