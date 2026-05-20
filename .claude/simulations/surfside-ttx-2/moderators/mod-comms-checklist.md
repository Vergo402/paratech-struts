# `mod-comms` Observation Checklist — Communications / Radio Traffic

> Reference: ICS-205 Incident Radio Communications Plan + ICS-205A Communications List (plan.md Appendix A); standard fireground radio terminology.
>
> **Mode:** silent observation. Notes appended to `notes/moderator-mod-comms-notes.jsonl`.

## Premise

The FieldShore app has **no radio-net concept today** — no ICS-205 representation, no Command Net / Tactical Net assignments, no apparatus-to-net mapping. Most `mod-comms` observations will be **NEW gap findings** rather than regressions. The moderator's job is to identify every moment in the live event where a radio call would be needed but the app doesn't help (or actively makes it harder).

## Checklist (10 items)

### Item 1 — Field labels match radio terminology
- **Observe:** When a participant creates an SP labeled "front side" or "north side", does the field accept it cleanly, or does it want "Division Alpha"? Radio standard: divisions are A/B/C/D, not compass directions.
- **Surface:** Add SP modal — Division field, Building field
- **v4.0.0 Phase:** **NEW** (terminology alignment)

### Item 2 — Apparatus naming radio-unique
- **Observe:** "Engine 1" and "Engine 8" are clear. But "TF-State-Rescue-A" and "TF-Fed-Alpha-Rescue-A" both contain "Rescue-A" — on the radio, ambiguity could be life-threatening. Does the app surface this naming overlap, or accept it silently?
- **Surface:** Add Apparatus modal; Inventory tab apparatus list
- **v4.0.0 Phase:** **NEW** (naming uniqueness validation)

### Item 3 — "Strut Placed" vs "strut set" terminology
- **Observe:** App status pill says "Strut Placed". Standard radio call from the field is "strut set" or "strut in". Does the participant naturally use the app's term, or do they have to translate?
- **Surface:** SP card status pill
- **v4.0.0 Phase:** **NEW** (terminology + radio-call alignment)

### Item 4 — Cut Table arm's-length legibility
- **Observe:** Cut Table is operated next to a running circular saw. Can the participant read the SP label, cut length, and shore type from ~3 feet away with reading glasses? (Approximate via preview_inspect for font-size CSS values + computed pixel size.)
- **Surface:** Cut Table tab
- **v4.0.0 Phase:** **NEW** (arm's-length legibility)

### Item 5 — Quick Find result as one radio transmission
- **Observe:** A Quick Find result card communicates strut model + length + qty + capacity + margin. Can the participant transmit this as a single radio call? Or does the layout force multiple back-references? (Example call: "Pinecrest IC from Rescue 1, recommend LS 610 quantity 1, capacity 15000 at 85% margin, over.")
- **Surface:** Quick Find result cards
- **v4.0.0 Phase:** **NEW**

### Item 6 — Pending SP card explains "what's missing"
- **Observe:** When an SP is in `pending` status, can the participant tell at a glance WHY (waiting for strut delivery? waiting for cut? waiting for runner?). On the radio, a runner needs to know what to bring.
- **Surface:** SP card — pending state
- **v4.0.0 Phase:** **NEW** (clearer pending substate)

### Item 7 — ICS-205 representability
- **Observe:** ICS-205 Incident Radio Communications Plan = all radio frequencies/talkgroups per OP. Is there any place in the app to assign Command Net / Tactical Net / Support Net frequencies?
- **Surface:** (None visible — flag as absent)
- **v4.0.0 Phase:** 3D / **NEW**

### Item 8 — Command Net / Tactical Net assignment per role
- **Observe:** Each ICS leader should know which net they monitor (IC → Command Net; OSC → Command + Tactical; Branch Directors → Tactical; Group Sups → Tactical + Support). Can the app capture this?
- **Surface:** Command tab — role detail (if exists)
- **v4.0.0 Phase:** **NEW**

### Item 9 — Status change cross-device announcement
- **Observe:** When SP-093 advances to "Cutting", does another device (a second preview tab running as a different participant) get an audible/visible notification? Or does the change only show on refresh / scroll?
- **Surface:** Operations tab — multi-tab simultaneous view (use preview_eval to open second tab if possible)
- **v4.0.0 Phase:** **NEW** (push notifications absent in v3.x — planned for v5.2.0)

### Item 10 — 24h timestamps everywhere
- **Observe:** Fireground radio log is 24h time (e.g., 0145, 1430). Does the app display 12h or 24h? Inconsistent display causes radio-log transcription errors.
- **Surface:** All tabs — timestamp displays
- **v4.0.0 Phase:** **NEW** (24h enforcement)

---

## Radio-traffic-shadow log (continuous during event)

In addition to per-item observations, `mod-comms` maintains a parallel "radio-traffic-shadow" log capturing every moment in the live event where a radio call would naturally be made. Format:

```json
{"ts":"E+HH:MM","wallclock":"...","op":N,"participant":"<id>","radio_call_imagined":"<one-sentence call as it would be made>","app_supports_call":"yes|partial|no","gap_severity":"low|med|high|critical"}
```

This shadow log is separate from the main observation file (`notes/moderator-mod-comms-radio-shadow.jsonl`). It's the input to the "Hotwash Q4 — what should the app announce on its own?" synthesis question.

Example shadow log entries:

```json
{"ts":"E+0:30","wallclock":"...","op":1,"participant":"ic-op1","radio_call_imagined":"Pinecrest IC from BC McAllister, command transferred from Capt. Reyes at 0149, copy?","app_supports_call":"partial","gap_severity":"med"}
{"ts":"E+5:00","wallclock":"...","op":2,"participant":"osc-op2","radio_call_imagined":"All units from Ops, TF-State now on Operations, switch Tactical to TG-12, ack","app_supports_call":"no","gap_severity":"high"}
```

## Calibration anchors

- ICS-205 = per-OP radio plan; Comms Unit Leader prepares
- ICS-205A = full directory of methods of contact (radio, phone, pager)
- ICS-213 = General Message — written radio messages requiring hardcopy
- Standard fireground radio = brevity + named recipient ("X from Y") + clear request + acknowledgment
- "Sterile cockpit" rule during critical moments — radio traffic limited to mission-essential
- NIMS Type II/III communications nets typically split: Command Net (IC + Cmd Staff + Section Chiefs), Tactical Nets (per Branch / Division / Group), Support Net (Logistics + Finance)
