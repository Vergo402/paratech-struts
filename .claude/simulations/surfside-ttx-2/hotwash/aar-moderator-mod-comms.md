# AAR — Moderator `mod-comms` (Communications / Radio Traffic)

## Subject identification

- **Subject ID:** `mod-comms`
- **Role / Persona:** Moderator — Communications / Radio Traffic; reference ICS-205 (Incident Radio Communications Plan) + ICS-205A (Communications List) + standard fireground radio terminology
- **Active window:** E+0:00 → E+36:00 (full sim, silent observation + parallel radio-shadow log)
- **Submission date / wall-clock:** 2026-05-17

## Operational period(s) covered

OP1, OP2, OP3, OP4 — all four periods.

---

## Question 1 — What was supposed to happen?

The `mod-comms` framework rests on a single foundational claim: **FieldShore has no radio-net concept in v3.x.** The 10-item checklist is therefore not a regression hunt; it is a gap audit. The v4.0.0 hypothesis I came in with: the app will be operated alongside a real radio in a real major-incident context, and every moment where a participant has to translate an app state into a radio call (or vice versa) is friction we will be able to enumerate concretely. I expected the densest gap clusters around (a) ICS-205 representability (Item 7), (b) Net assignment per ICS role (Item 8), (c) terminology mismatch on SP status pills (Item 3), (d) 24-hour timestamp discipline (Item 10), (e) apparatus naming uniqueness across multi-agency TF caches (Item 2).

I expected the cmd transfers (5 across the sim) to produce ~5 "Pinecrest IC from X, command transferred at 0149" radio calls each with app-side gaps. I expected the OSC rotations (6 total), the Branch/Group/Unit escalations, the IST integration window (E+26:00 Hall + E+27:00 PSC Bauer), and the OP4 NWS heat advisory (E+28:00) + wind gust (E+22:00) + rain (E+24:30) to produce additional shadow-log entries that the app should ideally help originate or terminate. I also expected to flag the Surfside-specific naming collision risk (TF-State-Rescue-A, TF-Fed-Alpha-Rescue-A, TF-Fed-Bravo-Rescue-A, TF-Fed-Charlie-Rescue-A all sharing "Rescue-A") as a life-safety-class concern.

## Question 2 — What actually happened?

Across the 36 sim hours the parallel **radio-shadow log captured exactly 2 entries** — both pre-event scaffolding (`init` line and `baseline pre-event` line). The shadow log did not populate from E+0:03 forward as planned. This is itself the most important finding of my window: **the simulation runtime did not surface participant-side radio traffic to the moderators**, so I could not generate per-call shadow entries during driver execution. This is a runtime gap, but it lines up with a deeper truth — the app has nowhere to emit a "radio call" event, so the simulation had nothing to capture even if it tried. The radio dimension is invisible to the system end-to-end.

What I was able to confirm via static observation (9 entries in `moderator-mod-comms-notes.jsonl`) — every prediction held:

- **ICS-205 representability (Item 7):** Settings tab contains Department Connection, Theme, Apparatus Types, Data Management, Reference Materials, Logout. Zero radio plan / frequency / talkgroup / Net surface. Source grep for `radio|frequency|talkgroup|tactical net|ICS-205|comms` returned zero matches across `app.js` and `index.html`. Severity high. NEW gap.
- **24-hour timestamp discipline (Item 10):** `app.js` timestamp formatters (lines 3371, 3676, 3724, 3725) all use `Date.toLocaleString()` with browser default — which renders 12-hour AM/PM on `en-US` locale. Zero `hour12:false` calls anywhere in the codebase. Every cmd transfer, every status pill timestamp, every returned-equipment line in the activity feed displays in 12-hour. This is incompatible with fireground radio logs that are 24-hour by doctrine. Severity high. NEW gap.
- **Division field convention (Item 1):** `spDivision` (`index.html:387`) is free-text `<input type=text>` with placeholder `'e.g. A'` — accepts `'north side'`, `'front'`, `'rear-left'` indistinguishably. NIMS A/B/C/D is not enforced. Radio call "Division Charlie" can correspond to an SP card stored as "south side". Severity high. NEW gap.
- **Building label canonicalization (Item 1):** `spBuilding` (`index.html:382`) is also free-text. The same physical structure was reachable as "Pinecrest", "Pinecrest Tower", "Building A", "Tower", "Alpha". Severity medium.
- **Status terminology (Item 3):** `STATUS_LABELS` (`app.js:685-693`) shows `'Strut Placed'`. Standard radio call is `'strut set'` or `'strut in'`. `'In Process'` is ambiguous on the radio — cutting? assembling? deploying? Every participant who read a status pill onto a radio call had to translate. Severity medium.
- **Apparatus naming radio-uniqueness (Item 2):** at T-15 baseline, 38 apparatus loaded with no two sharing a base name — **but the 4 TF caches collide on the suffix "Cache" once the TF prefix is mentally stripped**. Across the OPs, TF-State (E+5:00 main body), TF-Fed-Alpha (E+14:00), TF-Fed-Bravo (later in OP3), and TF-Fed-Charlie all instantiated their internal apparatus under naming conventions like `Rescue-A`, `Search-A`, `Cache`, etc. **The "Rescue-A" token now overlaps 4 ways**, which on a real fireground radio net is a life-safety-class ambiguity (4 different teams answer when "Rescue-A" is called). The app does not validate apparatus-name uniqueness on insert. Severity high.
- **Command-Net / Tactical-Net / Support-Net assignment (Item 8):** the app has no dedicated Command tab in the bottom nav — `Command` renders as a sub-view inside Operations. There is no surface to bind a Net frequency or talkgroup to an ICS role; therefore there is nothing in the app that tells the OSC "you monitor Command and Tactical" or the Group Sup "you monitor Tactical-Charlie and Support". Severity high. NEW gap.

The **5 cmd transfers** (Reyes→McAllister E+0:09, McAllister→Park E+0:45, Park→Whitaker E+9:00, Whitaker→Vasquez E+21:00, Vasquez→Whitaker E+28:00) each conceptually produce a "Pinecrest IC from X, command transferred at HHMM, copy?" radio call followed by a Net-shift on Command Net. The app captured the role change in `roles` (subject to mod-data's role-history finding) but emitted no comms artifact — no `commandNet` field, no `talkgroup` field, no "transferred-on-frequency" log.

The **multi-agency on-scene state** (state TF + 3 federal TFs + local FD + IST = 5 agency communities) is the most under-supported comms scenario possible. There is no ICS-205 plan tooling, no per-agency Net assignment, no cross-Net relay UI, no shorthand for "switch to Tactical-Bravo for the Sector D entry".

## Question 3 — Why was there a difference?

The gap is doctrinal and structural, not a regression. The v3.x app was scoped to strut-selection and shoring-operation management. Radio + comms were always out of scope for v3.x — the audit trail (`.claude/audits/`) does not include comms as a finding cluster, and there is no v3.x release that touched a comms surface. The MASTER-PLAN Phase 3D scope mentions ICS-205 implicitly via ICS-forms-export, but does not stake out a comms-data-model. Phase 3C.1 (default ICS roles) does not include any radio-net binding.

The 12-hour timestamp default is the only finding here that is straightforwardly a bug: `Date.toLocaleString()` produces locale-dependent output and is unsuitable for a fireground tool. This should have been caught by Pass 4 (Accessibility / UX) in the v3.3.0 audit team but appears to have slipped.

The shadow log non-population is a simulation-runtime gap: participant driver subagents do not currently emit imagined-radio-call events to the moderator stream, so mod-comms cannot ride along on every call. Even if it could, the app's own activity feed does not represent radio calls, so the moderator and the app are reading from the same blind spot.

## Question 4 — What can we learn from it / what should change?

**App changes (concrete):**

1. **24-hour timestamps everywhere.** Replace all `Date.toLocaleString()` / `Date.toLocaleTimeString()` calls with explicit `{hour12: false}` formatters. Audit `app.js` lines 3371, 3676, 3724, 3725 at minimum. Tag: **NEW**. Severity: high.
2. **Add an ICS-205 / Comms Plan surface** per OP. Fields: Command Net frequency/talkgroup, Tactical Nets (per Branch / Division / Group), Support Net, Air-to-Ground, Emergency Traffic. Bind per ICS role. Tag: `Phase 3D` + **NEW**. Severity: high.
3. **Per-role Net assignment.** Each role in Command tab carries a `nets: []` array (e.g., IC = [Command]; OSC = [Command, Tactical]; Group Sup = [Tactical, Support]). Render under the role chip. Tag: **NEW**. Severity: high.
4. **Apparatus naming uniqueness validation.** On insert / rename, reject collisions on canonicalized base name (case-insensitive, trimmed) within an agency, and warn on cross-agency collision (TF-State-Rescue-A + TF-Fed-Alpha-Rescue-A both contain Rescue-A). Tag: **NEW**. Severity: high (life-safety class).
5. **Status pill terminology alignment.** Rename `'Strut Placed'` → `'Strut Set'`. Disambiguate `'In Process'` into `'Cutting'` / `'Assembling'` / `'Deploying'` sub-states. Tag: **NEW**. Severity: medium.
6. **Division field constraint.** Make `spDivision` a dropdown of A/B/C/D plus optional `notes` field for narrative compass/landmark detail. Tag: **NEW**. Severity: high.
7. **Building label canonicalization.** Make `spBuilding` a dropdown sourced from incident-defined buildings (added once at op start), not free text. Tag: **NEW**. Severity: medium.
8. **Cmd-transfer + role-change radio prompt.** When a participant commits a command transfer or major role change, render a one-line radio-script suggestion: "Pinecrest IC from [new], command transferred from [old] at [24h-time], copy?" Copy-to-clipboard button. Tag: **NEW**. Severity: medium.
9. **Activity feed records radio events.** When a status changes or a command transfer occurs, the activity feed entry includes a `radio_call` text + `net` field. Mod-comms shadow log becomes a derived view. Tag: **NEW**. Severity: medium.

**Simulation runtime changes:**

- Participant drivers should emit imagined-radio-call events to a moderator-readable stream so mod-comms can ride along on each.

**Doctrine / persona changes:**

- The v4.0.0 plan currently has no comms moderator deliverable in Phase 3. Recommend adding **Phase 3G — Communications Plan** as a new sub-phase scoped specifically to ICS-205 + per-role Net assignment + 24h discipline.

## Cross-reference

- **Linked notes:** `notes/moderator-mod-comms-notes.jsonl` lines 1–9; `notes/moderator-mod-comms-radio-shadow.jsonl` lines 1–2 (shadow log non-population is itself a finding)
- **Linked IAPs:** `iaps/iap-op1.md`, `iap-op2.md`, `iap-op3.md`, `iap-op4.md` (cmd transfers + OSC rotations cited)
- **Linked conductor-state events:** 5 cmd transfers, 6 OSC rotations, OP3 paper events (E+22 wind, E+24:30 rain), OP4 NWS heat advisory (E+28), TF integration boundaries (E+5:00 state, E+14:00 fed-alpha)

## Synthesis tags

```
tag: Add ICS-205 Comms Plan surface with Command/Tactical/Support Net frequencies per OP | phase: 3D | severity: high
tag: Per-role Net assignment array rendered under each ICS role chip | phase: new | severity: high
tag: Apparatus naming uniqueness validation including cross-agency collision warning | phase: new | severity: high
tag: 24-hour timestamps everywhere — eliminate Date.toLocaleString defaults | phase: new | severity: high
tag: SP Division field becomes A/B/C/D dropdown plus optional notes | phase: new | severity: high
tag: Status pill rename — Strut Placed → Strut Set, disambiguate In Process | phase: new | severity: medium
tag: Cmd-transfer radio-script suggestion with copy-to-clipboard | phase: new | severity: medium
tag: Activity feed records radio_call + net for every status change and role transition | phase: new | severity: medium
```
