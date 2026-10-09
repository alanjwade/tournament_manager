import { describe, it, expect, beforeEach } from 'vitest';
import { computeSanityStats, computeConfigIssues } from '../src/renderer/utils/sanityStats';
import { createTestParticipant, createTestCategory, resetTestIds } from './fixtures';

const divisions = [
  { name: 'Black Belt', order: 1 },
  { name: 'Level 1', order: 2 },
];

describe('sanityStats', () => {
  beforeEach(() => resetTestIds());

  it('counts participants per division for forms and sparring', () => {
    const participants = [
      createTestParticipant({ id: 'p1', formsDivision: 'Black Belt', sparringDivision: 'Black Belt', competingForms: true, competingSparring: true }),
      createTestParticipant({ id: 'p2', formsDivision: 'Black Belt', sparringDivision: null, competingForms: true, competingSparring: false }),
      createTestParticipant({ id: 'p3', formsDivision: 'Level 1', sparringDivision: 'Level 1', competingForms: true, competingSparring: true }),
    ];

    const stats = computeSanityStats(participants, [], divisions, []);

    expect(stats.divisions).toEqual([
      { name: 'Black Belt', total: 2, forms: 2, sparring: 1 },
      { name: 'Level 1', total: 1, forms: 1, sparring: 1 },
    ]);
    expect(stats.totals).toEqual({
      participants: 3,
      inAnyDivision: 3,
      formsCompeting: 3,
      sparringCompeting: 2,
    });
    expect(stats.unmappedTotal).toBe(0);
  });

  it('excludes withdrawn and breaks down everyone not counted in a division', () => {
    const participants = [
      createTestParticipant({ id: 'p1', formsDivision: 'Black Belt', competingForms: true, competingSparring: false }),
      createTestParticipant({ id: 'p2', withdrawn: true, formsDivision: 'Black Belt', competingForms: true, competingSparring: false }),
      createTestParticipant({ id: 'p3', competingForms: false, competingSparring: false }),
      createTestParticipant({ id: 'p4', formsDivision: null, sparringDivision: null, competingForms: true, competingSparring: false }),
      createTestParticipant({ id: 'p5', formsDivision: 'Nonexistent', sparringDivision: null, competingForms: true, competingSparring: false }),
    ];

    const stats = computeSanityStats(participants, [], divisions, []);

    expect(stats.totals.inAnyDivision).toBe(1);
    expect(stats.unmapped.withdrawn).toBe(1);
    expect(stats.unmapped.notCompeting).toBe(1);
    expect(stats.unmapped.noDivision).toBe(1);
    expect(stats.unmapped.unknownDivision).toBe(1);
    expect(stats.unmappedTotal).toBe(4);
  });

  it('flags missing categories and pools that are not mapped to a physical ring', () => {
    const formsCat = createTestCategory({
      id: 'forms-Level 1-male-8-12',
      name: 'Male 8-12',
      type: 'forms',
      division: 'Level 1',
      gender: 'male',
      minAge: 8,
      maxAge: 12,
      numPools: 1,
    });
    const participants = [
      createTestParticipant({ id: 'p1', formsDivision: 'Level 1', competingForms: true, competingSparring: false }),
      createTestParticipant({ id: 'p2', formsDivision: 'Level 1', formsCategoryId: formsCat.id, competingForms: true, competingSparring: false }),
      createTestParticipant({ id: 'p3', formsDivision: 'Level 1', formsCategoryId: formsCat.id, formsPool: 'P1', competingForms: true, competingSparring: false }),
    ];

    const stats = computeSanityStats(participants, [formsCat], divisions, []);
    expect(stats.unmapped.formsNoCategory).toBe(1);
    expect(stats.unmapped.categoryNoPool).toBe(1);
    expect(stats.unmapped.poolNoPhysicalRing).toBe(1);

    const mapped = computeSanityStats(participants, [formsCat], divisions, [
      { categoryPoolName: 'Level 1 - Male 8-12 Pool 1', physicalRingName: 'Ring 1' },
    ]);
    expect(mapped.unmapped.poolNoPhysicalRing).toBe(0);
  });

  it('counts duplicate names', () => {
    const participants = [
      createTestParticipant({ id: 'p1', firstName: 'John', lastName: 'Doe' }),
      createTestParticipant({ id: 'p2', firstName: 'John', lastName: 'Doe' }),
      createTestParticipant({ id: 'p3', firstName: 'Jane', lastName: 'Doe' }),
    ];

    const stats = computeSanityStats(participants, [], divisions, []);
    expect(stats.unmapped.duplicateNames).toBe(1);
  });

  it('reports pools with participants that have no physical ring (Configuration badge)', () => {
    const cat = createTestCategory({ id: 'c1', name: 'Male 8-12', division: 'Level 1', type: 'forms', numPools: 3 });
    const participants = [
      createTestParticipant({ id: 'p1', formsDivision: 'Level 1', formsCategoryId: 'c1', formsPool: 'P1', competingForms: true, competingSparring: false }),
    ];

    // Pool 1 has a competitor and no ring mapping; Pools 2/3 are empty so ignored.
    const issues = computeConfigIssues([{ name: 'Level 1', order: 1 }], [cat], participants, []);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      division: 'Level 1',
      kind: 'pool-unmapped',
      type: 'forms',
      poolCount: 3,
      unmappedCount: 1,
    });
    expect(issues[0].pools).toEqual([{ name: 'Level 1 - Male 8-12 Pool 1', participantCount: 1 }]);
  });

  it('does not flag many pools sharing few rings (a/b) once they are on the Ring Map', () => {
    // 12 pools but only one has a competitor; it is mapped to Ring 1a, so no issue.
    const cat = createTestCategory({ id: 'c1', name: 'Male 8-12', division: 'Level 1', type: 'forms', numPools: 12 });
    const participants = [
      createTestParticipant({ id: 'p1', formsDivision: 'Level 1', formsCategoryId: 'c1', formsPool: 'P1', competingForms: true, competingSparring: false }),
    ];

    const issues = computeConfigIssues(
      [{ name: 'Level 1', order: 1 }],
      [cat],
      participants,
      [{ categoryPoolName: 'Level 1 - Male 8-12 Pool 1', physicalRingName: 'Ring 1a' }]
    );

    expect(issues).toHaveLength(0);
  });

  it('includes drill-down details on config issues', () => {
    const catA = createTestCategory({ id: 'a', name: 'Male 8-12', division: 'Black Belt', type: 'forms', numPools: 2 });
    const catB = createTestCategory({ id: 'b', name: 'Female 8-12', division: 'Black Belt', type: 'forms', numPools: 1 });
    const participants = [
      createTestParticipant({ id: 'p1', formsDivision: 'Black Belt', formsCategoryId: 'a', formsPool: 'P1', competingForms: true, competingSparring: false }),
      createTestParticipant({ id: 'p2', formsDivision: 'Black Belt', formsCategoryId: 'b', formsPool: 'P1', competingForms: true, competingSparring: false }),
    ];

    const issues = computeConfigIssues([{ name: 'Black Belt', order: 1 }], [catA, catB], participants, []);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      division: 'Black Belt',
      kind: 'pool-unmapped',
      type: 'forms',
      poolCount: 3,
      unmappedCount: 2,
    });
    expect(issues[0].categories).toEqual([
      { id: 'a', name: 'Male 8-12', numPools: 2 },
      { id: 'b', name: 'Female 8-12', numPools: 1 },
    ]);
    expect(issues[0].pools).toEqual([
      { name: 'Black Belt - Male 8-12 Pool 1', participantCount: 1 },
      { name: 'Black Belt - Female 8-12 Pool 1', participantCount: 1 },
    ]);
  });

  it('lists the people and pools behind the problems', () => {
    const cat = createTestCategory({
      id: 'forms-Level 1-male-8-12',
      name: 'Male 8-12',
      type: 'forms',
      division: 'Level 1',
      gender: 'male',
      minAge: 8,
      maxAge: 12,
      numPools: 1,
    });
    const participants = [
      createTestParticipant({ id: 'p1', firstName: 'No', lastName: 'Category', formsDivision: 'Level 1', competingForms: true, competingSparring: false }),
      createTestParticipant({ id: 'p2', firstName: 'No', lastName: 'Pool', formsDivision: 'Level 1', formsCategoryId: cat.id, competingForms: true, competingSparring: false }),
      createTestParticipant({ id: 'p3', firstName: 'Un', lastName: 'Mapped', formsDivision: 'Level 1', formsCategoryId: cat.id, formsPool: 'P1', competingForms: true, competingSparring: false }),
    ];

    const stats = computeSanityStats(participants, [cat], divisions, []);

    expect(stats.problemDetails.missingCategory.map((m) => m.participant)).toEqual(['No Category']);
    expect(stats.problemDetails.categoryNoPool.map((m) => m.participant)).toEqual(['No Pool']);
    expect(stats.problemDetails.unmappedPools).toEqual([
      { poolName: 'Level 1 - Male 8-12 Pool 1', type: 'forms', participants: ['Un Mapped'] },
    ]);
    expect(stats.physicalRings).toEqual([]);
  });

  it('names the participants not counted in a division, with their reason', () => {
    const participants = [
      createTestParticipant({ id: 'p1', firstName: 'With', lastName: 'Drawn', withdrawn: true, formsDivision: 'Black Belt', competingForms: true, competingSparring: false }),
      createTestParticipant({ id: 'p2', firstName: 'Not', lastName: 'Competing', competingForms: false, competingSparring: false }),
      createTestParticipant({ id: 'p3', firstName: 'No', lastName: 'Division', formsDivision: null, sparringDivision: null, competingForms: true, competingSparring: false }),
      createTestParticipant({ id: 'p4', firstName: 'Unknown', lastName: 'Division', formsDivision: 'Nope', competingForms: true, competingSparring: false }),
      createTestParticipant({ id: 'p5', firstName: 'Counted', lastName: 'Person', formsDivision: 'Black Belt', competingForms: true, competingSparring: false }),
    ];

    const stats = computeSanityStats(participants, [], divisions, []);

    // Sorted by reason, then name.
    expect(stats.problemDetails.notInDivision.map((m) => m.participant)).toEqual([
      'No Division',
      'Unknown Division',
      'Not Competing',
      'With Drawn',
    ]);
    expect(stats.problemDetails.notInDivision[1].detail).toBe('Nope');
  });

  it('groups mapped pools by physical ring', () => {
    const stats = computeSanityStats([], [], divisions, [
      { categoryPoolName: 'Level 1 - A Pool 1', physicalRingName: 'Ring 1' },
      { categoryPoolName: 'Level 1 - B Pool 1', physicalRingName: 'Ring 1' },
      { categoryPoolName: 'Level 1 - C Pool 1', physicalRingName: 'Ring 2' },
    ]);

    expect(stats.physicalRings.map((r) => ({ name: r.name, count: r.pools.length }))).toEqual([
      { name: 'Ring 1', count: 2 },
      { name: 'Ring 2', count: 1 },
    ]);
  });
});
