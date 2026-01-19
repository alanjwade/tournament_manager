/**
 * Tests for ring ordering utilities - the functions that order
 * participants within pools for forms and sparring.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { orderFormsRing, orderSparringRing, checkSparringAltRingStatus } from '../src/renderer/utils/ringOrdering';
import {
  createTestParticipant,
  createAssignedParticipant,
  resetTestIds,
} from './fixtures';

describe('ringOrdering', () => {
  beforeEach(() => {
    resetTestIds();
  });

  describe('orderFormsRing', () => {
    it('should assign rank orders to participants in a pool', () => {
      const p1 = createAssignedParticipant('cat1', 'P1', 'forms', 0, {
        id: 'p1',
        firstName: 'Alice',
        lastName: 'Adams',
        school: 'School A',
      });
      const p2 = createAssignedParticipant('cat1', 'P1', 'forms', 0, {
        id: 'p2',
        firstName: 'Bob',
        lastName: 'Brown',
        school: 'School B',
      });
      const p3 = createAssignedParticipant('cat1', 'P1', 'forms', 0, {
        id: 'p3',
        firstName: 'Charlie',
        lastName: 'Clark',
        school: 'School C',
      });

      const result = orderFormsRing([p1, p2, p3], 'cat1', 'P1');

      // All participants should have rank orders assigned
      const r1 = result.find(p => p.id === 'p1')!;
      const r2 = result.find(p => p.id === 'p2')!;
      const r3 = result.find(p => p.id === 'p3')!;

      expect(r1.formsRankOrder).toBeGreaterThanOrEqual(1);
      expect(r2.formsRankOrder).toBeGreaterThanOrEqual(1);
      expect(r3.formsRankOrder).toBeGreaterThanOrEqual(1);

      // All ranks should be unique
      const ranks = [r1.formsRankOrder, r2.formsRankOrder, r3.formsRankOrder];
      expect(new Set(ranks).size).toBe(3);
    });

    it('should not have first three participants from same school if avoidable', () => {
      // Create 4 participants: 3 from School A, 1 from School B
      const participants = [
        createAssignedParticipant('cat1', 'P1', 'forms', 0, {
          id: 'p1',
          firstName: 'Alice',
          lastName: 'Adams',
          school: 'School A',
        }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, {
          id: 'p2',
          firstName: 'Anna',
          lastName: 'Anderson',
          school: 'School A',
        }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, {
          id: 'p3',
          firstName: 'Amy',
          lastName: 'Allen',
          school: 'School A',
        }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, {
          id: 'p4',
          firstName: 'Bob',
          lastName: 'Brown',
          school: 'School B',
        }),
      ];

      const result = orderFormsRing(participants, 'cat1', 'P1');

      // Sort by rank order to check first 3
      const orderedResult = result.sort(
        (a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0)
      );

      const firstThreeSchools = orderedResult.slice(0, 3).map(p => p.school);
      
      // At least one of the first three should be from School B
      expect(firstThreeSchools.filter(s => s === 'School B').length).toBeGreaterThanOrEqual(1);
    });

    it('should not modify participants from other pools', () => {
      const p1 = createAssignedParticipant('cat1', 'P1', 'forms', 5, { id: 'p1' });
      const p2 = createAssignedParticipant('cat1', 'P2', 'forms', 3, { id: 'p2' });

      const result = orderFormsRing([p1, p2], 'cat1', 'P1');

      // P2 should be unchanged (different pool)
      const resultP2 = result.find(p => p.id === 'p2')!;
      expect(resultP2.formsRankOrder).toBe(3);
    });

    it('should return unchanged array if no participants in pool', () => {
      const p1 = createAssignedParticipant('cat2', 'P1', 'forms', 3, { id: 'p1' });

      const result = orderFormsRing([p1], 'cat1', 'P1');

      expect(result[0].formsRankOrder).toBe(3); // Unchanged
    });
  });

  describe('orderSparringRing', () => {
    it('should order participants by height', () => {
      const p1 = createAssignedParticipant('cat1', 'P1', 'sparring', 0, {
        id: 'p1',
        heightFeet: 4,
        heightInches: 6,
        totalHeightInches: 54,
      });
      const p2 = createAssignedParticipant('cat1', 'P1', 'sparring', 0, {
        id: 'p2',
        heightFeet: 5,
        heightInches: 0,
        totalHeightInches: 60,
      });
      const p3 = createAssignedParticipant('cat1', 'P1', 'sparring', 0, {
        id: 'p3',
        heightFeet: 4,
        heightInches: 0,
        totalHeightInches: 48,
      });

      const result = orderSparringRing([p1, p2, p3], 'cat1', 'P1');

      // Sort by rank order
      const orderedResult = result.sort(
        (a, b) => (a.sparringRankOrder || 0) - (b.sparringRankOrder || 0)
      );

      // Should be ordered by height: shortest to tallest
      expect(orderedResult[0].id).toBe('p3'); // 48 inches
      expect(orderedResult[1].id).toBe('p1'); // 54 inches
      expect(orderedResult[2].id).toBe('p2'); // 60 inches
    });

    it('should assign consecutive rank orders', () => {
      const participants = [
        createAssignedParticipant('cat1', 'P1', 'sparring', 0, {
          id: 'p1',
          totalHeightInches: 50,
        }),
        createAssignedParticipant('cat1', 'P1', 'sparring', 0, {
          id: 'p2',
          totalHeightInches: 52,
        }),
        createAssignedParticipant('cat1', 'P1', 'sparring', 0, {
          id: 'p3',
          totalHeightInches: 54,
        }),
      ];

      const result = orderSparringRing(participants, 'cat1', 'P1');

      const ranks = result.map(p => p.sparringRankOrder).sort((a, b) => (a || 0) - (b || 0));
      expect(ranks).toEqual([1, 2, 3]);
    });
  });

  describe('checkSparringAltRingStatus', () => {
    it('should return "none" when no alt rings are assigned', () => {
      const participants = [
        createAssignedParticipant('cat1', 'P1', 'sparring', 1, {
          id: 'p1',
          sparringAltRing: '',
        }),
        createAssignedParticipant('cat1', 'P1', 'sparring', 2, {
          id: 'p2',
          sparringAltRing: '',
        }),
      ];

      const result = checkSparringAltRingStatus(participants, 'cat1', 'P1');

      expect(result.status).toBe('none');
      expect(result.countA).toBe(0);
      expect(result.countB).toBe(0);
      expect(result.countEmpty).toBe(2);
    });

    it('should return "all" when all alt rings are assigned', () => {
      const participants = [
        createAssignedParticipant('cat1', 'P1', 'sparring', 1, {
          id: 'p1',
          sparringAltRing: 'a',
        }),
        createAssignedParticipant('cat1', 'P1', 'sparring', 2, {
          id: 'p2',
          sparringAltRing: 'b',
        }),
      ];

      const result = checkSparringAltRingStatus(participants, 'cat1', 'P1');

      expect(result.status).toBe('all');
      expect(result.countA).toBe(1);
      expect(result.countB).toBe(1);
      expect(result.countEmpty).toBe(0);
    });

    it('should return "mixed" when some alt rings are assigned', () => {
      const participants = [
        createAssignedParticipant('cat1', 'P1', 'sparring', 1, {
          id: 'p1',
          sparringAltRing: 'a',
        }),
        createAssignedParticipant('cat1', 'P1', 'sparring', 2, {
          id: 'p2',
          sparringAltRing: '',
        }),
      ];

      const result = checkSparringAltRingStatus(participants, 'cat1', 'P1');

      expect(result.status).toBe('mixed');
      expect(result.countA).toBe(1);
      expect(result.countB).toBe(0);
      expect(result.countEmpty).toBe(1);
    });

    it('should only count participants in the specified pool', () => {
      const participants = [
        createAssignedParticipant('cat1', 'P1', 'sparring', 1, {
          id: 'p1',
          sparringAltRing: 'a',
        }),
        createAssignedParticipant('cat1', 'P2', 'sparring', 1, {
          id: 'p2',
          sparringAltRing: 'b',
        }),
      ];

      const result = checkSparringAltRingStatus(participants, 'cat1', 'P1');

      // Should only count p1 from P1 pool
      expect(result.countA).toBe(1);
      expect(result.countB).toBe(0);
    });
  });
});
