import { describe, it, expect, beforeEach } from 'vitest';
import {
  findTwinCategory,
  ensureTwinCategory,
  assignSparringFromForms,
} from '../src/renderer/utils/categoryUtils';
import type { Category } from '../types/tournament';
import { createTestCategory, createTestParticipant, resetTestIds } from './fixtures';

describe('categoryUtils', () => {
  beforeEach(() => resetTestIds());

  const formsCategory = (overrides: Partial<Category> = {}): Category =>
    createTestCategory({
      id: 'forms-Level 1-male-8-12',
      name: 'Male 8-12',
      type: 'forms',
      division: 'Level 1',
      gender: 'male',
      minAge: 8,
      maxAge: 12,
      numPools: 2,
      ...overrides,
    });

  describe('findTwinCategory', () => {
    it('finds the sparring category with matching criteria', () => {
      const forms = formsCategory();
      const sparring = formsCategory({ id: 'sparring-Level 1-male-8-12', type: 'sparring' });
      expect(findTwinCategory([forms, sparring], forms)).toBe(sparring);
    });

    it('returns undefined when no twin exists', () => {
      const forms = formsCategory();
      expect(findTwinCategory([forms], forms)).toBeUndefined();
    });
  });

  describe('ensureTwinCategory', () => {
    it('creates a sparring twin with the canonical id when missing', () => {
      const forms = formsCategory();
      const { categories, twin } = ensureTwinCategory([forms], forms);

      expect(twin.type).toBe('sparring');
      expect(twin.id).toBe('sparring-Level 1-male-8-12');
      expect(twin.numPools).toBe(2);
      expect(categories).toHaveLength(2);
      expect(categories).toContainEqual(twin);
    });

    it('reuses an existing twin', () => {
      const forms = formsCategory();
      const sparring = formsCategory({ id: 'sparring-Level 1-male-8-12', type: 'sparring' });
      const { categories, twin } = ensureTwinCategory([forms, sparring], forms);
      expect(twin).toBe(sparring);
      expect(categories).toHaveLength(2);
    });
  });

  describe('assignSparringFromForms', () => {
    it('creates the matching sparring category and copies the forms pool', () => {
      const forms = formsCategory();
      const participant = createTestParticipant({
        formsDivision: 'Level 1',
        sparringDivision: null,
        formsCategoryId: forms.id,
        formsPool: 'P1',
        competingForms: true,
        competingSparring: false,
      });

      const { categories, updates } = assignSparringFromForms(participant, [forms]);

      expect(categories).toHaveLength(2);
      expect(updates.competingSparring).toBe(true);
      expect(updates.sparringDivision).toBe('Level 1');
      expect(updates.sparringCategoryId).toBe('sparring-Level 1-male-8-12');
      expect(updates.sparringPool).toBe('P1');
    });

    it('uses an existing sparring category without adding a new one', () => {
      const forms = formsCategory();
      const sparring = formsCategory({ id: 'sparring-Level 1-male-8-12', type: 'sparring' });
      const participant = createTestParticipant({
        formsDivision: 'Level 1',
        formsCategoryId: forms.id,
        formsPool: 'P2',
        competingForms: true,
        competingSparring: false,
      });

      const { categories, updates } = assignSparringFromForms(participant, [forms, sparring]);

      expect(categories).toHaveLength(2);
      expect(updates.sparringCategoryId).toBe('sparring-Level 1-male-8-12');
      expect(updates.sparringPool).toBe('P2');
    });

    it('keeps an already-assigned sparring category', () => {
      const forms = formsCategory();
      const sparring = formsCategory({ id: 'sparring-Level 1-male-8-12', type: 'sparring' });
      const participant = createTestParticipant({
        formsDivision: 'Level 1',
        sparringDivision: 'Level 1',
        formsCategoryId: forms.id,
        formsPool: 'P1',
        sparringCategoryId: sparring.id,
        sparringPool: 'P3',
        competingForms: true,
        competingSparring: false,
      });

      const { categories, updates } = assignSparringFromForms(participant, [forms, sparring]);

      expect(categories).toHaveLength(2);
      expect(updates.sparringCategoryId).toBeUndefined();
      expect(updates.sparringPool).toBe('P3');
    });

    it('only enables sparring when there is no forms category to pair with', () => {
      const participant = createTestParticipant({
        formsDivision: 'Level 1',
        competingForms: true,
        competingSparring: false,
      });

      const { categories, updates } = assignSparringFromForms(participant, []);

      expect(categories).toHaveLength(0);
      expect(updates.competingSparring).toBe(true);
      expect(updates.sparringDivision).toBe('Level 1');
      expect(updates.sparringCategoryId).toBeUndefined();
    });

    it('leaves the shared forms physical-ring mapping untouched when keys match', () => {
      const forms = formsCategory();
      const participant = createTestParticipant({
        formsDivision: 'Level 1',
        formsCategoryId: forms.id,
        formsPool: 'P1',
        competingForms: true,
        competingSparring: false,
      });
      const mappings = [{ categoryPoolName: 'Level 1 - Male 8-12 Pool 1', physicalRingName: 'Ring 2' }];

      const { physicalRingMappings } = assignSparringFromForms(participant, [forms], mappings);

      // The sparring twin shares the forms key, so no extra mapping is needed.
      expect(physicalRingMappings).toBe(mappings);
    });

    it('copies the forms physical-ring mapping when the sparring key differs', () => {
      const forms = formsCategory(); // name "Male 8-12"
      const sparring = formsCategory({
        id: 'sparring-Level 1-male-8-10',
        name: 'Male 8-10',
        type: 'sparring',
        maxAge: 10,
      });
      const participant = createTestParticipant({
        formsDivision: 'Level 1',
        sparringDivision: 'Level 1',
        formsCategoryId: forms.id,
        formsPool: 'P1',
        sparringCategoryId: sparring.id,
        sparringPool: 'P2',
        competingForms: true,
        competingSparring: false,
      });
      const mappings = [{ categoryPoolName: 'Level 1 - Male 8-12 Pool 1', physicalRingName: 'Ring 2' }];

      const { physicalRingMappings, updates } = assignSparringFromForms(participant, [forms, sparring], mappings);

      expect(updates.sparringCategoryId).toBeUndefined();
      expect(updates.sparringPool).toBe('P2');
      expect(physicalRingMappings).toContainEqual({
        categoryPoolName: 'Level 1 - Male 8-10 Pool 2',
        physicalRingName: 'Ring 2',
      });
    });
  });
});
