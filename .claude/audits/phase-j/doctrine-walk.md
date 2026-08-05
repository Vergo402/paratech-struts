# Phase J Doctrine-Deviation Walk — 2026-07-28

Sign-off review of the 7 rows in `98-design-docket.md` §Doctrine deviation watch.
Run on the main loop (Fable); each row verified against the artifact the docket cites,
not the docket's own claim. **Verdict: PASS — all 7 deviations are deliberate,
Alex-blessed, and recorded where claimed. No silent divergence found.**

| # | Deviation | Recorded where | Verified |
|---|---|---|---|
| 1 | Assign Equipment renders as a centered modal, not a sheet (#346, deviates ADR-016) | Doc-comment `AssignEquipmentSheet.tsx:19` ("center-anchored MODAL popup (Alex's call — the bottom sheet read poorly…)") + docket row | ✅ |
| 2 | Floating draggable panel — 16th primitive (ADR-037) | `ADR-037-floating-draggable-panel.md` + `03-primitives/floating-panel.md` + doc-comment `FloatingPanel.tsx:6` | ✅ |
| 3 | Phone press-and-hold/drag org reparent, additive (#367) | `31-org-chart.md:23` amendment block — AT-cannot-drag contract explicitly unchanged, "Move…" buttons stay the floor | ✅ |
| 4 | ShorePointCard compaction — strut/source off the face | `card.md:62,131` amendment blocks (value-bar fold, detail line retired, cutting stays cut-length-only) | ✅ |
| 5 | Single-device command-transfer accept (#401) | `ADR-021` Addendum (line 151) + workflow doc takeover states | ✅ |
| 6 | Grouped re-measure overrides the #220 field-lock (D2, #417) | `reducer.ts:245-273` doc-comments (grouped exception + lock) + `handleSaveEdit(confirmed = false)` confirmation gate | ✅ |
| 7 | 4-digit accept code on named-target transfers (#425) | `ADR-021` Addendum 2 (line 179) + workflow doc lines 254-300 + `TransferCommand.tsx:104` comment. Radio-rule fit: the code rides the verbal handshake (spoken over radio/face-to-face), no in-app comms channel created — consistent with Principle 10 | ✅ |

## Notes (non-blocking)

- **Doc nit:** `ADR-016-modal-vs-sheet-rules.md` itself carries no cross-reference to the
  #346 deviation — the record lives in the component doc-comment and the docket. Adding a
  one-line "known deviations" note to ADR-016 would make the ADR self-contained. Cosmetic;
  not a gate condition.
- Row 6 is the only deviation that touches safety-adjacent behavior (sizing edits on
  deployed legs). Its honesty depends on the re-verify path — covered by the #417 fix and
  in scope for the #260 SME audit's real-engine check.
