import type { ChecklistId, ChecklistTemplate } from '../schema';

// ============================================================================
// CONTENT-PASS: every `label` string below is PLACEHOLDER wording, not approved
// doctrine. The real paraphrased steps (sourced from the department's manuals,
// run past Alex per OQ#3) land in a separate content pass. The TREE STRUCTURE
// (depth, section count, leaf count) is real and exercises the primitive; only
// the words are stand-in. Do not ship these strings as doctrine. node `id`s are
// stable — attestations key on them, so keep ids when the content pass rewords.
// ============================================================================

// IC Command Checklist (#203) — deep, 3-4 levels, auto-collapse ON. Phases I-IV;
// Phase I nests a sub-section to exercise the 3-level depth.
const IC_COMMAND: ChecklistTemplate = {
  id: 'ic-command',
  title: 'IC Command Checklist',
  source: 'fieldshore-baseline',
  autoCollapseCompleted: true,
  nodes: [
    {
      id: 'ic-p1',
      label: 'Phase I - Size-up',
      children: [
        {
          id: 'ic-p1-assess',
          label: 'Primary assessment',
          children: [
            { id: 'ic-p1-assess-location', label: 'Determine location and extent' },
            { id: 'ic-p1-assess-hazards', label: 'Identify immediate hazards' },
            { id: 'ic-p1-assess-victims', label: 'Estimate victim count' },
          ],
        },
        {
          id: 'ic-p1-command',
          label: 'Establish command',
          children: [
            { id: 'ic-p1-command-post', label: 'Establish command post' },
            { id: 'ic-p1-command-perimeter', label: 'Set perimeter and zones' },
          ],
        },
      ],
    },
    {
      id: 'ic-p2',
      label: 'Phase II - Initial actions',
      children: [
        { id: 'ic-p2-safety', label: 'Assign Safety Officer' },
        { id: 'ic-p2-op', label: 'Set operational period' },
        { id: 'ic-p2-360', label: 'Confirm 360-degree size-up' },
        { id: 'ic-p2-resources', label: 'Request initial resources' },
      ],
    },
    {
      id: 'ic-p3',
      label: 'Phase III - Sustained operations',
      children: [
        { id: 'ic-p3-divisions', label: 'Establish divisions and groups' },
        { id: 'ic-p3-accountability', label: 'Confirm personnel accountability' },
        { id: 'ic-p3-rehab', label: 'Establish rehab and rotation' },
      ],
    },
    {
      id: 'ic-p4',
      label: 'Phase IV - Demobilization',
      children: [
        { id: 'ic-p4-par', label: 'Final PAR' },
        { id: 'ic-p4-equipment', label: 'Account for equipment' },
        { id: 'ic-p4-afteraction', label: 'Schedule after-action review' },
      ],
    },
  ],
};

// Task Level Checklist (#204) - 2 levels, auto-collapse OFF, one section open at a
// time (phone). Five doctrine sections -> their steps.
const TASK_LEVEL: ChecklistTemplate = {
  id: 'task-level',
  title: 'Task Level Checklist',
  source: 'fieldshore-baseline',
  autoCollapseCompleted: false,
  nodes: [
    {
      id: 'tl-assess',
      label: 'Assessment',
      children: [
        { id: 'tl-assess-survey', label: 'Survey the work area' },
        { id: 'tl-assess-hazards', label: 'Note hazards to the team' },
      ],
    },
    {
      id: 'tl-search',
      label: 'Search',
      children: [
        { id: 'tl-search-primary', label: 'Primary search' },
        { id: 'tl-search-mark', label: 'Mark searched areas' },
        { id: 'tl-search-secondary', label: 'Secondary search' },
      ],
    },
    {
      id: 'tl-access',
      label: 'Access',
      children: [
        { id: 'tl-access-route', label: 'Establish access route' },
        { id: 'tl-access-shore', label: 'Shore the route as needed' },
      ],
    },
    {
      id: 'tl-extricate',
      label: 'Extricate',
      children: [
        { id: 'tl-extricate-stabilize', label: 'Stabilize the patient' },
        { id: 'tl-extricate-remove', label: 'Remove and package' },
      ],
    },
    {
      id: 'tl-allclear',
      label: 'All-clear',
      children: [
        { id: 'tl-allclear-account', label: 'Account for all team members' },
        { id: 'tl-allclear-withdraw', label: 'Withdraw and report' },
      ],
    },
  ],
};

// ORM / TCRM briefing (#205) - shallow, 1-2 levels, auto-collapse OFF. The 4-step
// briefing as leaves + the five crew questions as a section. NEVER a gate
// (Principle 10) - it records that the briefing happened; the "Speak" step names
// the radio/face-to-face stop authority, it does not implement an app block.
const ORM_TCRM: ChecklistTemplate = {
  id: 'orm-tcrm',
  title: 'Risk briefing (ORM/TCRM)',
  source: 'fieldshore-baseline',
  autoCollapseCompleted: false,
  nodes: [
    { id: 'orm-explain', label: 'Explain the plan and assignments' },
    { id: 'orm-list', label: 'List the known hazards' },
    { id: 'orm-ask', label: 'Ask the crew for input' },
    { id: 'orm-speak', label: 'Speak - anyone can stop the operation' },
    {
      id: 'orm-questions',
      label: 'Crew questions',
      children: [
        { id: 'orm-q-understand', label: 'Does everyone understand the assignment?' },
        { id: 'orm-q-hazards', label: 'Does everyone know the hazards?' },
        { id: 'orm-q-egress', label: 'Does everyone know the egress route?' },
        { id: 'orm-q-signals', label: 'Does everyone know the signals?' },
        { id: 'orm-q-concerns', label: 'Does anyone have concerns?' },
      ],
    },
  ],
};

/** The shipped (FieldShore-baseline) templates, keyed by checklist id. A department
 *  fork (Session 3) overrides one of these in a meta-row store; until then this is
 *  the live source. */
export const BASELINE_TEMPLATES: Record<ChecklistId, ChecklistTemplate> = {
  'ic-command': IC_COMMAND,
  'task-level': TASK_LEVEL,
  'orm-tcrm': ORM_TCRM,
};
