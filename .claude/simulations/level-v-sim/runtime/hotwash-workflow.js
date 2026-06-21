export const meta = {
  name: 'level-v-hotwash',
  description: 'Level V sim hotwash: moderator lenses + persona AARs verified against source, then synthesize Pearls & Pitfalls + gap analysis + issue drafts',
  phases: [
    { title: 'Observe', detail: '3 moderator lenses + 4 persona AARs, each reading the live log and verifying against source' },
    { title: 'Verify', detail: 'adversarially verify each candidate pitfall against the actual code' },
    { title: 'Synthesize', detail: 'merge into Pearls & Pitfalls, gap analysis, dedup vs backlog, draft issues' },
  ],
};

const ROOT = '/Users/alex/Developer/paratech-struts/fieldshore';
const LOG = ROOT + '/.claude/simulations/level-v-sim/runtime/observation-log.md';

const SCENARIO = `
LEVEL V SIM — Verplanck Residential (car into 2-story wood-frame). Single engine company (Millbrook Engine 1), one interim IC (Capt. Torres), 4 crew, 3 shore points, 1 operational period, 2 hours. This is the SMALLEST scale — baseline test: if the app can't handle a single-company response cleanly, nothing else matters.

APP UNDER TEST: FieldShore v4.0.0-slice.1 (the v4 redesign on branch v4-redesign, Vite/TS/React PWA under src/). NOT v3. Local-first; cloud sync deliberately stubbed. The live drive was performed against the real UI on the dev server; findings are in the observation log.

CRITICAL FRAMING: The app is largely WORKING. This is an honest assessment, NOT a bug hunt that must manufacture defects. Classify each observation as one of: PEARL (works well, worth keeping), PITFALL (a real defect or friction that needs fixing), or GAP (a capability deliberately not built yet in this Phase-I slice — not a bug, but tracked). Be rigorous about the PITFALL vs GAP line: a stub screen is a GAP, not a PITFALL.
`;

const LENS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lens', 'checks', 'findings'],
  properties: {
    lens: { type: 'string' },
    checks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'item', 'verdict', 'evidence'],
        properties: {
          id: { type: 'string' },
          item: { type: 'string' },
          verdict: { type: 'string', enum: ['pass', 'fail', 'partial', 'gap', 'not-tested'] },
          evidence: { type: 'string', description: 'cite the log observation and/or the source file:line you verified against' },
        },
      },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'title', 'surface', 'detail', 'severity', 'sourceRef'],
        properties: {
          kind: { type: 'string', enum: ['pearl', 'pitfall', 'gap'] },
          title: { type: 'string' },
          surface: { type: 'string' },
          detail: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'na'] },
          sourceRef: { type: 'string', description: 'file:line if code-verified, else "log-only"' },
        },
      },
    },
  },
};

const AAR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['role', 'q1_intent', 'q2_actual', 'q3_why', 'q4_different', 'topFriction'],
  properties: {
    role: { type: 'string' },
    q1_intent: { type: 'string' },
    q2_actual: { type: 'string' },
    q3_why: { type: 'string' },
    q4_different: { type: 'string' },
    topFriction: { type: 'string', description: 'the single biggest friction this role hit, or "none" if the flow was clean' },
  },
};

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'isReal', 'classification', 'confirmedSeverity', 'reasoning', 'sourceEvidence', 'existingIssue'],
  properties: {
    title: { type: 'string' },
    isReal: { type: 'boolean', description: 'true if this is a genuine defect/friction confirmed against source or solid log evidence' },
    classification: { type: 'string', enum: ['pitfall', 'gap', 'not-a-defect', 'duplicate'] },
    confirmedSeverity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'na'] },
    reasoning: { type: 'string' },
    sourceEvidence: { type: 'string', description: 'file:line or code snippet that confirms/refutes' },
    existingIssue: { type: 'string', description: 'GitHub issue # that already covers this, or "none"' },
  },
};

const SYNTH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'pearls', 'pitfalls', 'gapAnalysis', 'issueDrafts'],
  properties: {
    headline: { type: 'string', description: 'one-paragraph verdict on the Level V run' },
    pearls: { type: 'array', items: { type: 'string' } },
    pitfalls: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'surface', 'severity', 'detail', 'needsIssue', 'existingIssue'],
        properties: {
          title: { type: 'string' },
          surface: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          detail: { type: 'string' },
          needsIssue: { type: 'boolean' },
          existingIssue: { type: 'string' },
        },
      },
    },
    gapAnalysis: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['finding', 'coverage', 'backlogRef', 'action'],
        properties: {
          finding: { type: 'string' },
          coverage: { type: 'string', enum: ['Covered', 'Gap', 'New idea', 'Decided-drop'] },
          backlogRef: { type: 'string' },
          action: { type: 'string' },
        },
      },
    },
    issueDrafts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'severity', 'body'],
        properties: {
          title: { type: 'string', description: 'starts with [SIM-V]' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium'] },
          body: { type: 'string', description: 'full GitHub issue body, markdown' },
        },
      },
    },
  },
};

const common = `${SCENARIO}\n\nThe LIVE OBSERVATION LOG is at:\n${LOG}\nRead it IN FULL first. It records exactly what was driven and seen. Then verify your assigned dimension against the actual source code under ${ROOT}/src (use Read/Grep). Cite file:line in your evidence. Do not invent findings the log/source don't support.`;

phase('Observe');

const lensPrompts = [
  {
    label: 'mod-ux',
    schema: LENS_SCHEMA,
    prompt: `${common}

YOU ARE Mod-UX (Field UX Observer). Assess these checks against the log + the UI source (${ROOT}/src/ui/operations, src/ui/quickfind, src/app/routes, src/app/shell):
- U-1 Quick Find usable at small inventory? (log: Quick Find tab drive)
- U-2 Add SP modal Save button visible without scrolling? (IP-007 regression)
- U-3 Empty state before any operation? (log: "No active operation")
- U-4 SP card status badge readable at a glance?
- U-5 Deploy from inventory to SP in < 5 taps?
- U-6 Return-equipment flow obvious when secured?
- U-7 Org chart: can IC assign roles with 4 personnel / 1 apparatus? (Command tab status)
- U-8 Offline: does the UI indicate it? (sync stubbed)
Also surface the minor observations O-1 (blank load renders "0 lbs"), O-2 (shore type silent default to T-Shore) — verify against src/ui/operations/AddShorePointModal.tsx whether shore type has a real default and whether blank load is stored as 0 or undefined. Classify each as pearl/pitfall/gap with severity. One-handed/gloved usability lens applies.`,
  },
  {
    label: 'mod-data',
    schema: LENS_SCHEMA,
    prompt: `${common}

YOU ARE Mod-Data (Data Integrity Observer). This is the most code-heavy lens. Verify against source:
- D-1 groupId/groupIndex correct for single (non-grouped) SP? (src/core/shorepoint, src/core/operation/reducer.ts)
- D-2 inventory decrement on deploy / increment on return, and CLAMP available<=quantity? VERIFY THE CLAMP in src/data/store/inventoryStore.ts (the live drive confirmed decrement 2->1->0 and re-increment, but did NOT test over-return clamp — read the code).
- D-3 localStorage/IDB persistence across reload? (the drive relied on reload repeatedly and state survived — confirm the persistence model in src/data/store)
- D-4 Firebase sync queued if offline? Sync is STUBBED in the slice — read src/data/sync/syncService.ts + firebase.ts and report what actually happens offline / whether writes queue, and whether this is a gap vs a defect.
- D-5 console errors during lifecycle? (the only one seen was the STALE-DATA crash, F-SETUP-1)
- D-6 end-operation clears active + archives? (log: OperationEnded, Past operations) — confirm in src/data/store/operationStore.ts / projection.ts
- D-7 inventory validate / security rules pass? read src/core/schema/rules.ts
CRITICAL — investigate F-SETUP-1 (the migration crash): on first load with STALE IndexedDB data from a prior schema version, the ENTIRE Operations board crashed (ShorePointCard threw, route CatchBoundary fired 40+ times; only a full wipe recovered). Read src/data/store/boot.ts, db.ts, src/core/schema/shorepoint.ts and src/ui/operations/ShorePointCard.tsx. Determine: is there a schema version guard / migration on boot? Is there per-card error isolation so one bad card can't blank the board? Assess real-world severity (an app update changing SP shape could brick a crew's board mid-incident). Classify pearl/pitfall/gap + severity, cite file:line.`,
  },
  {
    label: 'sme-doctrine',
    schema: LENS_SCHEMA,
    prompt: `${common}

YOU ARE the Structural-Collapse SME. Verify the safety-critical behavior against the load engine source (${ROOT}/src/core/load, src/core/shorepoint/bom.ts):
- Over-capacity gate: log saw 30" + 100,000 lb -> "require 5 struts", Deploy disabled, no override. Confirm the math/threshold logic (4-strut cap) in source.
- Unrated zone: 200" -> all Deploy disabled behind per-card acknowledgment. Confirm the >published-chart threshold logic.
- Capacity figures shown (LS 203 22,000 lb @30", AT 25-36 20,000 lb @30"): spot-check against the load tables in src/core/load/tables.ts — are these the conservative-floor table values? Any over-reporting?
- Conservative-floor interpolation present (vs linear)?
- The "0 lbs" display when load is blank (O-1): does it risk a planner reading 0 lbs as "no load" / safe? Doctrine view.
- Verplanck scenario realism note: the 200" (16'8") opening fires the unrated gate but is raker territory (Paratech vertical chart stops at 12'); confirm the app surfaces the unrated warning rather than a false capacity. Classify pearl/pitfall/gap + severity; flag any DOCTRINE VIOLATION as high/critical.`,
  },
];

const personaPrompts = [
  { label: 'aar-ic', role: 'IC (Capt. Torres)', focus: 'create operation, command picture, end operation. You are the ONLY officer — you ARE the incident. Did the app give you a command picture? Could you see overall status at a glance?' },
  { label: 'aar-shoring', role: 'Shoring (FF-1)', focus: 'Quick Find -> create SP -> deploy strut -> advance status. The core feature loop. Was finding & deploying the right strut fast and clear?' },
  { label: 'aar-entry', role: 'Entry (FF-2)', focus: 'used Quick Find independently to look up a measurement. New to the app. Did it differentiate crew-level vs IC-level actions? Was Quick Find self-explanatory?' },
  { label: 'aar-runner', role: 'Runner (FF-3)', focus: 'advance status cutting -> runner -> secured, return equipment. Working from a phone with gloves. Were the advance controls and return flow gloved-usable and obvious?' },
];

const observed = await parallel([
  ...lensPrompts.map((l) => () => agent(l.prompt, { label: l.label, phase: 'Observe', schema: l.schema })),
  ...personaPrompts.map((p) => () => agent(
    `${common}\n\nYOU ARE ${p.role}. Write a 4-question After-Action Review from this role's lived experience of the drive in the log. Focus: ${p.focus}\nQ1 intent, Q2 what actually happened, Q3 why any difference, Q4 what the app should do differently. Be concrete and honest — name a Pearl if it was good, a friction if it was not. topFriction = the single biggest snag or "none".`,
    { label: p.label, phase: 'Observe', schema: AAR_SCHEMA },
  )),
]);

const lensResults = observed.slice(0, lensPrompts.length).filter(Boolean);
const aars = observed.slice(lensPrompts.length).filter(Boolean);

// Collect candidate pitfalls across all lenses (dedup needs all findings — barrier justified)
const candidatePitfalls = lensResults
  .flatMap((r) => (r.findings || []))
  .filter((f) => f.kind === 'pitfall');

log(`Observe done: ${lensResults.length} lenses, ${aars.length} AARs, ${candidatePitfalls.length} candidate pitfalls to verify`);

phase('Verify');

const verdicts = await parallel(
  candidatePitfalls.map((f) => () => agent(
    `${common}

ADVERSARIALLY VERIFY this candidate PITFALL from a moderator lens. Default to skepticism: a stub/unbuilt screen is a GAP not a pitfall; a tooling artifact (synthetic-click not dismissing Radix modals) is NOT a defect. Confirm against source code.

CANDIDATE:
- title: ${f.title}
- surface: ${f.surface}
- claimed severity: ${f.severity}
- detail: ${f.detail}
- sourceRef: ${f.sourceRef}

Read the relevant source under ${ROOT}/src and decide: is it a REAL pitfall? Correct classification (pitfall / gap / not-a-defect / duplicate)? Confirmed severity? Does an existing GitHub issue already cover it (check the design docket ${ROOT}/docs/v4-design/98-design-docket.md and the known-gaps register ${ROOT}/docs/v4-design/13-slice/_PHASE-H-GATE-SCRIPT.md — many known gaps are deliberately deferred)? Cite file:line.`,
    { label: `verify:${(f.title || 'finding').slice(0, 28)}`, phase: 'Verify', schema: VERDICT_SCHEMA },
  )),
);

const confirmed = verdicts.filter(Boolean).filter((v) => v.isReal && v.classification === 'pitfall');

log(`Verify done: ${confirmed.length}/${candidatePitfalls.length} candidates confirmed as real pitfalls`);

phase('Synthesize');

const synthesis = await agent(
  `${common}

You are the hotwash synthesizer. Produce the final Level V hotwash. Inputs:

LENS RESULTS (pearls/pitfalls/gaps + check verdicts):
${JSON.stringify(lensResults, null, 1)}

PERSONA AARs:
${JSON.stringify(aars, null, 1)}

VERIFIED PITFALL VERDICTS (only isReal+pitfall survive into the pitfall table; gaps go to gap analysis):
${JSON.stringify(verdicts.filter(Boolean), null, 1)}

Produce:
1) headline — one honest paragraph: did the Level V baseline hold? The app is a Phase-I slice; frame accordingly.
2) pearls — the confirmed-working strengths worth keeping (dedup, concise).
3) pitfalls — ONLY verified real pitfalls. For each: needsIssue=true if Critical/High/Medium AND not already covered; existingIssue = the # if covered else "none".
4) gapAnalysis — each deliberately-unbuilt capability (Command tab/org chart, hazard log, offline/sync, etc.) mapped to coverage (Covered/Gap/New idea/Decided-drop) + backlogRef (#323, #321, #251, #252, ADR, etc.) + action.
5) issueDrafts — for every pitfall with needsIssue=true, a ready-to-post GitHub issue: title starts "[SIM-V] ", body has ## Source (Level V — Verplanck, the role/surface), ## Finding, ## Reproduction (UI steps), ## Severity, ## v4 Coverage (backlog ref / Gap / New idea). Do NOT draft issues for gaps or already-covered items.
Be precise and lazy: no padding, no manufactured findings.`,
  { label: 'synthesize', phase: 'Synthesize', schema: SYNTH_SCHEMA },
);

return { lensResults, aars, verdicts: verdicts.filter(Boolean), confirmedCount: confirmed.length, synthesis };
