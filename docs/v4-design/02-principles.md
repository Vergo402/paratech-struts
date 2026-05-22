# Design Philosophy: Eleven Principles

> Copied from Section I of `keen-whistling-pancake.md`. These are the constitution. Every downstream decision (component, screen, copy, color) is checked against them. Each principle has a "rejected alternative" so the trade-off is visible.

---

## 1. Defer to doctrine, not invention.

When NIMS / ICS / USACE specifies a term or a structure, the app uses it verbatim.

*Rejected:* clever rebranding for marketability.

---

## 2. Designed for the role, not the device.

Four surfaces, four roles:

- **Phone** the team officer in the building (Entry, Search, Rescue, Shoring). Watches the firefighters doing measuring, digging, cutting; communicates findings out to CP. Single canonical action, high contrast, glove friendly, sunlight readable.
- **Tablet (iPad)** the command post and the cutting table. IC reviews status, dispatches teams. Cutting table foreman manages the cut queue. Multi pane, info dense, drilldown visible.
- **Toughbook / laptop** the deep data CP role. ICS 201 worksheet, log review, after action assembly, role history audit. Multi column, exportable, keyboard first.
- **Large TV (passive)** screen share target from a tablet or laptop. Display only, never interactive. Designed for legibility at 8 to 12 feet so the entire CP can see one canonical board.

Every workflow has a story across these four surfaces.

*Rejected:* phone only design where tablet and laptop are afterthoughts, or desktop first dashboards with mobile bolted on.

---

## 3. Calm in chaos.

The app lowers cognitive load, doesn't add to it. No flashing reds, no anxious alarms, no excessive motion. Confident typography, controlled palette, measured animation.

*Rejected:* "tactical" red and black noise that mimics console games.

---

## 4. One canonical action per state.

The screen tells the user what to do next. Secondary actions live in disclosure, not in primary real estate.

*Rejected:* cluttered toolbars.

---

## 5. Doubt free defaults.

When the operator doesn't choose, the app picks the safest answer, never the most aggressive. Example: T Shore lumber selection stays manual because either 4×4 or 6×6 is defensible; defaulting is a doctrine violation.

*Rejected:* convenience defaults that hide a safety decision.

---

## 6. Doubt free escapes. Instead of "Are you sure?" modals, a brief reversibility window.

When the operator taps "Send Back" or "Mark Cut Done" or any state changing action, the app commits immediately AND surfaces a 5 second toast: *"Sent back. Undo (5s)"*. Tapping Undo within the window reverts the change. No confirmation modal blocks the flow. The user is never trapped, but also never asked to second guess.

*Rejected:* modal stacking. Apple has solved this with Mail's "Undo Send" and we adopt the pattern.

---

## 7. Visible safety.

Load capacity, deductions, warnings, and uncertainty are surfaced. Never collapsed below the fold, never hidden in a tooltip.

*Rejected:* clean dashboards that bury the math.

---

## 8. Local first, with sync realism.

The app works fully offline. Each device persists its own state and queues writes. Sync state is one quiet indicator, not a blocking modal.

**However:** there is a real architectural question about what happens when internet AND cell are down for hours and multiple teams need to coordinate inventory and shore point status across devices. See D5 in the plan. The decision (locked): build BOTH approach A (accept + reconcile) and approach C (CP hub). Departments choose which model fits their connectivity reality via Settings.

*Rejected:* cloud first apps that grey out when WiFi flickers.

---

## 9. No mystery meat.

Every glyph has a label or is universally recognized. Icon only buttons are forbidden in primary actions.

*Rejected:* minimalist icon grids that demand user training.

---

## 10. Respect the radio. FieldShore never carries life-safety communication.

The app supports radio comms; it does not replace them. Status changes are silent and asynchronous. No push notifications during active operations.

**The app must never become the channel for PAR checks, evacuation orders, mayday, or any other life safety signal. Those are radio, always.** This is a hard contract with the firefighter on the other end of the screen.

*Rejected:* chat features, in app messaging, push notification alarms, "Evac Now" buttons.

---

## 11. The app earns its place quietly.

No splash screens longer than 400 ms. No marketing in the product. No "tip of the day." No "tutorials" between the user and the work.

*Rejected:* onboarding flows that delay the IC reaching the shore-point list.

---

## Invocation rules

- **These principles are immutable after approval.** Changes require an ADR explaining what changed and why.
- **Every essay (Phase C) starts from these.** Agents may push back but must explicitly cite which principle they are challenging.
- **Every design decision (Phase E onward) must satisfy all 11.** If a design violates one, the design changes, not the principle.
- **The constitution is short on purpose.** If we keep adding principles, we have rules, not principles.
