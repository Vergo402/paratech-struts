import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildV4OrgsRules } from '../src/core/schema/rules';

// Splice the generated v4 `orgs` block into database.rules.json WITHOUT
// re-serializing the file — the non-orgs trees are preserved exactly, so
// `git diff` shows ONLY the orgs block. Run via `npm run gen:rules` whenever
// the department schemas change (L-11). This file deploys to the v4-only
// `fieldshore-database` project (v3 prod is `paratech-c3ab4`, deployed from
// main); the v3-era legacy trees here were locked down / hardened in #424 —
// /departments deny-all, /feedback + /diagnostics write-once with no read.
//
// Idempotent: an existing orgs block is brace-matched and removed first, then a
// fresh one is inserted. (The rule expressions contain no { } characters, so the
// naive brace count below is safe for this file.)

const rulesPath = fileURLToPath(new URL('../database.rules.json', import.meta.url));
let raw = readFileSync(rulesPath, 'utf8');

// 1. Remove a previously-generated orgs block, if present.
const start = raw.match(/\n {4}"orgs": \{/);
if (start && start.index !== undefined) {
  let i = start.index + start[0].length; // just past the opening brace
  let depth = 1;
  while (depth > 0 && i < raw.length) {
    const c = raw[i++];
    if (c === '{') depth++;
    else if (c === '}') depth--;
  }
  if (raw[i] === ',') i++; // consume the trailing comma
  raw = raw.slice(0, start.index) + raw.slice(i);
}

// 2. Build the orgs block, indented to nest as a sibling under "rules" (4 spaces).
const orgsValue = JSON.stringify(buildV4OrgsRules(), null, 2).split('\n').join('\n    ');
const orgsBlock = `    "orgs": ${orgsValue},\n`;

// 3. Insert it just before the TOP-LEVEL "$other" catch-all. The marker is
// newline-anchored on exactly 4 spaces: a bare '    "$other": {' is a SUBSTRING
// of any deeper-indented "$other" (the legacy /feedback + /diagnostics trees each
// carry one since J257-S5), so an unanchored replace() spliced the whole orgs
// block inside /feedback and corrupted the file.
const marker = '\n    "$other": {';
if (!raw.includes(marker)) throw new Error('gen-rules: $other marker not found in database.rules.json');
raw = raw.replace(marker, '\n' + orgsBlock + marker.slice(1));

writeFileSync(rulesPath, raw, 'utf8');
console.log('database.rules.json regenerated (v3 preserved verbatim + /orgs).');
