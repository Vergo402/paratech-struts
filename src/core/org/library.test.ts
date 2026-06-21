import { describe, it, expect } from 'vitest';
import { POSITION_LIBRARY, libraryItemsAddableUnder, libraryItem } from './library';

describe('position library', () => {
  it('has unique keys', () => {
    const keys = POSITION_LIBRARY.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('addable under the IC = command staff + general staff + deputy IC (not Ops sub-structure)', () => {
    const titles = libraryItemsAddableUnder('command').map((p) => p.title);
    expect(titles).toContain('Public Information Officer');
    expect(titles).toContain('Liaison Officer');
    expect(titles).toContain('Planning Section Chief');
    expect(titles).toContain('Deputy Incident Commander');
    expect(titles).not.toContain('Branch Director');
    expect(titles).not.toContain('Rescue Group Supervisor');
  });

  it('addable under a Group = resources, never a Section', () => {
    const titles = libraryItemsAddableUnder('group').map((p) => p.title);
    expect(titles).toContain('Strike Team Leader');
    expect(titles).toContain('Task Force Leader');
    expect(titles).toContain('Single Resource');
    expect(titles).not.toContain('Planning Section Chief');
    expect(titles).not.toContain('Branch Director');
  });

  it('addable under a Section spans branch, division, groups, units, staging', () => {
    const kinds = new Set(libraryItemsAddableUnder('section').map((p) => p.kind));
    expect(kinds.has('branch')).toBe(true);
    expect(kinds.has('division')).toBe(true);
    expect(kinds.has('group')).toBe(true);
    expect(kinds.has('unit')).toBe(true);
    expect(kinds.has('staging')).toBe(true);
  });

  it('title law: the kind drives the suffix (Chief / Director / Supervisor / Leader)', () => {
    for (const p of POSITION_LIBRARY) {
      if (p.kind === 'section') expect(p.title.endsWith('Section Chief')).toBe(true);
      if (p.kind === 'branch') expect(p.title.endsWith('Branch Director')).toBe(true);
      if (p.kind === 'group') expect(p.title.endsWith('Group Supervisor')).toBe(true);
      if (p.kind === 'unit') expect(p.title.endsWith('Unit Leader')).toBe(true);
    }
    expect(libraryItem('rescue-group')!.kind).toBe('group');
    expect(libraryItem('nope')).toBeUndefined();
  });
});
