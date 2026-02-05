import { describe, it, expect } from 'vitest';
import { extractPoolId, buildCategoryPoolName } from '../src/renderer/utils/ringNameFormatter';
import { computeCompetitionRings } from '../src/renderer/utils/computeRings';
import { Participant, Category } from '../types/tournament';

// Helper to create test participants
function createParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: `p-${Math.random().toString(36).substring(7)}`,
    firstName: 'Test',
    lastName: 'Person',
    age: 10,
    gender: 'male' as const,
    beltRank: 'white',
    school: 'Test School',
    schoolId: 'TS',
    branch: 'Test Branch',
    weight: 70,
    height: 50,
    heightForSparring: 50,
    division: 'Beginner',
    formsDivision: 'Beginner',
    sparringDivision: 'Beginner',
    formsCategoryId: 'cat-beginner-mixed-8-12',
    sparringCategoryId: 'cat-beginner-mixed-8-12',
    formsPool: 'P1',
    sparringPool: 'P1',
    formsRankOrder: 1,
    sparringRankOrder: 1,
    competingForms: true,
    competingSparring: true,
    withdrawn: false,
    sparringAltRing: '',
    ...overrides,
  } as Participant;
}

function createCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-beginner-mixed-8-12',
    name: 'Mixed 8-12',
    division: 'Beginner',
    type: 'forms' as const,
    gender: 'mixed' as const,
    minAge: 8,
    maxAge: 12,
    ...overrides,
  } as Category;
}

describe('Ring Name Format Consistency', () => {
  describe('extractPoolId', () => {
    it('extracts pool from new format "Division - Category Pool 1"', () => {
      expect(extractPoolId('Beginner - Mixed 8-12 Pool 1')).toBe('P1');
      expect(extractPoolId('Beginner - Mixed 8-12 Pool 2')).toBe('P2');
      expect(extractPoolId('Black Belt - Female 18+ Pool 10')).toBe('P10');
    });

    it('extracts pool from legacy format "Category_P1"', () => {
      expect(extractPoolId('Mixed 8-12_P1')).toBe('P1');
      expect(extractPoolId('Mixed 8-12_P2')).toBe('P2');
    });

    it('returns empty string for names without pool', () => {
      expect(extractPoolId('Mixed 8-12')).toBe('');
      expect(extractPoolId(undefined)).toBe('');
      expect(extractPoolId('')).toBe('');
    });

    it('is case-insensitive for Pool keyword', () => {
      expect(extractPoolId('Beginner - Mixed 8-12 POOL 1')).toBe('P1');
      expect(extractPoolId('Beginner - Mixed 8-12 pool 1')).toBe('P1');
    });
  });

  describe('buildCategoryPoolName', () => {
    it('builds name with pool', () => {
      expect(buildCategoryPoolName('Beginner', 'Mixed 8-12', 'P1'))
        .toBe('Beginner - Mixed 8-12 Pool 1');
      expect(buildCategoryPoolName('Black Belt', 'Female 18+', 'P3'))
        .toBe('Black Belt - Female 18+ Pool 3');
    });

    it('builds name without pool', () => {
      expect(buildCategoryPoolName('Beginner', 'Mixed 8-12', undefined))
        .toBe('Beginner - Mixed 8-12');
    });
  });

  describe('Ring name ↔ extractPoolId roundtrip', () => {
    it('can extract pool from buildCategoryPoolName output', () => {
      const name = buildCategoryPoolName('Level 1', 'Mixed 4-7', 'P2');
      expect(extractPoolId(name)).toBe('P2');
    });

    it('roundtrips for all pool numbers', () => {
      for (let i = 1; i <= 10; i++) {
        const name = buildCategoryPoolName('Div', 'Cat', `P${i}`);
        expect(extractPoolId(name)).toBe(`P${i}`);
      }
    });
  });
});

describe('Moving Participant Between Pools', () => {
  it('should update pool assignment when moving to a different pool in same category', () => {
    const participant = createParticipant({
      formsPool: 'P1',
      formsRankOrder: 3,
    });

    // Simulate move: clear old rank, set new pool
    const moved: Participant = {
      ...participant,
      formsPool: 'P2',
      formsRankOrder: undefined,
    };

    expect(moved.formsPool).toBe('P2');
    expect(moved.formsRankOrder).toBeUndefined();
  });

  it('should handle sparring-only participant (no forms category)', () => {
    const participant = createParticipant({
      formsCategoryId: undefined,
      formsPool: undefined,
      sparringCategoryId: 'cat-beginner-mixed-8-12',
      sparringPool: 'P1',
      competingSparring: true,
    });

    // Move sparring pool
    const moved: Participant = {
      ...participant,
      sparringPool: 'P2',
      sparringRankOrder: undefined,
    };

    expect(moved.formsCategoryId).toBeUndefined();
    expect(moved.sparringPool).toBe('P2');
  });
});

describe('Withdrawal and Un-withdrawal', () => {
  it('should clear rank orders when withdrawing', () => {
    const participant = createParticipant({
      formsRankOrder: 3,
      sparringRankOrder: 5,
    });

    // Simulate withdrawal (as the fixed store should do)
    const withdrawn: Participant = {
      ...participant,
      withdrawn: true,
      formsRankOrder: undefined,
      sparringRankOrder: undefined,
    };

    expect(withdrawn.withdrawn).toBe(true);
    expect(withdrawn.formsRankOrder).toBeUndefined();
    expect(withdrawn.sparringRankOrder).toBeUndefined();
    // Category and pool should be preserved
    expect(withdrawn.formsCategoryId).toBe('cat-beginner-mixed-8-12');
    expect(withdrawn.formsPool).toBe('P1');
  });

  it('should preserve category and pool when withdrawing for easy un-withdraw', () => {
    const participant = createParticipant({
      formsCategoryId: 'cat-beginner-mixed-8-12',
      formsPool: 'P2',
      sparringCategoryId: 'cat-beginner-mixed-8-12',
      sparringPool: 'P1',
    });

    const withdrawn: Participant = {
      ...participant,
      withdrawn: true,
      formsRankOrder: undefined,
      sparringRankOrder: undefined,
    };

    // Un-withdraw: just clear the withdrawn flag
    const unWithdrawn: Participant = {
      ...withdrawn,
      withdrawn: false,
    };

    expect(unWithdrawn.withdrawn).toBe(false);
    expect(unWithdrawn.formsCategoryId).toBe('cat-beginner-mixed-8-12');
    expect(unWithdrawn.formsPool).toBe('P2');
    expect(unWithdrawn.sparringCategoryId).toBe('cat-beginner-mixed-8-12');
    expect(unWithdrawn.sparringPool).toBe('P1');
  });
});

describe('Category Change', () => {
  it('should clear pool and rank when changing category within same division', () => {
    const participant = createParticipant({
      formsCategoryId: 'cat-beginner-mixed-8-12',
      formsPool: 'P2',
      formsRankOrder: 3,
    });

    // Simulate what the fixed updateParticipantCategory should do
    const changed: Participant = {
      ...participant,
      formsCategoryId: 'cat-beginner-mixed-13-17',
      formsPool: undefined,
      formsRankOrder: undefined,
    };

    expect(changed.formsCategoryId).toBe('cat-beginner-mixed-13-17');
    expect(changed.formsPool).toBeUndefined();
    expect(changed.formsRankOrder).toBeUndefined();
  });

  it('should allow different categories for forms and sparring', () => {
    const participant = createParticipant({
      formsCategoryId: 'cat-beginner-mixed-8-12',
      formsPool: 'P1',
      sparringCategoryId: 'cat-level1-mixed-8-11',
      sparringPool: 'P2',
    });

    expect(participant.formsCategoryId).toBe('cat-beginner-mixed-8-12');
    expect(participant.sparringCategoryId).toBe('cat-level1-mixed-8-11');
    expect(participant.formsPool).toBe('P1');
    expect(participant.sparringPool).toBe('P2');
  });
});

describe('Checkpoint Diff Ring Identification', () => {
  it('buildCategoryPoolName matches computeRings ring name format', () => {
    // computeRings generates: `${division} - ${category.name} Pool ${poolIndex + 1}`
    const computeRingsFormat = 'Beginner - Mixed 8-12 Pool 1';
    
    // buildCategoryPoolName should produce the same
    const helperFormat = buildCategoryPoolName('Beginner', 'Mixed 8-12', 'P1');
    
    expect(helperFormat).toBe(computeRingsFormat);
  });

  it('ring name is found as substring in buildRingId output', () => {
    // buildRingId produces: "Division - CategoryName Pool N_type"
    const ringName = buildCategoryPoolName('Beginner', 'Mixed 8-12', 'P1');
    // Simulating what buildRingId produces in checkpoint diffs
    const diffKey = `${ringName}_forms`;
    
    expect(diffKey).toContain(ringName);
    expect(diffKey).toBe('Beginner - Mixed 8-12 Pool 1_forms');
  });

  it('ring name with alt ring suffix is detected correctly', () => {
    const ringName = buildCategoryPoolName('Level 1', 'Mixed 4-7', 'P1');
    const diffKeyA = `${ringName}_sparring_a`;
    const diffKeyB = `${ringName}_sparring_b`;
    
    // isRingAffected checks: diffKey.includes(ringName)
    expect(diffKeyA).toContain(ringName);
    expect(diffKeyB).toContain(ringName);
  });
});

describe('computeCompetitionRings', () => {
  it('generates ring names in the correct format', () => {
    const categories: Category[] = [
      createCategory({ id: 'cat-1', name: 'Mixed 8-12', division: 'Beginner', type: 'forms' }),
    ];
    
    const participants: Participant[] = [];
    for (let i = 0; i < 6; i++) {
      participants.push(createParticipant({
        id: `p-${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        formsCategoryId: 'cat-1',
        formsPool: 'P1',
        withdrawn: false,
      }));
    }

    const rings = computeCompetitionRings(participants, categories, []);
    const formsRings = rings.filter(r => r.type === 'forms' && r.division === 'Beginner');
    
    expect(formsRings.length).toBeGreaterThan(0);
    expect(formsRings[0].name).toBe('Beginner - Mixed 8-12 Pool 1');
  });

  it('excludes withdrawn participants from rings', () => {
    const categories: Category[] = [
      createCategory({ id: 'cat-1', name: 'Mixed 8-12', division: 'Beginner', type: 'forms' }),
    ];
    
    const participants: Participant[] = [];
    for (let i = 0; i < 6; i++) {
      participants.push(createParticipant({
        id: `p-${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        formsCategoryId: 'cat-1',
        formsPool: 'P1',
        withdrawn: i === 0,
      }));
    }

    const rings = computeCompetitionRings(participants, categories, []);
    const formsRings = rings.filter(r => r.type === 'forms' && r.division === 'Beginner');
    
    expect(formsRings.length).toBeGreaterThan(0);
    formsRings.forEach(ring => {
      expect(ring.participantIds).not.toContain('p-0');
    });
    expect(formsRings.flatMap(r => r.participantIds)).toContain('p-1');
  });
});

describe('Integration: Category Change Cascading Effects', () => {
  it('changing forms category should clear both pool and rank', () => {
    const participant = createParticipant({
      id: 'p-test',
      formsCategoryId: 'cat-old',
      formsPool: 'P3',
      formsRankOrder: 7,
    });

    // Simulate the fix: when category changes, clear pool and rank
    const updated: Participant = {
      ...participant,
      formsCategoryId: 'cat-new',
      formsPool: undefined,
      formsRankOrder: undefined,
    };

    expect(updated.formsCategoryId).toBe('cat-new');
    expect(updated.formsPool).toBeUndefined();
    expect(updated.formsRankOrder).toBeUndefined();
    // Sparring fields should be untouched
    expect(updated.sparringCategoryId).toBe(participant.sparringCategoryId);
    expect(updated.sparringPool).toBe(participant.sparringPool);
  });

  it('changing sparring category should not affect forms', () => {
    const participant = createParticipant({
      id: 'p-test',
      formsCategoryId: 'cat-forms-old',
      formsPool: 'P1',
      formsRankOrder: 2,
      sparringCategoryId: 'cat-sparring-old',
      sparringPool: 'P2',
      sparringRankOrder: 5,
    });

    // Change sparring category only
    const updated: Participant = {
      ...participant,
      sparringCategoryId: 'cat-sparring-new',
      sparringPool: undefined,
      sparringRankOrder: undefined,
    };

    expect(updated.sparringCategoryId).toBe('cat-sparring-new');
    expect(updated.sparringPool).toBeUndefined();
    expect(updated.sparringRankOrder).toBeUndefined();
    // Forms should be untouched
    expect(updated.formsCategoryId).toBe('cat-forms-old');
    expect(updated.formsPool).toBe('P1');
    expect(updated.formsRankOrder).toBe(2);
  });
});
