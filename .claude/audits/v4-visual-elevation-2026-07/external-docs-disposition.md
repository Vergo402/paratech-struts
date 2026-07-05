# External Redesign Docs — Disposition (2026-07-05)

**Source:** three externally-generated docs Alex dropped from `~/Downloads` (copies in `artifacts/`): `fieldshore-redesign-audit.md`, `fieldshore-redesign-briefs.md`, `fieldshore-redesign-action-plan.md`. Written **against the v3 root app without repo knowledge** (v3 file sizes, dark-mode hexes, and animation timings all verified accurate; theme claims match neither app). A fourth Downloads file (`fieldshore-redesign-audit_1.md`) is a byte-identical duplicate (md5 `7498ee81…`) — not kept.

**Standing decisions (Alex, 2026-07-05):**
1. Fold anything useful into **v4 only** — no v3 work (v3 is replaced at Phase J cutover).
2. **One-gold-accent rule stands** (ADR-011 / ADR-013).
3. **All four themes stay** (Dark default · Light · Sunlight · Broadcast).

The docs' underlying sentiment — "make it beautifully, surgically crafted" — is Alex's own requirement and became the **v4 Visual Elevation Program (epic #430, sub-issues #431–#435)**. The docs' *prescriptions* are dispositioned below.

## Classification

| External item | Disposition | Evidence / where it went |
|---|---|---|
| Retire gold as interactive accent; blue becomes primary | **Rejected — Alex decision.** One-gold-accent is the v4 interactive language | ADR-011, ADR-013 (`docs/v4-design/11-decisions/`); Alex reaffirmed 2026-07-05. NOTE: the *felt* gold noise is real but is an execution problem (gold-budget overuse per screen), addressed by #430, not a doctrine change |
| Dark-mode-only; delete other themes | **Rejected — Alex decision.** Sunlight is safety-engineered for direct-sun fireground use (2pt strokes, black-on-white, solid badges) | `color.md`, ADR-011 addendum; Alex reaffirmed 2026-07-05 |
| Bouncy easing `cubic-bezier(0.34,1.56,0.64,1)`, 80ms/800ms off-scale durations | **Rejected — doctrine.** Six durations / five easings, extend only by ADR | `motion.md` (scale + anti-patterns) |
| Status-badge icon rotation (0→180°) | **Rejected — doctrine.** Rotation is an anti-pattern; badge is a 250ms cross-fade | `motion.md`; `--motion-status` |
| Green success flash on inventory deduction | **Rejected — doctrine + covered.** Deploy already confirms via haptic + announce + focus (shipped #350); flash violates calm principle | `AssignEquipmentSheet.tsx` (`commitHaptic`); motion.md anti-patterns |
| `prefers-reduced-motion` support | **Already covered** | `src/app/tokens.css:89-97` global floor + per-component guards (`operations.css`, `command.css`) |
| Modal/sheet entry animations | **Already covered** | `primitives.css` (`fs-sheet-in` 200ms, modal fade + 8pt rise); ADR-016 gates modal-vs-sheet |
| Elevated surfaces | **Already covered** | `--surface-elevated` + per-theme shadows (overlays only; cards = stroke + top-edge highlight by doctrine) |
| Pill toggles / refined segmented controls | **Already covered** | `.fs-segmented`, `.fs-toggle` in `primitives.css` |
| Form-group breathing room (16px) | **Already covered** | `.fs-ops-form` gap = `--space-4` (16px) |
| Card entry/exit animation (add/delete) | **Absorbed → #435** (Stage 3, with a motion.md "What moves" amendment; opacity-only) | was a genuine gap: cards pop in/out instantly (`OperationsBoard.tsx`) |
| Result-card hierarchy (bigger primary number, subtler secondary) | **Absorbed → #433** (Stage 2b) + program-wide numerals-as-heroes language | absorbs the stale QF "flagged for design pass" docket row |
| Input-focus transition consistency | **Absorbed → #435** (Stage 3: bespoke field shells match `.fs-field-input`'s `--motion-micro`) | `.fs-meas-field`, `.fs-eighth`, `.fs-sysfilter-chip` snap today |
| Typography/spacing hierarchy sharpening, "surgical feel" | **Absorbed → #430 program language** (exemplar #431) | craft-on-top-of-tokens, not a token change |
| The 7-day Claude Design → Claude Code waterfall process | **Rejected — process.** We use in-chat mockup-first + the existing design pipeline (docket, /design-idea, claude.ai/design) | mockup-first standing rule (2026-06-22) |

**Do not re-litigate rejected items without a new ADR.**
