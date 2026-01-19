/**
 * Test fixtures and factory functions for creating test data.
 */

import { Participant, Category, Division } from '../types/tournament';

let idCounter = 0;

/**
 * Generate a unique ID for test purposes.
 */
export function generateTestId(): string {
  return `test-id-${++idCounter}`;
}

/**
 * Reset the ID counter (call in beforeEach).
 */
export function resetTestIds(): void {
  idCounter = 0;
}

/**
 * Create a test participant with sensible defaults.
 */
export function createTestParticipant(overrides: Partial<Participant> = {}): Participant {
  const id = overrides.id || generateTestId();
  return {
    id,
    firstName: `First${id}`,
    lastName: `Last${id}`,
    age: 10,
    gender: 'male',
    heightFeet: 4,
    heightInches: 6,
    school: 'Test School',
    formsDivision: 'Level 1',
    sparringDivision: 'Level 1',
    competingForms: true,
    competingSparring: true,
    totalHeightInches: 54,
    ...overrides,
  };
}

/**
 * Create a batch of test participants.
 */
export function createTestParticipants(count: number, baseOverrides: Partial<Participant> = {}): Participant[] {
  return Array.from({ length: count }, (_, i) =>
    createTestParticipant({
      ...baseOverrides,
      firstName: `Participant${i + 1}`,
      lastName: `Test`,
      age: 10 + (i % 5), // Ages 10-14
    })
  );
}

/**
 * Create a test category with sensible defaults.
 */
export function createTestCategory(overrides: Partial<Category> = {}): Category {
  const id = overrides.id || generateTestId();
  return {
    id,
    name: overrides.name || `Category ${id}`,
    division: 'Level 1',
    type: 'forms',
    gender: 'male',
    minAge: 8,
    maxAge: 12,
    participantIds: [],
    numPools: 1,
    ...overrides,
  };
}

/**
 * Create default divisions matching the app's initial config.
 */
export function createDefaultDivisions(): Division[] {
  return [
    { name: 'Black Belt', order: 1, numRings: 2, abbreviation: 'BLKB' },
    { name: 'Level 1', order: 2, numRings: 2, abbreviation: 'LVL1' },
    { name: 'Level 2', order: 3, numRings: 2, abbreviation: 'LVL2' },
    { name: 'Level 3', order: 4, numRings: 2, abbreviation: 'LVL3' },
    { name: 'Beginner', order: 5, numRings: 2, abbreviation: 'BGNR' },
  ];
}

/**
 * Create a participant fully assigned to a pool.
 */
export function createAssignedParticipant(
  categoryId: string,
  pool: string,
  type: 'forms' | 'sparring' | 'both',
  rankOrder: number,
  overrides: Partial<Participant> = {}
): Participant {
  const base = createTestParticipant(overrides);
  
  if (type === 'forms' || type === 'both') {
    base.formsCategoryId = categoryId;
    base.formsPool = pool;
    base.formsRankOrder = rankOrder;
    base.competingForms = true;
  }
  
  if (type === 'sparring' || type === 'both') {
    base.sparringCategoryId = categoryId;
    base.sparringPool = pool;
    base.sparringRankOrder = rankOrder;
    base.competingSparring = true;
  }
  
  return base;
}
