# Protecting IP for a Firefighting Equipment Management App

**Shared by:** Eric
**Date:** May 9, 2026
**Source:** Claude conversation share link

> This is a copy of a chat between Claude and Eric. Content may include unverified or unsafe content that does not represent the views of Anthropic.

---

## Turn 1 — Eric

Hey Claude,

My brother is a firefighter and vibe-coded an app that would help him in his job. After doing a first pass of the app, it's clear that the value proposition is there and that it is likely worth his time to invest more. Given my technical background I'm confident in saying that the app can be executed well, but both of us are unsure how to navigate the process of releasing software into the environment. The software manages inventory of critical equipment across multiple departments with the intent that the data can be accessed and managed in real time to aid with response to large scale disasters that require the coordination of multiple departments. The goal would be to eventually sell this to Paratech, or Airshore which are the major rescue companies that supply the actual equipment.

Top of mind for us are protecting our IP (both from a legal and practical standpoint). What are the types of things we should be thinking about in this space? Before responding in full, please ask a series of questions to confirm/enhance your understanding of the request from me.

Also, here is the prototype app: https://github.com/Vergo402/paratech-struts

---

## Turn 1 — Claude

Before asking clarifying questions, let me look at the repository to ground my questions in what actually exists.

*[Fetched: GitHub - Vergo402/paratech-struts]*

I noted the repo is structured as a static PWA (single index.html plus sw.js and manifest.json, JS embedded in HTML, no backend, public repo, 5 releases through v1.6.3). I'll use that to ground the questions.

Before I lay out the IP/release framework, I need answers on the following. Several of these materially change the recommendation, so I'd rather not guess.

### 1. Employment and ownership of the code itself

- Is your brother a paid municipal/county/state firefighter, or volunteer? Did he write any of this code on department time, on department equipment, or using department-owned data (rosters, equipment lists, SOPs)?
- Does his department have an employee invention assignment policy, IT/AUP policy, or collective bargaining agreement that touches outside work or "work related to employment"?
- What's your contribution? Have you written code, advised, or are you planning to? Is there any written agreement between the two of you yet?

These determine whether he actually owns what he's built, or whether the department has a colorable claim. Public-sector "shop rights" and state ethics laws around outside business activity vary a lot and are the single biggest risk I see right now.

### 2. The "data" question

The repo is currently client-side only (PWA with a service worker, no server). When you say "data can be accessed and managed in real time across departments," that implies a backend you haven't built yet.

- Is the current prototype purely local-storage, or is there a backend not in this repo?
- Whose data is it intended to hold in production — a single department's inventory, or pooled inventory across mutual-aid partners? Who would be the contracting customer (the department) vs. the data controller?
- Is any of the schema, equipment taxonomy, or workflow derived from Paratech/Airshore manuals, part numbers, or documentation?

### 3. What's actually novel/defensible

"Inventory app" by itself is hard to protect. What would you say is the actual differentiator — the cross-department coordination model, a specific data schema for strut/shoring inventory, a workflow tied to incident command, the UX for fireground use, domain expertise embedded in defaults? I'm trying to separate trade-secret-protectable assets from commodity functionality.

### 4. The "sell to Paratech/Airshore" exit

- Have either of you had any contact with these companies yet, even informal? Posted publicly about the project tagging them? (The repo name itself is "paratech-struts," which is worth a separate conversation.)
- Is the goal an acqui-hire, a license/royalty deal, a straight asset sale, or a pilot-then-acquire path?
- Timeline expectation — months or years?

### 5. Current public exposure

The repo is public with 5 tagged releases. Is that intentional? Anything proprietary already pushed (department names, real inventory data, SOPs, internal contacts in commits or issues)?

### 6. Jurisdiction and resources

- What state is your brother in? (Public-employee outside-business rules and trade secret law are state-level.)
- Budget reality for legal: are we talking "we can spend a few thousand to do this right at the foundational stage" or "zero budget, DIY until there's revenue"?

### 7. The trademark elephant

"Paratech" is an existing company's trademark. The current repo name and any product name incorporating it is a problem you'll want to address before any outside conversation, demo, or pitch. Is "paratech-struts" a working codename or has it appeared anywhere external?

---

Once I have these, I can give you a structured response covering: ownership chain-of-title, what to patent vs. keep as trade secret vs. copyright vs. trademark, public disclosure traps (the one-year US patent clock and the absolute-novelty rule abroad), the employer-claim risk, how to structure your collaboration, contract hygiene for the first pilot department, and how to approach Paratech/Airshore without giving away leverage.

---

## Turn 2 — Eric

1. My brother is a paid firefighter. Unsure about other details. I have not written any code
2. Ignore any technical details like this
3. Likely the cross department coordination, but we should be open to how we provide value (there is a lot of low hanging fruit in this grove)
4. No contact, goal would be acquihire or license. No expectation on timelines
5. No, we should move the repo to private
6. New York, we are in the exploratory phase and can spend a few thousand dollars if we think it's worth it; not there yet
7. Indeed. Consider this changed

---

## Turn 2 — Claude

Good. Here's the framework. I'm going to be direct about where the real risk lies vs. where founders tend to over-spend early.

### 1. Ownership and the employer-claim problem (highest priority)

This is the single biggest threat to the entire venture, and it's not a hypothetical.

New York is a "duty to disclose" state for public employees, and FDNY/NYS municipal departments typically have outside-employment rules in their collective bargaining agreements or department regulations. The questions that determine whether his department has a claim:

- **Time and equipment:** Was any code written on shift, on department computers, or on department networks? If yes, the department has a colorable claim under common-law "shop rights" doctrine even without an explicit policy.
- **Subject matter:** New York courts will look at whether the invention "relates to" his employment. An inventory system for firefighting equipment used on the job is squarely related. This is the worst possible subject matter for an employee-side ownership argument.
- **Department policy:** He needs to read his department's policy manual, his union contract, and any onboarding paperwork he signed. Look specifically for "outside employment," "intellectual property," "inventions," "moonlighting," and "ethics." If his department has a research/innovation office, that's also a flag.
- **State ethics law:** NY Public Officers Law §74 governs conflicts of interest for public employees. Selling a product back to fire departments (including potentially his own) while still employed creates a conflict that needs to be navigated, not ignored.

**Action item before doing anything else:** Have your brother quietly obtain and read his department's full policy on intellectual property, inventions, and outside business activity. Do not ask anyone in the department about it yet. Just read.

If the policy is silent or favorable, you proceed normally. If the policy is unfavorable, the options are: (a) negotiate a written waiver/release before further development, (b) restructure so development happens entirely outside the employment relationship with clear separation, or (c) reconsider the project. There's no good version of "build it and hope no one notices" — at acquisition, a buyer's IP diligence will surface this immediately and either kill the deal or massively discount it.

### 2. Chain of title between you and your brother

You haven't written code, but you're now contributing strategy, and you'll likely contribute more. Without a written agreement, any contributions you make are ambiguously owned, which creates the same diligence problem at exit.

Before you do more substantive work together, put two things in writing:

- A **founders' agreement** specifying equity/ownership split, vesting (so if one of you walks, the other isn't stuck with a 50% absentee co-owner), decision rights, and what happens on exit.
- An **IP assignment** from each of you to a jointly-owned entity (see §3).

These don't need to be expensive. A NY startup attorney can do both for $1,500–3,000. Doing it now, while there's nothing at stake, is dramatically cheaper than doing it later when there is.

### 3. Entity formation

Form an LLC in New York or Delaware before any further development of consequence and before any outside conversation. The entity:

- Becomes the legal owner of the IP (you both assign your contributions to it)
- Is the counterparty for any pilot, NDA, or eventual acquisition
- Provides liability separation, which matters because this software will be used in life-safety contexts
- Resolves the "who owns what" question cleanly

Delaware LLC: ~$300 filing + registered agent (~$100/yr). NY LLC: cheaper but has a publication requirement (~$1,000+ depending on county). For a two-person early-stage venture targeting acquisition, Delaware is the default; if you'll operate primarily in NY, NY is fine.

### 4. The IP protection stack

Different mechanisms protect different things. Match the mechanism to the asset:

**Trade secret** — your primary protection layer. The cross-department coordination logic, the data schema, the workflow design, customer lists, and pricing strategy are protectable as trade secrets if and only if you treat them as secret. That means: private repo (you've decided this), access controls, NDAs before any external demo, no public posting of architecture or screenshots, no LinkedIn announcements describing what it does. Trade secret protection is free but evaporates the instant you disclose without protection. The federal Defend Trade Secrets Act and NY common law both require demonstrable secrecy efforts.

**Copyright** — automatic, low-effort, modest value. The code is copyrighted automatically on creation. For meaningful enforcement leverage, register key versions with the US Copyright Office (~$65/version). Useful but not central. Do this once the codebase stabilizes.

**Patent** — probably not worth pursuing yet, possibly never. Software patents on inventory/coordination workflows are difficult post-Alice v. CLS Bank (2014). You'd need a genuinely novel technical mechanism, not just "inventory app for firefighters." A provisional patent application costs ~$300 in fees plus $3,000–8,000 in attorney time to do properly, and gives you 12 months to decide on a full application (~$15,000+). My read: defer this decision until you've identified a specific technical novelty worth protecting. However, be aware of the **one-year US public disclosure bar** (35 USC §102): once you publicly disclose, you have 12 months to file a US application or you lose the right forever. Outside the US, most jurisdictions require **absolute novelty** — disclosure before filing kills the patent immediately. The 5 public releases on GitHub may have already started this clock for anything visible in those releases.

**Trademark** — defer until you have a real product name. You've already identified the "paratech-struts" problem. Don't pick a new name until you've done at least a basic USPTO TESS search and a domain check. Trademark registration is ~$350/class in USPTO fees plus ~$1,000–1,500 in attorney time. Wait until you have a name you're committed to.

### 5. Public disclosure cleanup

Making the repo private now is correct but doesn't undo prior disclosure. Concrete steps:

- Make the repo private immediately.
- Audit what was in the public releases: any real department names, personnel, real inventory data, SOPs, contact info, or anything that could be claimed as someone else's confidential information? If yes, that's a separate problem (potentially a department policy violation).
- Note the dates of public releases. If you ever pursue patents, you'll need this for the §102 analysis.
- Check whether the repo was forked or starred by anyone (the page shows 1 star, 0 forks — note who).
- Rename the repo and remove "paratech" from any commit messages, package names, or documentation. Git history retains old names; if there's anything sensitive, consider a fresh repo rather than rewriting history.

### 6. The Paratech/Airshore approach

Several traps here:

**Don't use their trademarks** in your product name, repo, domain, marketing, or pitch deck. Descriptive use ("compatible with Paratech struts") in documentation is generally permissible nominative fair use; using the marks as your branding is not.

**Don't pitch them without an NDA in place.** Both companies have product development functions and could plausibly build something similar. An NDA doesn't fully protect you (they can claim independent development), but it raises the cost of misappropriation and creates a paper trail. A mutual NDA is standard; expect them to push back, negotiate.

**Don't pitch them before you have evidence of value.** The strongest negotiating position is "N departments are paying us $X/year and the data shows Y." The weakest is "we have a prototype, please buy us." Get one or two paying or LOI-committed pilot departments first. This both validates the product and dramatically increases acquisition value.

**Have a backup plan.** If the goal is acqui-hire/license to one of two specific companies, you have very little leverage. Building a real standalone business — even a small one — is the only way to have meaningful negotiating power. Don't optimize the venture purely for an exit to one of two buyers.

### 7. Operational risk you haven't asked about

Software used in disaster response is in a different liability category than typical SaaS. If your software is unavailable or incorrect during an actual incident and that contributes to a bad outcome, you can be sued. Two things to handle before any pilot:

- Customer contracts with strong limitation-of-liability and disclaimer-of-warranty clauses. Standard SaaS terms aren't sufficient for life-safety adjacent use cases.
- Errors & omissions / cyber liability insurance before any paid deployment. Likely not needed yet, but budget for it.

### Recommended sequencing and spend

Given "few thousand dollars, exploratory phase":

1. **Free, this week:** Brother reads department policy. You both make repo private, audit prior disclosures, stop using "Paratech" branding.
2. **~$500, next 2 weeks:** 30-minute consultation with a NY startup/IP attorney to confirm the employer-claim risk based on actual policy language. This is the highest-value dollar you'll spend.
3. **~$1,500–2,500, next month if §1 clears:** Form Delaware or NY LLC, founders' agreement, IP assignments from both of you to the entity, basic mutual NDA template for future conversations.
4. **Defer:** patents, trademarks, copyright registration, E&O insurance — none of these are urgent until you have a committed product name, identified novelty, or a paying customer.

Total to get to a clean, defensible foundation: ~$2,000–3,000, which fits your stated budget.

The work in §1 is non-negotiable and comes before everything else. If the department-policy answer is bad, none of the rest matters.

---

## Turn 3 — Eric

Understood. At some point we will have to start building a user-base. What things have to be done before that in order to properly protect ourselves?

---

## Turn 3 — Claude

Before onboarding users, the following must be in place. I'll order by hard prerequisites first, then operational requirements.

### Hard prerequisites (cannot launch without these)

#### 1. Foundational items from the prior response must be complete

- Department policy review concluded with no employer claim, or claim resolved via written waiver
- Entity formed, IP assignments executed, founders' agreement signed
- All "Paratech" branding removed; new product name selected and cleared via USPTO TESS search and domain check
- Repo private; prior public disclosures audited and documented

If any of these are open, do not onboard users. Onboarding creates evidence of commercial activity that worsens every unresolved issue.

#### 2. Terms of Service and Privacy Policy

Required for any user-facing software. Cannot be copy-pasted from another product without creating contract defects. Must include:

- Limitation of liability and disclaimer of warranty (critical given life-safety context)
- Specific disclaimer that the software is not a substitute for established emergency response procedures
- Data ownership clarification (the department owns its inventory data; you have a license to process it)
- Acceptable use, account termination, governing law (NY or Delaware), dispute resolution
- Service level expectations — explicitly set low at this stage; do not promise uptime you cannot deliver
- Privacy policy disclosing what is collected, how it is stored, who it is shared with, and user rights

Cost: $1,500–3,000 with a SaaS-experienced attorney. Generic templates (Termly, Iubenda) are acceptable for very early non-paying pilots but inadequate for paid customers or anything touching public-sector procurement.

#### 3. Data Processing Agreement (DPA) and security representations

Fire departments are public agencies. Their data is subject to:

- State public records laws (NY FOIL)
- Potential CJIS requirements if any data touches law enforcement systems
- Department-specific records retention policies
- Possible HIPAA exposure if any patient data appears in equipment-use logs (it shouldn't, but verify)

You need a DPA template ready before the first department signs. This is separate from ToS.

#### 4. Security baseline

Before any real department data lands in your system:

- Encryption in transit (TLS) and at rest
- Authentication with MFA available (required for public-sector customers, often non-negotiable)
- Role-based access control
- Audit logging of data access and modifications
- Documented backup and recovery procedure
- Incident response plan, even if rudimentary
- No production secrets in source control
- Dependency vulnerability scanning enabled

This is a baseline, not a security program. A real security program comes later. But these specific items are minimum table stakes for any agency customer and any future SOC 2 path.

#### 5. Insurance

- General liability: $500–1,500/year, ~$1M coverage
- Errors & omissions / professional liability: $1,500–4,000/year for early-stage SaaS
- Cyber liability: $1,500–5,000/year, scales with data volume

E&O is the critical one given the life-safety use case. Do not deploy to a paying customer without it. Insurers will ask about your security baseline (item 4), which is one reason to have it documented.

### Operational requirements

#### 6. Pilot agreement template

Distinct from ToS. A pilot agreement governs the relationship with early departments and should include:

- Defined pilot scope and duration (90 days is typical)
- What success looks like and what happens after the pilot (auto-renew vs. expire)
- Free or paid status explicitly stated
- Mutual confidentiality
- Feedback/testimonial rights — you want the right to reference them as a customer
- Data handling, retention, and return on termination
- IP ownership of any feedback or feature requests they provide (should flow to you)
- Limitation of liability

Pilot agreements should be short and readable — 3–5 pages. Long contracts kill early pilots. A startup attorney can produce a reusable template for ~$1,000–2,000.

#### 7. Procurement readiness

Public-sector sales have procurement constraints private SaaS does not:

- W-9, certificate of insurance, vendor registration paperwork
- Possible requirement to be on state/county vendor lists
- NY State has specific vendor responsibility questionnaires
- Some departments require background checks on vendor personnel with system access — relevant given your brother's employment status
- Net-30 or longer payment terms are standard; expect cash flow lag

This is not a legal requirement but a practical one. The first department will tell you what they need; subsequent departments will need similar.

#### 8. Conflict-of-interest documentation if your brother's department is a customer

If his own department is among the first users, NY Public Officers Law §74 conflict rules apply. Options:

- His department is not a customer until he leaves the department
- Written ethics opinion from the department's ethics officer or NY State JCOPE permitting the arrangement
- Recusal documentation showing he does not participate in the procurement decision

This must be resolved in writing before money or product changes hands. "We'll figure it out" is the answer that ends careers and companies.

#### 9. Trademark filing

Once a final product name is selected and cleared, file an Intent-to-Use (ITU) trademark application with USPTO. ~$350 in filing fees plus $1,000–1,500 in attorney time. Filing before launch establishes priority and avoids the situation where a competitor files first while you're building.

#### 10. Copyright registration of the codebase

Register the current production version with the US Copyright Office. ~$65. Provides statutory damages and attorney's fees in infringement cases — which matters specifically because Paratech and Airshore are the eventual acquisition targets and could plausibly build a competitor.

#### 11. Trade secret hygiene

By the time users are onboarding, your trade secret protections must be operational, not aspirational:

- All contributors under written confidentiality obligations
- Access controls on source code and infrastructure
- Documented internal policy on what is confidential
- Marking of confidential documents
- NDA executed before any external technical conversation

The legal standard requires "reasonable measures" — this is what reasonable looks like for a two-person company.

#### 12. Domain, email, and basic identity infrastructure

- Domain registered, ideally with privacy protection
- Business email on that domain (not gmail)
- Basic landing page that does not overpromise
- LinkedIn company page

This is not legal protection but is required for credibility with public-sector buyers and for trademark common-law rights.

### Sequencing and spend

**Phase 1 — before first user (~$4,000–7,000):**

- Items 1, 2, 3, 4, 6 are mandatory
- Item 9 (trademark filing) recommended
- Item 12 (identity infrastructure) ~$200/year

**Phase 2 — before first paying user (add ~$3,000–6,000/year):**

- Item 5 (insurance) mandatory
- Item 10 (copyright registration) ~$65
- Item 8 (conflict resolution) if applicable

**Phase 3 — as you scale past 3–5 customers:**

- Formalized security program
- SOC 2 Type I (~$15,000–30,000) becomes relevant when enterprise customers ask
- Consider patent strategy if specific technical novelty has emerged

Total to be ready for a first non-paying pilot: ~$4,000–7,000 plus ~$200/year in recurring infrastructure. Total to be ready for first paying customer: add ~$3,000–6,000/year in insurance.

This fits the trajectory of a few-thousand-dollar exploratory phase scaling to a real budget once revenue or committed pilots exist. Do not skip items 1–6 to save money; the cost of fixing any of them after a problem occurs exceeds the cost of doing them correctly upfront by 10–100×.

The single most underestimated item on this list is **#8**. The conflict-of-interest exposure is professional-license-level serious for your brother and needs explicit written resolution, not assumption.

---

*End of conversation.*
