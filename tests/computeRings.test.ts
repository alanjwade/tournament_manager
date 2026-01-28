/**
 * Tests for computeRings utility - the core function that generates
 * competition rings from participant assignments.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { computeCompetitionRings, getEffectiveFormsInfo, getEffectiveSparringInfo } from '../src/renderer/utils/computeRings';
import {
  createTestParticipant,
  createTestCategory,
  createAssignedParticipant,
  resetTestIds,
} from './fixtures';

describe('computeRings', () => {
  beforeEach(() => {
    resetTestIds();
  });

  describe('getEffectiveFormsInfo', () => {
    it('should return forms category and pool directly', () => {
      const p = createTestParticipant({
        formsCategoryId: 'cat1',
        formsPool: 'P1',
      });

      const result = getEffectiveFormsInfo(p);

      expect(result.categoryId).toBe('cat1');
      expect(result.pool).toBe('P1');
    });

    it('should return undefined for unassigned participants', () => {
      const p = createTestParticipant({
        formsCategoryId: undefined,
        formsPool: undefined,
      });

      const result = getEffectiveFormsInfo(p);

      expect(result.categoryId).toBeUndefined();
      expect(result.pool).toBeUndefined();
    });
  });

  describe('getEffectiveSparringInfo', () => {
    it('should return sparring category and pool directly', () => {
      const p = createTestParticipant({
        sparringCategoryId: 'cat1',
        sparringPool: 'P2',
      });

      const result = getEffectiveSparringInfo(p);

      expect(result.categoryId).toBe('cat1');
      expect(result.pool).toBe('P2');
    });
  });

  describe('computeCompetitionRings', () => {
    it('should create a ring for participants in the same forms pool', () => {
      const category = createTestCategory({ 
        id: 'cat1', 
        name: 'Male 8-10',
        division: 'Level 1',
        type: 'forms',
        gender: 'male',
        minAge: 8,
        maxAge: 10,
      });

      const p1 = createAssignedParticipant('cat1', 'P1', 'forms', 1, { id: 'p1' });
      const p2 = createAssignedParticipant('cat1', 'P1', 'forms', 2, { id: 'p2' });

      const rings = computeCompetitionRings([p1, p2], [category], []);

      expect(rings.length).toBe(1);
      expect(rings[0].type).toBe('forms');
      expect(rings[0].categoryId).toBe('cat1');
      expect(rings[0].participantIds).toContain('p1');
      expect(rings[0].participantIds).toContain('p2');
      expect(rings[0].division).toBe('Level 1');
    });

    it('should create separate rings for different pools in the same category', () => {
      const category = createTestCategory({ 
        id: 'cat1',
        numPools: 2,
      });

      const p1 = createAssignedParticipant('cat1', 'P1', 'forms', 1, { id: 'p1' });
      const p2 = createAssignedParticipant('cat1', 'P2', 'forms', 1, { id: 'p2' });

      const rings = computeCompetitionRings([p1, p2], [category], []);

      expect(rings.length).toBe(2);
      
      // New format uses "Pool 1" instead of "P1"
      const pool1Ring = rings.find(r => r.name?.includes('Pool 1'));
      const pool2Ring = rings.find(r => r.name?.includes('Pool 2'));
      
      expect(pool1Ring?.participantIds).toEqual(['p1']);
      expect(pool2Ring?.participantIds).toEqual(['p2']);
    });

    it('should create separate rings for forms and sparring', () => {
      const category = createTestCategory({ id: 'cat1' });

      const p1 = createAssignedParticipant('cat1', 'P1', 'both', 1, { id: 'p1' });

      const rings = computeCompetitionRings([p1], [category], []);

      expect(rings.length).toBe(2);
      
      const formsRing = rings.find(r => r.type === 'forms');
      const sparringRing = rings.find(r => r.type === 'sparring');
      
      expect(formsRing?.participantIds).toContain('p1');
      expect(sparringRing?.participantIds).toContain('p1');
    });

    it('should not include participants who are not competing', () => {
      const category = createTestCategory({ id: 'cat1' });

      const p1 = createAssignedParticipant('cat1', 'P1', 'forms', 1, {
        id: 'p1',
        competingForms: true,
      });
      const p2 = createTestParticipant({
        id: 'p2',
        formsCategoryId: 'cat1',
        formsPool: 'P1',
        competingForms: false, // Not competing
      });

      const rings = computeCompetitionRings([p1, p2], [category], []);

      expect(rings.length).toBe(1);
      expect(rings[0].participantIds).toEqual(['p1']);
    });

    it('should not create rings for categories with no participants', () => {
      const category = createTestCategory({ id: 'cat1' });

      const rings = computeCompetitionRings([], [category], []);

      expect(rings.length).toBe(0);
    });

    it('should handle multiple categories and divisions', () => {
      const cat1 = createTestCategory({ 
        id: 'cat1', 
        division: 'Level 1',
        name: 'Male 8-10',
      });
      const cat2 = createTestCategory({ 
        id: 'cat2', 
        division: 'Level 2',
        name: 'Female 11-13',
      });

      const p1 = createAssignedParticipant('cat1', 'P1', 'forms', 1, {
        id: 'p1',
        formsDivision: 'Level 1',
      });
      const p2 = createAssignedParticipant('cat2', 'P1', 'forms', 1, {
        id: 'p2',
        formsDivision: 'Level 2',
      });

      const rings = computeCompetitionRings([p1, p2], [cat1, cat2], []);

      expect(rings.length).toBe(2);
      
      const level1Ring = rings.find(r => r.division === 'Level 1');
      const level2Ring = rings.find(r => r.division === 'Level 2');
      
      expect(level1Ring?.participantIds).toEqual(['p1']);
      expect(level2Ring?.participantIds).toEqual(['p2']);
    });
  });
});
