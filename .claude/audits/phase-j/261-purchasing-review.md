# Phase J Gate #261 — Purchasing Officer Review (independent, validates the BC review)

**Reviewer stance:** chief from another department, purchasing-officer hat. I did not write
`.claude/audits/phase-j/261-battalion-chief-field-review.md` — I'm treating it as a vendor-supplied
demo report and validating it against the spec (`docs/v4-design/`), the shipped source (`src/`), and
the screenshot evidence (`.claude/audits/phase-j/261-shots/`) before recommending a buy.

## Verdict: BUY WITH CONDITIONS

The core fireground loop (Quick Find → deploy → cutting → runner → secured → command transfer →
offline tolerance) is real, well-built, and the BC review's praise for it holds up under my own check
of the source and screenshots. I would sign for a **single-department, single-incident** deployment
today. I would **not** sign for anything that assumes multi-agency mutual aid, exportable after-action
paperwork beyond raw CSV, or any claim about behavior at Surfside scale (4 task forces, 440+
personnel, 36 hours) — none of that has been built or exercised. Conditions below are the gate for
those claims, not for the core loop.

**Conditions to close before I'd extend this beyond one department's own incidents:**
1. Either ship the mutual-aid / cross-department invite flow (workflow 32) that ADR-022 says
   already ships in v4.0, or correct the record — right now the spec says "ships v4.0" and zero of it
   is built.
2. Either ship the ICS-201/208/PAR assembled export (Audit Log spec, Step 3) that the doc calls a
   "v4.0 committed set," or correct the record — only raw CSV exists.
3. Either wire the after-action auto-email (ADR-018, described as "on by default") to something that
   sends mail, or turn the toggle off by default so it doesn't imply a capability that isn't there.
4. Run the BC review's own §5 Verify-in-TTX list for real — multi-device transfer, realistic elapsed
   time, span-of-control badge, sync race, hazard dedup on concurrent multi-device — before I'd trust
   this at more than a handful of devices.

None of this is a knock on what shipped — it's a knock on what's being *claimed* has shipped. See
§4 for what's genuinely good.

---

## 1. Does the evaluation support a purchase decision? — No, not on its own

The BC review is honest about its own scope (§5, "Verify-in-TTX list") and I credit it for that — it
explicitly flags 7 things "stills and specs can't settle." But as a purchasing document handed to me
cold, its fixture is materially narrower than what my department would need to see:

- **Scale.** 3 apparatus, 4 shore points, 1 division, one incident named "Meadowville Warehouse
  Collapse." The project's own reference scale (`.claude/simulations/surfside-ttx-2/` per this
  session's brief) is 4 task forces, 440+ personnel, 36 hours. Nothing in the 17-shot set (not 16 —
  I count 17 PNGs plus the driver script) touches multi-task-force integration, dozens of concurrent
  shore points, or a multi-division board under real load. The By-Division board (Concern 3) is a
  span-of-control instrument that was never actually tested with more than one division.
- **Single device, throughout.** Every transfer screenshot (`phone-transfer-1.png`,
  `phone-transfer-2.png`) shows the outgoing side only — there is no second-device screenshot of the
  incoming IC accepting. The BC review says this outright (§5.1). I would not accept a vendor demo
  of a *two-party handshake* that never shows the second party.
- **Simulated, not real, offline.** `phone-offline.png` shows the banner state; it does not show a
  status change made offline reconciling against a conflicting remote write on reconnect (§5.4). For
  an app whose single most load-bearing safety claim is "the phone still works when the tower is
  down," that's the one test I'd insist on before relying on it during a real signal-loss window.
- **Dark theme only, one device class (phone) plus a thin desktop pass.** No light/"sunlight" theme in
  the shot set (the codebase has 4 themes per `ADR-010–013`) — irrelevant to safety, relevant to a
  daytime-outdoor legibility acceptance check I'd still want to run myself.
- **Zero coverage of mutual aid, accountability audit trail beyond one device, User Manager, or Audit
  Log.** These are exactly the areas my questions (multi-agency integration, accountability, admin
  overhead) are aimed at, and the fixture never opens any of those screens. See §2 for what I found
  going to source instead.
- **Training burden unaddressed.** There is no practice/sandbox mode to hand a 55-year-old captain
  before a live incident — this is a **deliberate scope decision**, not an oversight
  (`CLAUDE.md` line 400: "marketing site + demo mode **dropped**"). I don't fault the product for the
  decision, but a purchasing evaluation that never mentions it is incomplete: my onboarding cost
  planning has to assume live-incident-only first contact, or a separately-run TTX like #262.
- **Data portability if the vendor disappears is untested and only partially built.** Inventory
  round-trips via CSV (`src/ui/inventory/ImportExport.tsx`); the Audit Log exports CSV
  (`src/ui/admin/AuditLogScreen.tsx:135-137`). But there's no full department export (roster, roles,
  historical operations, org structure) I could find — if FieldShore Inc. vanishes, I can rebuild my
  inventory from CSV and reconstruct incident timelines from raw event CSV, but I cannot walk away
  with a portable copy of my department's roster/roles/history in one action.
- **Device loss mid-incident** is answered for the *IC role specifically* (single-device command
  transfer accept, deviation #401, `ADR-021` Addendum) but not for personnel generally — there's no
  evidence of a "someone's phone died, hand them a spare and they resume their position" flow being
  built or tested outside command.
- **Per-seat admin overhead** is the one area the fixture-free source check reassured me on — see §4.

**Bottom line on Q1:** the review is honest within its scope and useful as a UX pass, but it cannot
support a purchase decision by itself. It never opened the three screens (mutual aid, User Manager,
Audit Log) my actual acceptance test would start with, and its multi-device/scale claims are
unverified by its own admission.

---

## 2. Product completeness vs. its own paper

I sampled the IA specs (`docs/v4-design/08-information-architecture/`) and workflow specs
(`docs/v4-design/09-workflows/`) against `src/ui/` and the 261-shots. Findings below exclude the 7
doctrine deviations already ruled in `doctrine-walk.md` (I re-read that file — all 7 are legitimately
closed, not re-flagging).

### Missing entirely: mutual-aid / cross-department incident sharing (workflow 32, IA 52)

`docs/v4-design/09-workflows/32-mutual-aid-invite-accept.md` and
`docs/v4-design/08-information-architecture/52-cross-dept-invite.md` are fully specced — QR generate,
human-readable-code fallback, cast-to-broadcast-board, provisioned-dept Member join, walk-up Guest
join with typed unit tag, host revoke, merged multi-agency audit rollup. `ADR-022` states this
**"ships v4.0"** and was explicitly "pulled forward from the earlier v4.5 deferral."

I grepped `src/` for every term this spec uses (`unit tag`, `assisting unit`, `guestJoin`,
`joinIncident`, `Cast to board`, `CrossDeptInvite`, `MutualAid`, `GuestJoin`) — **zero matches.**
There is no code implementing this workflow at all. This is precisely the multi-agency integration
capability a mutual-aid buyer cares about most, and it's vaporware relative to the spec's own claim.
This is not on the doctrine-deviation list, so it isn't a ruled/blessed gap — it's an open one.

### Built, and better than spec in places: User Manager (workflow 30) + Audit Log (workflow 31)

`src/ui/admin/UserManagerScreen.tsx` and `src/ui/admin/AuditLogScreen.tsx` are real, substantial
implementations — Members/Roles segmented scope, ~8-toggle role editor
(`src/ui/admin/RoleEditorSheet.tsx`), anti-lockout (last-Admin can't be revoked/demoted, enforced in
UI with inline error surfacing, not a silent fail — `actThenRefresh` pattern), revoke with reactivate,
starter-password provisioning and reset with forced device sign-out, CSV bulk personnel import. This
exceeds what the spec strictly requires (spec left member CSV export as "Phase I concern" — the build
shipped bulk *import* which is arguably the harder/more useful direction). **Genuine strength.**

The Audit Log ships the Incident/Administrative two-view split, scope segmented (all/action/person +
period), inline filter, CSV export. This matches the spec's IA closely.

**Gap against the same spec:** Step 3 of `31-audit-log-review.md` calls the v4.0-committed export set
"raw event-log CSV **+ ICS-201 + ICS-208 + PAR snapshot**, from data the app already holds, with no
new authoring" — stated as decided at "gate review M12," not deferred. `AuditLogScreen.tsx`'s
`onExport` (line 135-137) calls `auditRowsToCsv` only. There is no PDF/ICS-201/ICS-208/PAR assembly
anywhere I could find in `src/core/audit/` or `src/ui/admin/`. For a shift-transfer or after-action
paperwork use case, this is a real gap between the spec's "committed, not deferred" language and what
ships.

### Missing: after-action auto-email (ADR-018)

The spec says this is "records-only · on incident-complete · to IC/Operations · on by default,
department-disableable." The build has exactly one piece of it: a boolean policy toggle
(`src/data/store/deptPoliciesStore.ts`, `afterActionEmail`, defaulting `true`). I found no mail-sending
code anywhere in the repo (grepped for `sendMail`, `nodemailer`, `sendgrid`, any Cloud Function email
call) — nothing sends. A department that leaves this default "on" (which is every department, since
it's on-by-default) is being told a report goes out that never does.

### Verified-in-source: Concern 5 refutation — technically right, buyer risk survives

The gate adjudication (appendix table, row 5) calls Concern 5 "MOSTLY REFUTED" — the drawer
distinguishes deliberate "None" from unrecorded, and the reachable-with-unset-connectors path is
"by design" (ADR-010 always-advance). I re-checked the actual screenshot
(`phone-quickview.png`): shore point #1, status **Cutting Station**, "Top Connector — not selected ·
N/S" and "Bottom Connector — not selected · N/S," both in red, "Estimated load —". This is the live
post-Phase-J-fix build, not a stale artifact — it's in the same `261-shots/` set the gate decision
record says was "re-captured from the live seeded scene... post-fix app." So the underlying condition
the BC review raised is confirmed *currently reproducible*, not hypothetical or fixture-only. See §3.

---

## 3. The five findings + fixes — do they close the risk, or paper over it?

| # | BC concern | Fix shipped | My read as buyer |
|---|---|---|---|
| 1 | Safety Officer not persistent outside Command | `IncidentChips.tsx`, always-render `SafetyOfficerChip` on Operations/Cutting header | **Closes the risk.** Verified in gate record as re-screenshotted and matched to approved mockup; this was the correct fix for a real cross-cutting spec rule (C-6) the build had silently dropped. |
| 2 | HIGH hazard below the fold on phone Command | Spec amended (ruling), persistent header hazard chip added | **Closes the risk**, and I'd note this is the one item where the fix *improved the spec itself* rather than just conforming to it — good process. |
| 3 | By-Division headers = unlabeled dots | Text abbreviation + legend restored | **Closes the risk.** This was a genuine accessibility/color-only regression (`SitStatRollup.tsx:105` comment records the legend's prior deliberate removal in #434) — worth noting this is the *second* time an already-approved a11y requirement was cut and had to be restored; I'd ask the vendor what process prevents a third recurrence. |
| 4 | Transfer picker excludes apparatus | Apparatus candidates added, sourced from same roster as org chart | **Closes the risk.** Verified via source (`TransferCommand.tsx`) — core needed no changes, apparatus refs were already valid through the event schema; this was a UI-only gap, now closed and ordered rigs-first per Alex's own operational reasoning ("personnel change on rigs all the time; rigs stay pretty consistent") — a sound call. |
| 5 | Quick View "N/S" connectors on a cut leg | **No fix — refuted, TTX watch item** | **Does not close the risk; correctly not claimed to.** I want to be precise here: the adjudication is honest that it's "no fix," not "fixed." But as a buyer I'd push harder than the gate record does — the drawer *cannot currently tell a shift-transferring officer* whether "not selected" means "genuinely no connector on this leg" or "nobody ever recorded it," and the screenshot proves this state is reachable in the shipped build at Cutting Station, which is downstream of two prior status gates (equipment-assigned, strut-set) that plausibly should have prompted connector selection. I would not accept "by design, always-advance" as a full answer without also seeing what "always-advance" is protecting against — advancing without recording is a legitimate field reality (crew moves fast, records later), but the *read surface* owes the hour-nine reader more than a bare red "N/S" with no distinction from an intentional "None." This stays open as a real finding, not paper-over — it's correctly on the TTX list, not correctly closed. |

**Net:** 4 of 5 close cleanly and I'd trust the fixes on the evidence (source + re-screenshot, not
just claim). #5 is honestly left open by the gate record itself — I'm not contradicting the
adjudication, I'm saying a purchasing sign-off shouldn't treat "refuted" as "resolved" for a
data-completeness question that bites hardest exactly at the 12-hour shift transfer this evaluation's
own framing cares about.

---

## 4. What's good enough to sign for

- **The core deploy → cutting → runner → secured lifecycle is real, tested, and matches its spec.**
  I verified the Operations/Cutting screenshots against `20-operations.md`/`21-cutting-station.md` and
  the UI holds up — card density, status board, always-advance/always-reversible slide pattern.
- **Offline tolerance is the single most important claim and it's not oversold.** Calm banner,
  Transfer Command stays live, nothing gates the app on connectivity — this is architecturally sound
  (event-sourced RTDB projection, `ADR-009`) and consistent between spec and what I can see built.
- **The command-transfer handshake is the right model and correctly implemented.** Two-party,
  outgoing-retains-until-accept, no no-IC state — I checked `TransferCommand.tsx` directly, not just
  the screenshot, and the apparatus-candidate fix (Concern 4) is real and traced to the same roster
  source as the org chart, not a bolted-on list.
- **User Manager is a genuine strength for per-seat admin overhead.** Bulk CSV import, starter
  passwords with forced-change, reactivate-not-just-revoke, anti-lockout enforced with an inline
  reason (not a dead silent block) — an admin standing up a 30-member roster isn't hand-typing each
  one, and losing access doesn't mean losing the audit trail.
- **The Audit Log's immutability model is correctly built, not just claimed.** Read-only, no edit/
  delete path anywhere in `AuditLogScreen.tsx`, before→after detail on tap, CSV export that "records
  an export event, changes no record" per spec — this is the right posture for a legal/after-action
  record, even though the assembled-PDF half of the export promise (§2) isn't there yet.
- **The org chart's "what do I have and where is it" view is real accountability, not a promise.**
  Available rigs sit next to assigned apparatus inline with position — I'd trust this over a paper
  org chart at hour nine.
- **The four fixes from this gate (#487–#490) were verified against source and re-screenshots, not
  self-reported** — the gate record shows 1510/1510 tests, typecheck, lint, and a re-capture checked
  against approved mockups. That's a defensible verification discipline, and it's why I trust items
  1–4 in §3 more than I'd trust a vendor's word alone.

---

## Item count

- **Broken / incomplete (spec says v4.0, not built):** 3 — mutual-aid/cross-dept invite (workflow 32,
  IA 52); Audit Log assembled PDF export (ICS-201/208/PAR, spec step 3); after-action auto-email send
  mechanism (ADR-018).
- **Open risk, correctly unresolved (not paper-over, but not closed either):** 1 — Concern 5, Quick
  View connector "N/S" honesty at Cutting Station.
- **Unverified by the fixture, needs a real acceptance test before scale trust:** 5 — multi-device
  transfer handshake; realistic elapsed-time rendering; span-of-control badge at 6-7+ reports; sync
  race on reconnect during a slide-to-advance; concurrent multi-device hazard logging + dedup. (These
  mirror the BC review's own §5 list; I'm independently endorsing that list as the right acceptance
  checklist, not just repeating it.)
- **Confirmed fixed and verified (source + re-screenshot):** 4 — Safety Officer persistent chip,
  hazard-chip placement, By-Division text headers + legend, Transfer apparatus candidates.
- **Genuine strengths (buyer-relevant, verified against source):** 6 — see §4.

*Files referenced: `docs/v4-design/09-workflows/32-mutual-aid-invite-accept.md`;
`docs/v4-design/08-information-architecture/52-cross-dept-invite.md`;
`docs/v4-design/09-workflows/30-user-management.md`;
`docs/v4-design/09-workflows/31-audit-log-review.md`;
`docs/v4-design/08-information-architecture/51-user-manager.md`;
`docs/v4-design/08-information-architecture/53-audit-log.md`;
`src/ui/admin/UserManagerScreen.tsx`; `src/ui/admin/AuditLogScreen.tsx`;
`src/ui/admin/RoleEditorSheet.tsx`; `src/ui/command/TransferCommand.tsx`;
`src/data/store/deptPoliciesStore.ts`; `src/ui/inventory/ImportExport.tsx`;
`.claude/audits/phase-j/261-shots/*.png`; `.claude/audits/phase-j/261-battalion-chief-field-review.md`;
`.claude/audits/phase-j/doctrine-walk.md`; `CLAUDE.md` (demo-mode-dropped, line 400).*
