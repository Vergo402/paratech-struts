# qa-driver instructions (#251)

#251 verification pass for one FieldShore v4 workflow spec. Repo /Users/alex/Developer/paratech-struts/fieldshore, branch v4-redesign. Do not edit any source file and run no git commands that change state.

Read first, in this order:
1. `.claude/audits/phase-j/251-verify/HARNESS.md` — launch, two-device, evidence and verdict rules. Follow it exactly.
2. `.claude/audits/phase-j/251-verify/<NN>/BRIEF.md` — setup, the Testable criteria, the Superseded/Deferred table, the risks list, and any "Orchestrator note" at the end (those notes override the table above them).
3. `.claude/audits/phase-j/251-verify/05/REPORT.md` header — how the spec-05 pass ran the harness (Playwright persistent profiles per origin, drive scripts in the session scratchpad). Reuse that approach.

Drive every Testable criterion in the real app on the emulator harness (:5200), phone viewport 390x844 unless the criterion says otherwise. Do criteria that need heavy setup (active operation, deployed stock, a second account) last unless the brief orders otherwise. Use a fresh department named "QA Dept <NN>" and accounts `qa251-<NN>-<n>@example.test`.

Verdict rules, in addition to HARNESS.md:
- Only PASS / FAIL / SPEC-DRIFT / NOT-BUILT.
- Criteria the brief or an orchestrator note marks Deferred are not driven; list them under "Deferred, not driven".
- Where the brief says "record as DIVERGENCE" or expects drift: SPEC-DRIFT if the brief's Superseded table or a code comment you can cite names the change; otherwise FAIL and mark "(copy/minor)" in Proof.
- If a criterion cannot be set up, give the closest verdict and explain in Proof; don't invent a verdict.
- Take a console baseline mark before the first load, and give every "never happens" check a positive control that shows your observer would have caught it.
- Screenshots: `.claude/audits/phase-j/251-verify/<NN>/shots/`, numbered.

Final message: the full report between `=====REPORT-BEGIN=====` and `=====REPORT-END=====` (format in HARNESS.md), then a summary under 150 words: verdict counts and each FAIL / NOT-BUILT in one line. Stop the dev server and emulators you started.
