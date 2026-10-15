/**
 * Tests for participant pool utilities - the core functions for moving
 * participants between pools, withdrawing, and reinstating.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  moveParticipantToPool,
  withdrawParticipant,
  reinstateParticipant,
  copySparringFromForms,
  sparringMirrorsForms,
  shouldMirrorSparringFromForms,
  findDivisionSelectionGaps,
} from '../src/renderer/utils/participantPoolUtils';
import {
  createTestParticipant,
  createTestCategory,
  createAssignedParticipant,
  resetTestIds,
} from './fixtures';

describe('participantPoolUtils', () => {
  beforeEach(() => {
    resetTestIds();
  });

  describe('moveParticipantToPool', () => {
    it('should move a participant to a new empty pool', () => {
      const category = createTestCategory({ id: 'cat1' });
      const participant = createTestParticipant({
        id: 'p1',
        formsCategoryId: undefined,
        formsPool: undefined,
        competingForms: true,
      });

      const result = moveParticipantToPool(
        [participant],
        'p1',
        'forms',
        'cat1',
        'P1'
      );

      expect(result[0].formsCategoryId).toBe('cat1');
      expect(result[0].formsPool).toBe('P1');
      expect(result[0].formsRankOrder).toBe(1);
    });

    it('should move a participant to a pool with existing participants', () => {
      const existingP1 = createAssignedParticipant('cat1', 'P1', 'forms', 1, { id: 'existing1' });
      const existingP2 = createAssignedParticipant('cat1', 'P1', 'forms', 2, { id: 'existing2' });
      const newParticipant = createTestParticipant({
        id: 'new1',
        formsCategoryId: undefined,
        formsPool: undefined,
        competingForms: true,
      });

      const result = moveParticipantToPool(
        [existingP1, existingP2, newParticipant],
        'new1',
        'forms',
        'cat1',
        'P1'
      );

      const moved = result.find(p => p.id === 'new1')!;
      const ex1 = result.find(p => p.id === 'existing1')!;
      const ex2 = result.find(p => p.id === 'existing2')!;

      // New participant should be at position 1
      expect(moved.formsRankOrder).toBe(1);
      // Existing participants should be shifted down
      expect(ex1.formsRankOrder).toBe(2);
      expect(ex2.formsRankOrder).toBe(3);
    });

    it('should renumber old pool when a participant leaves', () => {
      const p1 = createAssignedParticipant('cat1', 'P1', 'forms', 1, { id: 'p1' });
      const p2 = createAssignedParticipant('cat1', 'P1', 'forms', 2, { id: 'p2' });
      const p3 = createAssignedParticipant('cat1', 'P1', 'forms', 3, { id: 'p3' });

      // Move p2 to a different pool
      const result = moveParticipantToPool(
        [p1, p2, p3],
        'p2',
        'forms',
        'cat1',
        'P2'
      );

      const remaining1 = result.find(p => p.id === 'p1')!;
      const remaining3 = result.find(p => p.id === 'p3')!;
      const moved = result.find(p => p.id === 'p2')!;

      // Old pool should be renumbered
      expect(remaining1.formsRankOrder).toBe(1);
      expect(remaining3.formsRankOrder).toBe(2);
      // Moved participant should be at position 1 in new pool
      expect(moved.formsPool).toBe('P2');
      expect(moved.formsRankOrder).toBe(1);
    });

    it('should do nothing when destination is same as current', () => {
      const p = createAssignedParticipant('cat1', 'P1', 'forms', 3, { id: 'p1' });

      const result = moveParticipantToPool(
        [p],
        'p1',
        'forms',
        'cat1',
        'P1'
      );

      // Should be unchanged
      expect(result[0].formsRankOrder).toBe(3);
    });

    it('should clear pool assignment when moving to undefined', () => {
      const p = createAssignedParticipant('cat1', 'P1', 'forms', 1, { id: 'p1' });

      const result = moveParticipantToPool(
        [p],
        'p1',
        'forms',
        undefined,
        undefined
      );

      expect(result[0].formsCategoryId).toBeUndefined();
      expect(result[0].formsPool).toBeUndefined();
      expect(result[0].formsRankOrder).toBeUndefined();
    });

    it('should work for sparring pools', () => {
      const p = createTestParticipant({
        id: 'p1',
        sparringCategoryId: undefined,
        sparringPool: undefined,
        competingSparring: true,
      });

      const result = moveParticipantToPool(
        [p],
        'p1',
        'sparring',
        'cat1',
        'P1'
      );

      expect(result[0].sparringCategoryId).toBe('cat1');
      expect(result[0].sparringPool).toBe('P1');
      expect(result[0].sparringRankOrder).toBe(1);
    });
  });

  describe('withdrawParticipant', () => {
    it('should withdraw a participant from forms and save last assignment', () => {
      const p = createAssignedParticipant('cat1', 'P1', 'forms', 2, {
        id: 'p1',
        formsDivision: 'Level 1',
      });

      const result = withdrawParticipant([p], 'p1', 'forms');
      const withdrawn = result[0];

      expect(withdrawn.formsCategoryId).toBeUndefined();
      expect(withdrawn.formsPool).toBeUndefined();
      expect(withdrawn.formsDivision).toBeNull();
      expect(withdrawn.competingForms).toBe(false);
      // Last assignment should be saved
      expect(withdrawn.lastFormsCategoryId).toBe('cat1');
      expect(withdrawn.lastFormsPool).toBe('P1');
    });

    it('should withdraw a participant from sparring', () => {
      const p = createAssignedParticipant('cat1', 'P1', 'sparring', 2, {
        id: 'p1',
        sparringDivision: 'Level 1',
        sparringAltRing: 'a',
      });

      const result = withdrawParticipant([p], 'p1', 'sparring');
      const withdrawn = result[0];

      expect(withdrawn.sparringCategoryId).toBeUndefined();
      expect(withdrawn.sparringPool).toBeUndefined();
      expect(withdrawn.sparringDivision).toBeNull();
      expect(withdrawn.competingSparring).toBe(false);
      expect(withdrawn.sparringAltRing).toBe('');
      // Last assignment should be saved
      expect(withdrawn.lastSparringCategoryId).toBe('cat1');
      expect(withdrawn.lastSparringPool).toBe('P1');
    });

    it('should withdraw from both forms and sparring', () => {
      const p = createAssignedParticipant('cat1', 'P1', 'both', 1, {
        id: 'p1',
        formsDivision: 'Level 1',
        sparringDivision: 'Level 1',
      });

      const result = withdrawParticipant([p], 'p1', 'both');
      const withdrawn = result[0];

      expect(withdrawn.formsCategoryId).toBeUndefined();
      expect(withdrawn.sparringCategoryId).toBeUndefined();
      expect(withdrawn.formsDivision).toBeNull();
      expect(withdrawn.sparringDivision).toBeNull();
      expect(withdrawn.competingForms).toBe(false);
      expect(withdrawn.competingSparring).toBe(false);
    });

    it('should renumber remaining participants when one withdraws', () => {
      const p1 = createAssignedParticipant('cat1', 'P1', 'forms', 1, { id: 'p1' });
      const p2 = createAssignedParticipant('cat1', 'P1', 'forms', 2, { id: 'p2' });
      const p3 = createAssignedParticipant('cat1', 'P1', 'forms', 3, { id: 'p3' });

      const result = withdrawParticipant([p1, p2, p3], 'p2', 'forms');

      const remaining1 = result.find(p => p.id === 'p1')!;
      const remaining3 = result.find(p => p.id === 'p3')!;

      expect(remaining1.formsRankOrder).toBe(1);
      expect(remaining3.formsRankOrder).toBe(2);
    });
  });

  describe('reinstateParticipant', () => {
    it('should reinstate a participant to their saved pool', () => {
      const category = createTestCategory({ id: 'cat1' });
      const p = createTestParticipant({
        id: 'p1',
        formsCategoryId: undefined,
        formsPool: undefined,
        formsDivision: null,
        competingForms: false,
        lastFormsCategoryId: 'cat1',
        lastFormsPool: 'P1',
      });

      const result = reinstateParticipant([p], 'p1', 'forms', 'Level 1', [category]);
      const reinstated = result[0];

      expect(reinstated.formsCategoryId).toBe('cat1');
      expect(reinstated.formsPool).toBe('P1');
      expect(reinstated.formsDivision).toBe('Level 1');
      expect(reinstated.competingForms).toBe(true);
    });

    it('should just update division/competing if no saved assignment exists', () => {
      const p = createTestParticipant({
        id: 'p1',
        formsCategoryId: undefined,
        formsPool: undefined,
        formsDivision: null,
        competingForms: false,
        lastFormsCategoryId: undefined,
        lastFormsPool: undefined,
      });

      const result = reinstateParticipant([p], 'p1', 'forms', 'Level 1', []);
      const reinstated = result[0];

      expect(reinstated.formsCategoryId).toBeUndefined();
      expect(reinstated.formsPool).toBeUndefined();
      expect(reinstated.formsDivision).toBe('Level 1');
      expect(reinstated.competingForms).toBe(true);
    });
  });

  describe('copySparringFromForms', () => {
    it('should copy forms assignment to sparring', () => {
      const p = createTestParticipant({
        id: 'p1',
        formsCategoryId: 'cat1',
        formsPool: 'P1',
        formsRankOrder: 3,
        formsDivision: 'Level 1',
        competingForms: true,
        sparringCategoryId: undefined,
        sparringPool: undefined,
        sparringDivision: null,
        competingSparring: false,
      });

      const result = copySparringFromForms([p], 'p1');
      const updated = result[0];

      expect(updated.sparringCategoryId).toBe('cat1');
      expect(updated.sparringPool).toBe('P1');
      expect(updated.sparringDivision).toBe('Level 1');
      expect(updated.competingSparring).toBe(true);
    });

    it('should do nothing if forms has no assignment', () => {
      const p = createTestParticipant({
        id: 'p1',
        formsCategoryId: undefined,
        formsPool: undefined,
        sparringCategoryId: 'cat2',
        sparringPool: 'P2',
      });

      const result = copySparringFromForms([p], 'p1');

      // Sparring should be unchanged
      expect(result[0].sparringCategoryId).toBe('cat2');
      expect(result[0].sparringPool).toBe('P2');
    });
  });

  describe('sparringMirrorsForms', () => {
    // Forms and sparring use twin categories that share division/name but have
    // different ids (forms-/sparring- prefix).
    const formsCategory = createTestCategory({
      id: 'forms-Level 1-male-11-12', name: 'Male 11-12', division: 'Level 1', type: 'forms',
    });
    const sparringTwin = createTestCategory({
      id: 'sparring-Level 1-male-11-12', name: 'Male 11-12', division: 'Level 1', type: 'sparring',
    });
    const sparringOtherAge = createTestCategory({
      id: 'sparring-Level 1-male-13-14', name: 'Male 13-14', division: 'Level 1', type: 'sparring',
    });
    const categories = [formsCategory, sparringTwin, sparringOtherAge];

    it('returns true when the participant is not competing in both', () => {
      const p = createTestParticipant({
        id: 'p1',
        competingForms: true,
        competingSparring: false,
        formsCategoryId: formsCategory.id,
        sparringCategoryId: sparringOtherAge.id,
      });
      expect(sparringMirrorsForms(p, categories)).toBe(true);
    });

    it('returns true when sparring points at the forms twin with the same pool', () => {
      const p = createTestParticipant({
        id: 'p1',
        competingForms: true,
        competingSparring: true,
        formsCategoryId: formsCategory.id,
        formsPool: 'P1',
        sparringCategoryId: sparringTwin.id,
        sparringPool: 'P1',
      });
      expect(sparringMirrorsForms(p, categories)).toBe(true);
    });

    it('returns false when the sparring pool differs (split duplicate -> separate)', () => {
      const p = createTestParticipant({
        id: 'p1',
        competingForms: true,
        competingSparring: true,
        formsCategoryId: formsCategory.id,
        formsPool: 'P1',
        sparringCategoryId: sparringTwin.id,
        sparringPool: 'P2',
      });
      expect(sparringMirrorsForms(p, categories)).toBe(false);
    });

    it('returns false when the sparring division/category differs', () => {
      const p = createTestParticipant({
        id: 'p1',
        competingForms: true,
        competingSparring: true,
        formsCategoryId: formsCategory.id,
        formsPool: 'P1',
        sparringCategoryId: sparringOtherAge.id,
        sparringPool: 'P1',
      });
      expect(sparringMirrorsForms(p, categories)).toBe(false);
    });
  });

  describe('shouldMirrorSparringFromForms', () => {
    // Regression: the Quick Edit "same as Forms" checkbox is seeded checked for
    // participants who aren't competing in sparring. Moving only their forms pool
    // must not copy a sparring assignment, otherwise they silently start sparring.
    it('does not mirror when the participant is not competing in sparring', () => {
      expect(shouldMirrorSparringFromForms(true, false)).toBe(false);
    });

    it('mirrors when the checkbox is checked and the participant is competing', () => {
      expect(shouldMirrorSparringFromForms(true, true)).toBe(true);
    });

    it('does not mirror when the checkbox is unchecked', () => {
      expect(shouldMirrorSparringFromForms(false, true)).toBe(false);
    });
  });

  describe('findDivisionSelectionGaps', () => {
    const level1Forms = createTestCategory({
      id: 'forms-Level 1-male-8-12', name: 'Male 8-12', division: 'Level 1', type: 'forms',
    });
    const beginnerForms = createTestCategory({
      id: 'forms-Beginner-male-8-12', name: 'Male 8-12', division: 'Beginner', type: 'forms',
    });
    const beginnerSparring = createTestCategory({
      id: 'sparring-Beginner-male-8-12', name: 'Male 8-12', division: 'Beginner', type: 'sparring',
    });
    const categories = [level1Forms, beginnerForms, beginnerSparring];

    it('reports no gaps when no division is being changed', () => {
      const p = createTestParticipant({ id: 'p1', formsCategoryId: level1Forms.id, formsPool: 'P1' });
      expect(findDivisionSelectionGaps({ formsRankOrder: 2 }, p, categories)).toEqual([]);
    });

    it('flags a forms division change made without a category & pool', () => {
      const p = createTestParticipant({
        id: 'p1', formsDivision: 'Level 1', formsCategoryId: level1Forms.id, formsPool: 'P1', competingForms: true,
      });
      // The old (Level 1) category is left in place while the division moves to Beginner.
      const gaps = findDivisionSelectionGaps({ formsDivision: 'Beginner' }, p, categories);
      expect(gaps).toEqual([{ type: 'forms', division: 'Beginner' }]);
    });

    it('reports no gap once a matching category & pool is chosen', () => {
      const p = createTestParticipant({
        id: 'p1', formsDivision: 'Level 1', formsCategoryId: level1Forms.id, formsPool: 'P1', competingForms: true,
      });
      const gaps = findDivisionSelectionGaps(
        { formsDivision: 'Beginner', formsCategoryId: beginnerForms.id, formsPool: 'P1' },
        p,
        categories
      );
      expect(gaps).toEqual([]);
    });

    it('treats a withdraw (empty division) as needing no selection', () => {
      const p = createTestParticipant({ id: 'p1', formsCategoryId: level1Forms.id, formsPool: 'P1' });
      expect(findDivisionSelectionGaps({ formsDivision: null }, p, categories)).toEqual([]);
    });

    it('flags a sparring division change without a category & pool', () => {
      const p = createTestParticipant({
        id: 'p1', sparringDivision: 'Level 1', sparringCategoryId: 'sparring-Level 1-male-8-12', sparringPool: 'P1',
      });
      const gaps = findDivisionSelectionGaps({ sparringDivision: 'Beginner' }, p, categories);
      expect(gaps).toEqual([{ type: 'sparring', division: 'Beginner' }]);
    });
  });
});
