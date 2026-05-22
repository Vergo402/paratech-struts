# ADR-001: Relax the no-real names rule for competitive references

## Status

- [x] Accepted

**Date:** 2026-05-21
**Author:** Alex (decision) + Claude Opus 4.7 1M (legal/operational analysis, document edits)
**Reviewer(s):** Alex (final call)

---

## Context

The original v4 plan (Section III.D2 of `keen-whistling-pancake.md`) imposed a strict rule: **no real names of reference apps anywhere in the v4 design folder.** Six codenames (brass-folding-compass, iron-glowing-lantern, copper-burning-forge, steel-piercing-whistle, bronze-sinking-anchor, granite-standing-mantle) were assigned, and a private mapping file lived on Alex's desktop, never committed.

The stated reason was caution about defamation, trademark, and disparagement risk. The rule applied to all of Phase B (six reference teardowns + one positioning synthesis, ~17,400 words committed 2026-05-20 to 2026-05-21).

By the end of Phase B the costs had surfaced:

1. **Agent confusion.** Six teardown agents were briefed with the codename mapping privately. One (RapidSOS) confused the field responder pattern of IAMResponding for its own, citing the wrong support article. The codename mediation made it harder for an agent to verify it was researching the right product.
2. **Awkward prose.** Citation URLs in archive snapshots inevitably leaked the real product names (e.g., `tabletcommand.com`, `iamresponding.com`), and the prose had to dance around named features and verifiable taglines that would have been the most direct evidence.
3. **Scrub overhead.** Pre commit hygiene found leaks even after careful agent briefing: a geographic pointer ("upstate New York"), trademarked feature names (e.g., "Real Time Sync®"), direct marketing slogans in quotes, and a lowercase echo of a product name ("tablet command board"). Each required a manual rewrite.
4. **Decoder vibe.** Anyone reading the codenamed docs could identify "iPad first incident command for fire" as Tablet Command in under thirty seconds via the product description. The rule did not actually obscure anything to a determined reader.

Legal review (conducted as a chat exchange, not by counsel) confirmed that **comparative use of competitor trademarks is explicitly protected under nominative fair use** (the legal doctrine that lets you name a competitor's product when comparing truthfully) in the United States (*New Kids on the Block v. News America Publishing*, 9th Cir. 1992; codified by FTC for comparative advertising). The three part test (necessity, minimal use, no implied endorsement) is satisfied by an internal design doc that describes behavior and cites public sources. **Defamation and trade libel** require false statements of fact made with knowledge of falsity; truthful comparison cited to public sources does not qualify. **Trade secret / NDA** concerns do not apply. Alex has not signed any NDAs with the six referenced vendors, and all teardown content was drawn from publicly accessible marketing pages, support docs, App Store listings, and archive.org snapshots.

The codename rule was therefore doing more theater than legal protection while imposing real operational cost.

---

## Decision

**Use real product names in v4 design documents going forward.** Replace the existing codenames in Phase A and Phase B artifacts with real product names retroactively. Drop the "codenames only" line from `00-INDEX.md`'s Strict Rules; replace with a positive guideline that describes behavior, never disparages, and cites public sources.

The codename → real product mapping is:

| Old codename | Real product |
|---|---|
| brass-folding-compass | Tablet Command |
| iron-glowing-lantern | First Due |
| copper-burning-forge | RedNMX (Alpine Software) |
| steel-piercing-whistle | IAMResponding |
| bronze-sinking-anchor | RapidSOS |
| granite-standing-mantle | Fire Rescue Systems |

File name slugs become `tablet-command.md`, `first-due.md`, `rednmx.md`, `iamresponding.md`, `rapidsos.md`, `fire-rescue-systems.md`.

---

## Rationale

- **Comparative use is settled law.** Nominative fair use protects exactly this kind of document. We are not in a legal grey zone.
- **The cost was higher than the benefit.** Agent confusion, prose contortion, and scrub overhead all directly reduced the quality of the teardowns. The benefit (theatrical distance from the products) was already partially defeated by citation URLs and product description inference.
- **Phase C (12 brainstorm essays) will work better with real names.** Each of the 12 agents needs to ground recommendations in specific competitor behavior. Real names make that grounding direct.
- **Public repo posture.** The repo is open on GitHub; codenames were never going to be a true secret. Better to write good comparative analysis under the protective doctrine that exists than to pretend the docs are confidential.
- **Discipline preserved by behavior, not by names.** The principles that matter (describe behavior over brand, never disparage, cite truth, don't imply endorsement) are positive rules. They survive without the codename overhead.

---

## Alternatives Considered

- **Keep codenames everywhere.** Rejected: the operational cost outweighed the (mostly imaginary) legal benefit. See Context items 1 through 4.
- **Codenames in file names only, real names in prose.** Rejected as half measure: a `grep` across the repo would still surface real names, and the file name codename would be a friction point with no benefit. If we're going to use real names, do it consistently.
- **Codenames in prose, real names in citation URLs only.** This is what Phase B effectively did, and it's the configuration that produced the costs in Context items 1 through 4. Rejected on evidence.
- **Use only generic category descriptors (no names at all).** Rejected: kills the ability to reason about specific design choices (e.g., "Tablet Command's drag and drop unit assignment" is a citable pattern; "an iPad command app's drag pattern" is too vague to be useful in synthesis).

---

## Consequences

**Positive:**
- Phase C brainstorm essays can ground recommendations in named competitor behavior.
- Phase B teardowns become more useful to a future reader who isn't briefed on the mapping.
- The "Per codename placement justification" section in `positioning.md` becomes "Per product placement justification," a clearer signal of what the section does.
- Future agents don't need the private mapping briefing. The docs themselves are now self contained.

**Negative:**
- One time retroactive rename pass across Phase A/B artifacts (this commit).
- Anyone who reads the docs sees the named competitive set clearly. This is the same reality a determined reader could have decoded anyway; the difference is presentation.
- Slightly higher discipline burden in prose: "describe behavior, never disparage, cite truth" must now be applied at write time rather than enforced by a blanket rule.

**Neutral:**
- The codename mapping file on Alex's desktop is no longer load bearing. Can be kept as historical record or discarded.

---

## Related

- Principles invoked: Principle 1 (defer to doctrine, here the legal doctrine of nominative fair use) and Principle 11 (the app earns its place quietly, same posture extends to the design docs: no theatrical confidentiality where none is needed).
- Other ADRs: this is ADR-001; sets precedent for future "rule we wrote, then learned was costlier than helpful" reversals.
- Open questions resolved: row #17 in `99-open questions.md` (mapping file location), superseded by this ADR.
- Open questions surfaced: none.

---

## Notes

The retroactive rename was executed in one batch on `v4-redesign`:

1. `git mv` the six teardown files from codename slugs to real name slugs.
2. `sed -i ''` across the seven files in `04-references/` to replace each codename token with the real product name.
3. Scrub the residual "codename" language in three teardown front matter lines and one section header (`Per codename placement justification` → `Per product placement justification`).
4. Update `00-INDEX.md` (file list + Strict Rules entry + Phase B status line).
5. Update `99-open questions.md` row #17 to "superseded by ADR-001."
6. Update `keen-whistling-pancake.md` Section III.D2 to reflect the relaxed rule and reference this ADR.
7. Update `/v4-plan` skill (Phase B briefing packet, continuous discipline rule, Phase 2 dispatch matrix) to drop the codename language.

The ASCII chart in `positioning.md` had some alignment skew after rename (longer real names shifted column positions). Content is intact; cosmetic realignment deferred, not blocking.
