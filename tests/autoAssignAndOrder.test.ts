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

  /**
   * Pool criteria (age vs height) controls how the members of a category are
   * dealt into pools. Age still defines the category; this only changes the
   * in-category split. Round-robin over the sorted list keeps each pool an even
   * spread of the chosen attribute.
   */
  describe('pool criteria', () => {
    const withHeight = (id: string, inchesTall: number) =>
      createTestParticipant({
        id,
        formsCategoryId: 'cat1',
        formsPool: undefined,
        heightFeet: Math.floor(inchesTall / 12),
        heightInches: inchesTall % 12,
      });

    const poolById = (result: ReturnType<typeof autoAssignAndOrderCategory>) =>
      new Map(result.map(p => [p.id, p.formsPool]));

    it('defaults to strict height bands', () => {
      // No poolCriteria set => height. The shortest half fill P1, the tallest P2.
      const category = createTestCategory({ id: 'cat1', type: 'forms', numPools: 2 });
      const result = autoAssignAndOrderCategory(category, [
        withHeight('short', 48),
        withHeight('mid1', 52),
        withHeight('mid2', 56),
        withHeight('tall', 60),
      ]);

      const pools = poolById(result);
      expect(pools.get('short')).toBe('P1');
      expect(pools.get('mid1')).toBe('P1');
      expect(pools.get('mid2')).toBe('P2');
      expect(pools.get('tall')).toBe('P2');
    });

    it('keeps each height pool a distinct, non-overlapping range', () => {
      // 5 competitors, 2 pools => P1 takes 3 (shortest), P2 takes 2 (tallest).
      const category = createTestCategory({
        id: 'cat1',
        type: 'forms',
        numPools: 2,
        poolCriteria: 'height',
      });
      const result = autoAssignAndOrderCategory(category, [
        withHeight('h48', 48),
        withHeight('h52', 52),
        withHeight('h56', 56),
        withHeight('h60', 60),
        withHeight('h64', 64),
      ]);

      const pools = poolById(result);
      expect(pools.get('h48')).toBe('P1');
      expect(pools.get('h52')).toBe('P1');
      expect(pools.get('h56')).toBe('P1');
      expect(pools.get('h60')).toBe('P2');
      expect(pools.get('h64')).toBe('P2');
    });

    it('follows height rather than age when criteria is height', () => {
      const category = createTestCategory({
        id: 'cat1',
        type: 'forms',
        numPools: 2,
        poolCriteria: 'height',
      });
      // Age order (8 then 12) is the opposite of height order (tall then short).
      const tallYoung = createTestParticipant({
        id: 'tallYoung', formsCategoryId: 'cat1', formsPool: undefined, age: 8,
        heightFeet: 5, heightInches: 0,
      });
      const shortOld = createTestParticipant({
        id: 'shortOld', formsCategoryId: 'cat1', formsPool: undefined, age: 12,
        heightFeet: 4, heightInches: 0,
      });

      const result = autoAssignAndOrderCategory(category, [tallYoung, shortOld]);
      const pools = poolById(result);
      // Shortest goes first => P1; the tallest => P2.
      expect(pools.get('shortOld')).toBe('P1');
      expect(pools.get('tallYoung')).toBe('P2');
    });

    it('distributes by age when criteria is age', () => {
      const category = createTestCategory({
        id: 'cat1',
        type: 'forms',
        numPools: 2,
        poolCriteria: 'age',
      });
      const at = (id: string, age: number) =>
        createTestParticipant({ id, formsCategoryId: 'cat1', formsPool: undefined, age });

      const result = autoAssignAndOrderCategory(category, [
        at('a8', 8), at('a9', 9), at('a10', 10), at('a11', 11),
      ]);

      const pools = poolById(result);
      expect(pools.get('a8')).toBe('P1');
      expect(pools.get('a9')).toBe('P2');
      expect(pools.get('a10')).toBe('P1');
      expect(pools.get('a11')).toBe('P2');
    });
  });
});
