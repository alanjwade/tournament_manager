/**
 * Regression tests for autoAssignAndOrderCategory.
 *
 * Membership is derived from the participants (their formsCategoryId /
 * sparringCategoryId). Category membership is never read from a stored list, so
 * a participant added or re-assigned outside Category Management still receives
 * a pool and appears in every ring/PDF listing.
 */
import { describe, it, expect } from 'vitest';
import { autoAssignAndOrderCategory } from '../src/renderer/utils/autoAssignAndOrder';
import { createTestParticipant, createTestCategory } from './fixtures';

describe('autoAssignAndOrderCategory', () => {
  it('assigns a pool from participant data', () => {
    const category = createTestCategory({
      id: 'cat1',
      type: 'forms',
      numPools: 2,
    });
    const participant = createTestParticipant({
      id: 'p1',
      formsCategoryId: 'cat1',
      formsPool: undefined,
      competingForms: true,
    });

    const result = autoAssignAndOrderCategory(category, [participant]);

    expect(result[0].formsPool).toBe('P1');
    expect(result[0].formsRankOrder).toBe(1);
  });

  it('distributes participants across all requested pools', () => {
    const category = createTestCategory({
      id: 'cat1',
      type: 'forms',
      numPools: 2,
    });
    const participants = [
      createTestParticipant({ id: 'p1', formsCategoryId: 'cat1', formsPool: undefined }),
      createTestParticipant({ id: 'p2', formsCategoryId: 'cat1', formsPool: undefined }),
      createTestParticipant({ id: 'p3', formsCategoryId: 'cat1', formsPool: undefined }),
    ];

    const result = autoAssignAndOrderCategory(category, participants);
    const pools = result.map(p => p.formsPool);

    expect(pools).toContain('P1');
    expect(pools).toContain('P2');
  });

  it('ignores withdrawn participants and those in other categories', () => {
    const category = createTestCategory({ id: 'cat1', type: 'forms', numPools: 1 });
    const participants = [
      createTestParticipant({ id: 'p1', formsCategoryId: 'cat1', formsPool: undefined }),
      createTestParticipant({ id: 'p2', formsCategoryId: 'cat1', formsPool: undefined, withdrawn: true }),
      createTestParticipant({ id: 'p3', formsCategoryId: 'other', formsPool: undefined }),
    ];

    const result = autoAssignAndOrderCategory(category, participants);
    const byId = new Map(result.map(p => [p.id, p]));

    expect(byId.get('p1')!.formsPool).toBe('P1');
    expect(byId.get('p2')!.formsPool).toBeUndefined();
    expect(byId.get('p3')!.formsPool).toBeUndefined();
  });

  it('keeps sparring participants in their existing forms pool when possible', () => {
    const category = createTestCategory({ id: 'spar1', type: 'sparring', numPools: 2 });
    const participants = [
      createTestParticipant({ id: 'p1', sparringCategoryId: 'spar1', sparringPool: undefined, formsPool: 'P2' }),
    ];

    const result = autoAssignAndOrderCategory(category, participants);
    expect(result[0].sparringPool).toBe('P2');
  });
});
