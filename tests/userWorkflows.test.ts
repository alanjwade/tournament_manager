/**
 * Integration tests that simulate complete user workflows.
 * These tests verify that multiple utility functions work together correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  moveParticipantToPool,
  withdrawParticipant,
  reinstateParticipant,
} from '../src/renderer/utils/participantPoolUtils';
import { orderFormsRing, orderSparringRing } from '../src/renderer/utils/ringOrdering';
import { computeCompetitionRings } from '../src/renderer/utils/computeRings';
import {
  createTestParticipant,
  createTestCategory,
  createAssignedParticipant,
  resetTestIds,
} from './fixtures';
import { Participant, Category } from '../types/tournament';

describe('User Workflow Integration Tests', () => {
  beforeEach(() => {
    resetTestIds();
  });

  describe('Add a new participant to a pool', () => {
    it('should add participant to pool and maintain ring consistency', () => {
      // Setup: Existing pool with 2 participants
      const category = createTestCategory({ id: 'cat1', name: 'Male 8-10' });
      let participants: Participant[] = [
        createAssignedParticipant('cat1', 'P1', 'forms', 1, { id: 'p1', firstName: 'Alice' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 2, { id: 'p2', firstName: 'Bob' }),
      ];

      // Action: Add a new participant to the pool
      const newParticipant = createTestParticipant({
        id: 'p3',
        firstName: 'Charlie',
        formsDivision: 'Level 1',
        competingForms: true,
      });
      participants = [...participants, newParticipant];
      participants = moveParticipantToPool(participants, 'p3', 'forms', 'cat1', 'P1');

      // Verify: Participant is in pool with rank order
      const charlie = participants.find(p => p.id === 'p3')!;
      expect(charlie.formsCategoryId).toBe('cat1');
      expect(charlie.formsPool).toBe('P1');
      expect(charlie.formsRankOrder).toBe(1);

      // Verify: Competition ring includes all 3 participants
      const rings = computeCompetitionRings(participants, [category], []);
      expect(rings.length).toBe(1);
      expect(rings[0].participantIds).toContain('p1');
      expect(rings[0].participantIds).toContain('p2');
      expect(rings[0].participantIds).toContain('p3');
    });
  });

  describe('Move participant between pools', () => {
    it('should move participant from one pool to another within same category', () => {
      const category = createTestCategory({ id: 'cat1', numPools: 2 });
      let participants: Participant[] = [
        createAssignedParticipant('cat1', 'P1', 'forms', 1, { id: 'p1' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 2, { id: 'p2' }),
        createAssignedParticipant('cat1', 'P2', 'forms', 1, { id: 'p3' }),
      ];

      // Action: Move p2 from P1 to P2
      participants = moveParticipantToPool(participants, 'p2', 'forms', 'cat1', 'P2');

      // Verify: p2 is now in P2
      const p2 = participants.find(p => p.id === 'p2')!;
      expect(p2.formsPool).toBe('P2');

      // Verify: p1 is still rank 1 in P1
      const p1 = participants.find(p => p.id === 'p1')!;
      expect(p1.formsRankOrder).toBe(1);

      // Verify: Rings are computed correctly
      // New format uses "Pool 1" instead of "P1"
      const rings = computeCompetitionRings(participants, [category], []);
      const pool1Ring = rings.find(r => r.name?.includes('Pool 1'));
      const pool2Ring = rings.find(r => r.name?.includes('Pool 2'));

      expect(pool1Ring?.participantIds).toEqual(['p1']);
      expect(pool2Ring?.participantIds).toContain('p2');
      expect(pool2Ring?.participantIds).toContain('p3');
    });

    it('should move participant between different categories', () => {
      const cat1 = createTestCategory({ id: 'cat1', name: 'Male 8-10' });
      const cat2 = createTestCategory({ id: 'cat2', name: 'Male 11-13' });
      let participants: Participant[] = [
        createAssignedParticipant('cat1', 'P1', 'forms', 1, { id: 'p1' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 2, { id: 'p2' }),
      ];

      // Action: Move p2 to cat2
      participants = moveParticipantToPool(participants, 'p2', 'forms', 'cat2', 'P1');

      // Verify: p2 is now in cat2
      const p2 = participants.find(p => p.id === 'p2')!;
      expect(p2.formsCategoryId).toBe('cat2');
      expect(p2.formsPool).toBe('P1');
      expect(p2.formsRankOrder).toBe(1);

      // Verify: cat1 P1 only has p1
      const rings = computeCompetitionRings(participants, [cat1, cat2], []);
      expect(rings.length).toBe(2);
    });
  });

  describe('Withdraw and reinstate participant', () => {
    it('should withdraw and reinstate participant to original pool', () => {
      const category = createTestCategory({ id: 'cat1' });
      let participants: Participant[] = [
        createAssignedParticipant('cat1', 'P1', 'forms', 1, {
          id: 'p1',
          formsDivision: 'Level 1',
        }),
        createAssignedParticipant('cat1', 'P1', 'forms', 2, {
          id: 'p2',
          formsDivision: 'Level 1',
        }),
      ];

      // Action: Withdraw p1
      participants = withdrawParticipant(participants, 'p1', 'forms');

      // Verify: p1 is withdrawn
      let p1 = participants.find(p => p.id === 'p1')!;
      expect(p1.formsCategoryId).toBeUndefined();
      expect(p1.competingForms).toBe(false);
      expect(p1.lastFormsCategoryId).toBe('cat1');
      expect(p1.lastFormsPool).toBe('P1');

      // Verify: p2 is now rank 1
      let p2 = participants.find(p => p.id === 'p2')!;
      expect(p2.formsRankOrder).toBe(1);

      // Verify: Ring only has p2
      let rings = computeCompetitionRings(participants, [category], []);
      expect(rings[0].participantIds).toEqual(['p2']);

      // Action: Reinstate p1
      participants = reinstateParticipant(participants, 'p1', 'forms', 'Level 1', [category]);

      // Verify: p1 is back in the pool
      p1 = participants.find(p => p.id === 'p1')!;
      expect(p1.formsCategoryId).toBe('cat1');
      expect(p1.formsPool).toBe('P1');
      expect(p1.competingForms).toBe(true);

      // Verify: Ring has both participants again
      rings = computeCompetitionRings(participants, [category], []);
      expect(rings[0].participantIds).toContain('p1');
      expect(rings[0].participantIds).toContain('p2');
    });
  });

  describe('Order participants in a pool', () => {
    it('should order forms pool and maintain order across operations', () => {
      const category = createTestCategory({ id: 'cat1' });
      let participants: Participant[] = [
        createAssignedParticipant('cat1', 'P1', 'forms', 0, {
          id: 'p1',
          firstName: 'Alice',
          lastName: 'Adams',
          school: 'School A',
        }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, {
          id: 'p2',
          firstName: 'Bob',
          lastName: 'Brown',
          school: 'School B',
        }),
        createAssignedParticipant('cat1', 'P1', 'forms', 0, {
          id: 'p3',
          firstName: 'Charlie',
          lastName: 'Clark',
          school: 'School C',
        }),
      ];

      // Action: Order the pool
      participants = orderFormsRing(participants, 'cat1', 'P1');

      // Verify: All have rank orders
      const p1 = participants.find(p => p.id === 'p1')!;
      const p2 = participants.find(p => p.id === 'p2')!;
      const p3 = participants.find(p => p.id === 'p3')!;

      expect(p1.formsRankOrder).toBeDefined();
      expect(p2.formsRankOrder).toBeDefined();
      expect(p3.formsRankOrder).toBeDefined();

      // Verify: Ranks are 1, 2, 3
      const ranks = [p1.formsRankOrder, p2.formsRankOrder, p3.formsRankOrder].sort();
      expect(ranks).toEqual([1, 2, 3]);
    });

    it('should order sparring pool by height', () => {
      const category = createTestCategory({ id: 'cat1', type: 'sparring' });
      let participants: Participant[] = [
        createAssignedParticipant('cat1', 'P1', 'sparring', 0, {
          id: 'p1',
          firstName: 'Tall',
          heightFeet: 5,
          heightInches: 6,
          totalHeightInches: 66,
        }),
        createAssignedParticipant('cat1', 'P1', 'sparring', 0, {
          id: 'p2',
          firstName: 'Medium',
          heightFeet: 5,
          heightInches: 0,
          totalHeightInches: 60,
        }),
        createAssignedParticipant('cat1', 'P1', 'sparring', 0, {
          id: 'p3',
          firstName: 'Short',
          heightFeet: 4,
          heightInches: 6,
          totalHeightInches: 54,
        }),
      ];

      // Action: Order by height
      participants = orderSparringRing(participants, 'cat1', 'P1');

      // Verify: Ordered by height (shortest first)
      const ordered = participants.sort(
        (a, b) => (a.sparringRankOrder || 0) - (b.sparringRankOrder || 0)
      );

      expect(ordered[0].firstName).toBe('Short');
      expect(ordered[1].firstName).toBe('Medium');
      expect(ordered[2].firstName).toBe('Tall');
    });
  });

  describe('Remove participant from pool (not withdrawing)', () => {
    it('should remove participant from pool by clearing assignment', () => {
      const category = createTestCategory({ id: 'cat1' });
      let participants: Participant[] = [
        createAssignedParticipant('cat1', 'P1', 'forms', 1, { id: 'p1' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 2, { id: 'p2' }),
        createAssignedParticipant('cat1', 'P1', 'forms', 3, { id: 'p3' }),
      ];

      // Action: Remove p2 from pool (move to undefined)
      participants = moveParticipantToPool(participants, 'p2', 'forms', undefined, undefined);

      // Verify: p2 has no pool assignment
      const p2 = participants.find(p => p.id === 'p2')!;
      expect(p2.formsCategoryId).toBeUndefined();
      expect(p2.formsPool).toBeUndefined();

      // Verify: Remaining participants are renumbered
      const p1 = participants.find(p => p.id === 'p1')!;
      const p3 = participants.find(p => p.id === 'p3')!;
      expect(p1.formsRankOrder).toBe(1);
      expect(p3.formsRankOrder).toBe(2);

      // Verify: Ring only has 2 participants now
      // Note: p2 still has competingForms=true but no pool, so might appear in other pools
      // For this test, let's update competingForms as well to simulate full removal
      participants = participants.map(p =>
        p.id === 'p2' ? { ...p, competingForms: false } : p
      );

      const rings = computeCompetitionRings(participants, [category], []);
      expect(rings[0].participantIds.length).toBe(2);
      expect(rings[0].participantIds).not.toContain('p2');
    });
  });

  describe('Complex multi-step workflow', () => {
    it('should handle: add, move, order, withdraw, reinstate', () => {
      const category = createTestCategory({ id: 'cat1', numPools: 2 });
      let participants: Participant[] = [];

      // Step 1: Add participants to P1
      const p1 = createTestParticipant({ id: 'p1', firstName: 'Alice', school: 'A' });
      const p2 = createTestParticipant({ id: 'p2', firstName: 'Bob', school: 'B' });
      participants = [p1, p2];

      participants = moveParticipantToPool(participants, 'p1', 'forms', 'cat1', 'P1');
      participants = moveParticipantToPool(participants, 'p2', 'forms', 'cat1', 'P1');

      expect(participants.find(p => p.id === 'p1')!.formsPool).toBe('P1');
      expect(participants.find(p => p.id === 'p2')!.formsPool).toBe('P1');

      // Step 2: Add a third participant to P2
      const p3 = createTestParticipant({ id: 'p3', firstName: 'Charlie', school: 'C' });
      participants = [...participants, p3];
      participants = moveParticipantToPool(participants, 'p3', 'forms', 'cat1', 'P2');

      // Step 3: Move p2 from P1 to P2
      participants = moveParticipantToPool(participants, 'p2', 'forms', 'cat1', 'P2');

      // Verify P2 now has p2 and p3 (new format uses "Pool 2" instead of "P2")
      const rings1 = computeCompetitionRings(participants, [category], []);
      const pool2Ring = rings1.find(r => r.name?.includes('Pool 2'));
      expect(pool2Ring?.participantIds).toContain('p2');
      expect(pool2Ring?.participantIds).toContain('p3');

      // Step 4: Order P2
      participants = orderFormsRing(participants, 'cat1', 'P2');

      // Step 5: Withdraw p3
      participants = participants.map(p =>
        p.id === 'p3' ? { ...p, formsDivision: 'Level 1' } : p
      );
      participants = withdrawParticipant(participants, 'p3', 'forms');

      // Verify p3 is withdrawn
      expect(participants.find(p => p.id === 'p3')!.competingForms).toBe(false);

      // Step 6: Reinstate p3
      participants = reinstateParticipant(participants, 'p3', 'forms', 'Level 1', [category]);

      // Verify final state
      const finalP1 = participants.find(p => p.id === 'p1')!;
      const finalP2 = participants.find(p => p.id === 'p2')!;
      const finalP3 = participants.find(p => p.id === 'p3')!;

      expect(finalP1.formsPool).toBe('P1');
      expect(finalP2.formsPool).toBe('P2');
      expect(finalP3.formsPool).toBe('P2'); // Reinstated to original pool
      expect(finalP3.competingForms).toBe(true);

      // Final ring check
      const finalRings = computeCompetitionRings(participants, [category], []);
      expect(finalRings.length).toBe(2);
    });
  });
});
