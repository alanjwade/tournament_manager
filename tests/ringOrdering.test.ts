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

  describe('Advanced school distribution', () => {
    /**
     * Helper to get school-branch key from participant
     */
    function getSchoolBranchKey(p: any): string {
      return p.branch ? `${p.school} ${p.branch}` : p.school;
    }

    /**
     * Check if consecutive same school-branch combinations appear
     */
    function hasConsecutiveSameSchoolBranch(participants: any[]): boolean {
      for (let i = 1; i < participants.length; i++) {
        if (getSchoolBranchKey(participants[i]) === getSchoolBranchKey(participants[i - 1])) {
          return true;
        }
      }
      return false;
    }

    /**
     * Check if first three participants are from different actual schools
     */
    function hasFirstThreeFromDifferentSchools(participants: any[]): boolean {
      if (participants.length < 3) return true;
      
      const schools = new Set([
        participants[0].school,
        participants[1].school,
        participants[2].school,
      ]);
      
      return schools.size === 3;
    }

    /**
     * Count max consecutive runs of same actual school
     */
    function getMaxConsecutiveSameSchool(participants: any[]): number {
      let maxRun = 1;
      let currentRun = 1;
      
      for (let i = 1; i < participants.length; i++) {
        if (participants[i].school === participants[i - 1].school) {
          currentRun++;
          maxRun = Math.max(maxRun, currentRun);
        } else {
          currentRun = 1;
        }
      }
      
      return maxRun;
    }

    it('should minimize consecutive same school occurrences', () => {
      // Use a more balanced distribution where avoiding 3 consecutive is actually possible
      // 5 PAMA, 3 REMA fc, 2 SMA, 2 EMA lw
      const participants = [
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'p1', firstName: 'P1', lastName: 'A', age: 10, school: 'PAMA' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'p2', firstName: 'P2', lastName: 'A', age: 10, school: 'PAMA' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'p3', firstName: 'P3', lastName: 'A', age: 10, school: 'PAMA' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'p4', firstName: 'P4', lastName: 'A', age: 10, school: 'PAMA' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'p5', firstName: 'P5', lastName: 'A', age: 10, school: 'PAMA' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'r1', firstName: 'R1', lastName: 'A', age: 10, school: 'REMA', branch: 'fc' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'r2', firstName: 'R2', lastName: 'B', age: 10, school: 'REMA', branch: 'fc' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'r3', firstName: 'R3', lastName: 'C', age: 10, school: 'REMA', branch: 'fc' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 's1', firstName: 'S1', lastName: 'A', age: 10, school: 'SMA' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 's2', firstName: 'S2', lastName: 'B', age: 10, school: 'SMA' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'e1', firstName: 'E1', lastName: 'A', age: 10, school: 'EMA', branch: 'lw' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'e2', firstName: 'E2', lastName: 'B', age: 10, school: 'EMA', branch: 'lw' }),
      ];
      
      const result = orderFormsRing(participants, 'cat1', 'P1');
      const ordered = result
        .filter(p => p.formsRankOrder !== undefined)
        .sort((a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0));
      
      const maxRun = getMaxConsecutiveSameSchool(ordered);
      
      // Should avoid 3 consecutive same school - at worst 2 consecutive at very end
      expect(maxRun).toBeLessThanOrEqual(2);
    });

    it('should ensure first three are from different actual schools, not just branches', () => {
      // Recreate failing case where first three had two from REMA school
      const participants = [
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'p1', firstName: 'P1', lastName: 'A', age: 10, school: 'PAMA' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'rj', firstName: 'RJ', lastName: 'A', age: 10, school: 'REMA', branch: 'jt' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'rl', firstName: 'RL', lastName: 'A', age: 10, school: 'REMA', branch: 'lm' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'p2', firstName: 'P2', lastName: 'A', age: 10, school: 'PAMA' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'e1', firstName: 'E1', lastName: 'A', age: 10, school: 'EMA', branch: 'lt' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 's1', firstName: 'S1', lastName: 'A', age: 10, school: 'SMA' }),
      ];
      
      const result = orderFormsRing(participants, 'cat1', 'P1');
      const ordered = result
        .filter(p => p.formsRankOrder !== undefined)
        .sort((a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0));
      
      // First three should be from different actual schools
      expect(hasFirstThreeFromDifferentSchools(ordered)).toBe(true);
    });

    it('should prevent consecutive same school-branch combinations when possible', () => {
      // Use 2 from each school-branch so distribution is possible
      const participants = [
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'r1', firstName: 'R1', lastName: 'A', age: 10, school: 'REMA', branch: 'lm' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'r2', firstName: 'R2', lastName: 'B', age: 10, school: 'REMA', branch: 'lm' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 's1', firstName: 'S1', lastName: 'A', age: 10, school: 'SMA' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 's2', firstName: 'S2', lastName: 'B', age: 10, school: 'SMA' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'p1', firstName: 'P1', lastName: 'A', age: 10, school: 'PAMA' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'p2', firstName: 'P2', lastName: 'B', age: 10, school: 'PAMA' }),
      ];
      
      const result = orderFormsRing(participants, 'cat1', 'P1');
      const ordered = result
        .filter(p => p.formsRankOrder !== undefined)
        .sort((a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0));
      
      // No consecutive same school-branch combos
      expect(hasConsecutiveSameSchoolBranch(ordered)).toBe(false);
    });

    it('should distribute branches within same school using urgency algorithm', () => {
      // 4 from branch A, 1 from branch B - should spread to avoid AAAA...B
      const participants = [
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'a1', firstName: 'A1', lastName: 'Smith', age: 10, school: 'REMA', branch: 'lm' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'a2', firstName: 'A2', lastName: 'Jones', age: 10, school: 'REMA', branch: 'lm' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'a3', firstName: 'A3', lastName: 'White', age: 10, school: 'REMA', branch: 'lm' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'a4', firstName: 'A4', lastName: 'Brown', age: 10, school: 'REMA', branch: 'lm' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: 'b1', firstName: 'B1', lastName: 'Davis', age: 10, school: 'REMA', branch: 'bf' }),
      ];
      
      const result = orderFormsRing(participants, 'cat1', 'P1');
      const ordered = result
        .filter(p => p.formsRankOrder !== undefined)
        .sort((a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0));
      
      // Find where the 'bf' participant is positioned
      const bfIndex = ordered.findIndex(p => p.branch === 'bf');
      
      // Should not be at position 4 (the last position, index 4)
      // The urgency algorithm should place it earlier
      expect(bfIndex).toBeLessThan(4);
    });

    it('should handle highly imbalanced distribution (20-5-2)', () => {
      const participants: any[] = [];
      
      // 20 from School A
      for (let i = 0; i < 20; i++) {
        participants.push(
          createAssignedParticipant('cat1', 'P1', 'forms', 0, {
            id: `a${i}`,
            firstName: `A${i}`,
            lastName: 'Last',
            age: 10,
            school: 'SchoolA',
          })
        );
      }
      
      // 5 from School B
      for (let i = 0; i < 5; i++) {
        participants.push(
          createAssignedParticipant('cat1', 'P1', 'forms', 0, {
            id: `b${i}`,
            firstName: `B${i}`,
            lastName: 'Last',
            age: 10,
            school: 'SchoolB',
          })
        );
      }
      
      // 2 from School C
      for (let i = 0; i < 2; i++) {
        participants.push(
          createAssignedParticipant('cat1', 'P1', 'forms', 0, {
            id: `c${i}`,
            firstName: `C${i}`,
            lastName: 'Last',
            age: 10,
            school: 'SchoolC',
          })
        );
      }
      
      const result = orderFormsRing(participants, 'cat1', 'P1');
      const ordered = result
        .filter(p => p.formsRankOrder !== undefined)
        .sort((a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0));
      
      // First 3 should be from different schools
      expect(hasFirstThreeFromDifferentSchools(ordered)).toBe(true);
      
      // Minority schools should appear in first half to break up majority school
      const firstHalf = ordered.slice(0, Math.ceil(ordered.length / 2));
      const schoolBCount = firstHalf.filter(p => p.school === 'SchoolB').length;
      const schoolCCount = firstHalf.filter(p => p.school === 'SchoolC').length;
      
      expect(schoolBCount).toBeGreaterThan(0);
      expect(schoolCCount).toBeGreaterThan(0);
    });

    it('should produce deterministic ordering for same input', () => {
      const participants = [
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: '1', firstName: 'Alice', lastName: 'Smith', age: 10, school: 'SchoolA' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: '2', firstName: 'Bob', lastName: 'Jones', age: 11, school: 'SchoolB' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: '3', firstName: 'Carol', lastName: 'White', age: 9, school: 'SchoolC' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, { id: '4', firstName: 'Dave', lastName: 'Brown', age: 10, school: 'SchoolA' }),
      ];
      
      const result1 = orderFormsRing([...participants], 'cat1', 'P1');
      const result2 = orderFormsRing([...participants], 'cat1', 'P1');
      
      const order1 = result1
        .filter(p => p.formsRankOrder !== undefined)
        .sort((a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0))
        .map(p => p.id);
      
      const order2 = result2
        .filter(p => p.formsRankOrder !== undefined)
        .sort((a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0))
        .map(p => p.id);
      
      expect(order1).toEqual(order2);
    });
  });
});