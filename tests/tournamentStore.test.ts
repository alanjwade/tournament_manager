/**
 * Tests for the tournament store to ensure state integrity
 * and verify deprecated fields are not persisted.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTournamentStore } from '../src/renderer/store/tournamentStore';
import { createTestParticipant, createTestCategory, resetTestIds } from './fixtures';

// Mock window.electronAPI for checkpoint tests
const mockElectronAPI = {
  saveCheckpoint: vi.fn().mockResolvedValue({ success: true }),
  deleteCheckpoint: vi.fn().mockResolvedValue({ success: true }),
};

global.window = {
  electronAPI: mockElectronAPI,
} as any;

global.confirm = vi.fn().mockReturnValue(true);
global.alert = vi.fn();

describe('Tournament Store', () => {
  beforeEach(() => {
    resetTestIds();
    // Reset the store to initial state
    useTournamentStore.getState().reset();
  });

  describe('State Initialization', () => {
    it('should initialize with empty participants and categories', () => {
      const state = useTournamentStore.getState();
      expect(state.participants).toEqual([]);
      expect(state.categories).toEqual([]);
    });

    it('should not have deprecated competitionRings field in state', () => {
      const state = useTournamentStore.getState();
      // @ts-expect-error - checking for absence of deprecated field
      expect(state.competitionRings).toBeUndefined();
    });

    it('should initialize with default config', () => {
      const state = useTournamentStore.getState();
      expect(state.config).toBeDefined();
      expect(state.config.divisions).toBeDefined();
      expect(state.config.divisions.length).toBeGreaterThan(0);
    });
  });

  describe('Participant Management', () => {
    it('should add participants to store', () => {
      const participant = createTestParticipant({ id: 'p1', firstName: 'Alice' });
      
      useTournamentStore.getState().setParticipants([participant]);
      
      const state = useTournamentStore.getState();
      expect(state.participants.length).toBe(1);
      expect(state.participants[0].id).toBe('p1');
      expect(state.participants[0].firstName).toBe('Alice');
    });

    it('should update a participant', () => {
      const participant = createTestParticipant({ id: 'p1', firstName: 'Alice' });
      useTournamentStore.getState().setParticipants([participant]);
      
      useTournamentStore.getState().updateParticipant('p1', { firstName: 'Alicia' });
      
      const state = useTournamentStore.getState();
      expect(state.participants[0].firstName).toBe('Alicia');
    });

    it('should migrate legacy "not participating" to null', () => {
      const participant = createTestParticipant({ 
        id: 'p1',
        formsDivision: 'not participating' as any,
        competingForms: true,
      });
      
      useTournamentStore.getState().setParticipants([participant]);
      
      const state = useTournamentStore.getState();
      expect(state.participants[0].formsDivision).toBeNull();
      expect(state.participants[0].competingForms).toBe(false);
    });

    it('should migrate "same as forms" to explicit values', () => {
      const participant = createTestParticipant({ 
        id: 'p1',
        formsDivision: 'Level 1',
        sparringDivision: 'same as forms' as any,
        formsCategoryId: 'cat1',
        formsPool: 'P1',
        competingForms: true,
      });
      
      useTournamentStore.getState().setParticipants([participant]);
      
      const state = useTournamentStore.getState();
      expect(state.participants[0].sparringDivision).toBe('Level 1');
      expect(state.participants[0].sparringCategoryId).toBe('cat1');
      expect(state.participants[0].sparringPool).toBe('P1');
      expect(state.participants[0].competingSparring).toBe(true);
    });
  });

  describe('Category Management', () => {
    it('should add categories to store', () => {
      const category = createTestCategory({ id: 'cat1', name: 'Male 8-10' });
      
      useTournamentStore.getState().setCategories([category]);
      
      const state = useTournamentStore.getState();
      expect(state.categories.length).toBe(1);
      expect(state.categories[0].id).toBe('cat1');
    });

    it('should update a category', () => {
      const category = createTestCategory({ id: 'cat1', name: 'Male 8-10' });
      useTournamentStore.getState().setCategories([category]);
      
      useTournamentStore.getState().updateCategory('cat1', { name: 'Male 8-11' });
      
      const state = useTournamentStore.getState();
      expect(state.categories[0].name).toBe('Male 8-11');
    });
  });

  describe('Deprecated Methods', () => {
    it('should not have setCompetitionRings method', () => {
      const state = useTournamentStore.getState();
      // @ts-expect-error - checking for absence of deprecated method
      expect(state.setCompetitionRings).toBeUndefined();
    });

    it('should not have setCategoryPoolMappings method', () => {
      const state = useTournamentStore.getState();
      // @ts-expect-error - checking for absence of unused method
      expect(state.setCategoryPoolMappings).toBeUndefined();
    });
  });

  describe('Physical Ring Mappings', () => {
    it('should update physical ring mapping', () => {
      useTournamentStore.getState().updatePhysicalRingMapping('Male 8-10_P1', 'Ring 1');
      
      const state = useTournamentStore.getState();
      const mapping = state.physicalRingMappings.find(m => m.categoryPoolName === 'Male 8-10_P1');
      
      expect(mapping).toBeDefined();
      expect(mapping?.physicalRingName).toBe('Ring 1');
    });

    it('should replace existing mapping with same category pool name', () => {
      useTournamentStore.getState().updatePhysicalRingMapping('Male 8-10_P1', 'Ring 1');
      useTournamentStore.getState().updatePhysicalRingMapping('Male 8-10_P1', 'Ring 2');
      
      const state = useTournamentStore.getState();
      const mappings = state.physicalRingMappings.filter(m => m.categoryPoolName === 'Male 8-10_P1');
      
      expect(mappings.length).toBe(1);
      expect(mappings[0].physicalRingName).toBe('Ring 2');
    });
  });

  describe('Custom Rings (Grand Champion)', () => {
    it('should add a custom ring', () => {
      const newRing = useTournamentStore.getState().addCustomRing('Special Ring', 'forms');
      
      const state = useTournamentStore.getState();
      const ring = state.customRings.find(r => r.id === newRing.id);
      
      expect(ring).toBeDefined();
      expect(ring?.name).toBe('Special Ring');
      expect(ring?.type).toBe('forms');
    });

    it('should delete a custom ring', () => {
      const newRing = useTournamentStore.getState().addCustomRing('Temp Ring', 'sparring');
      
      useTournamentStore.getState().deleteCustomRing(newRing.id);
      
      const state = useTournamentStore.getState();
      const ring = state.customRings.find(r => r.id === newRing.id);
      
      expect(ring).toBeUndefined();
    });

    it('should add participant to custom ring', () => {
      const participant = createTestParticipant({ id: 'p1' });
      useTournamentStore.getState().setParticipants([participant]);
      
      const newRing = useTournamentStore.getState().addCustomRing('Test Ring', 'forms');
      useTournamentStore.getState().addParticipantToCustomRing(newRing.id, 'p1');
      
      const state = useTournamentStore.getState();
      const ring = state.customRings.find(r => r.id === newRing.id);
      
      expect(ring?.participantIds).toContain('p1');
    });

    it('should remove participant from custom ring', () => {
      const participant = createTestParticipant({ id: 'p1' });
      useTournamentStore.getState().setParticipants([participant]);
      
      const newRing = useTournamentStore.getState().addCustomRing('Test Ring', 'forms');
      useTournamentStore.getState().addParticipantToCustomRing(newRing.id, 'p1');
      useTournamentStore.getState().removeParticipantFromCustomRing(newRing.id, 'p1');
      
      const state = useTournamentStore.getState();
      const ring = state.customRings.find(r => r.id === newRing.id);
      
      expect(ring?.participantIds).not.toContain('p1');
    });
  });

  describe('State Persistence', () => {
    it('should load state from data without deprecated fields', () => {
      const testData = {
        participants: [
          createTestParticipant({ id: 'p1', firstName: 'Alice' })
        ],
        categories: [
          createTestCategory({ id: 'cat1', name: 'Male 8-10' })
        ],
        // Note: No competitionRings field
        config: {
          divisions: [{ name: 'Level 1', order: 1, abbreviation: 'LVL1' }],
          physicalRings: [],
        },
        physicalRingMappings: [],
        categoryPoolMappings: [],
        customRings: [],
        lastSaved: new Date().toISOString(),
      };
      
      useTournamentStore.getState().loadStateFromData(testData);
      
      const state = useTournamentStore.getState();
      expect(state.participants.length).toBe(1);
      expect(state.participants[0].firstName).toBe('Alice');
      expect(state.categories.length).toBe(1);
      // @ts-expect-error - checking for absence of deprecated field
      expect(state.competitionRings).toBeUndefined();
    });
  });

  describe('Checkpoint System', () => {
    it('should create a checkpoint', async () => {
      const participant = createTestParticipant({ id: 'p1', firstName: 'Alice' });
      useTournamentStore.getState().setParticipants([participant]);
      
      const checkpoint = await useTournamentStore.getState().createCheckpoint('Test Checkpoint');
      
      const state = useTournamentStore.getState();
      expect(state.checkpoints.length).toBe(1);
      expect(state.checkpoints[0].name).toBe('Test Checkpoint');
      expect(state.checkpoints[0].state.participants.length).toBe(1);
    });

    it('should delete a checkpoint', async () => {
      const checkpoint = await useTournamentStore.getState().createCheckpoint('Test');
      
      useTournamentStore.getState().deleteCheckpoint(checkpoint.id);
      
      const state = useTournamentStore.getState();
      expect(state.checkpoints.length).toBe(0);
    });

    it('should rename a checkpoint', async () => {
      const checkpoint = await useTournamentStore.getState().createCheckpoint('Old Name');
      
      useTournamentStore.getState().renameCheckpoint(checkpoint.id, 'New Name');
      
      const state = useTournamentStore.getState();
      expect(state.checkpoints[0].name).toBe('New Name');
    });

    it('should load a checkpoint and restore state', async () => {
      // Initial state
      const p1 = createTestParticipant({ id: 'p1', firstName: 'Alice' });
      useTournamentStore.getState().setParticipants([p1]);
      
      const checkpoint = await useTournamentStore.getState().createCheckpoint('Saved State');
      
      // Modify state
      const p2 = createTestParticipant({ id: 'p2', firstName: 'Bob' });
      useTournamentStore.getState().setParticipants([p1, p2]);
      
      // Load checkpoint
      useTournamentStore.getState().loadCheckpoint(checkpoint.id);
      
      const state = useTournamentStore.getState();
      expect(state.participants.length).toBe(1);
      expect(state.participants[0].firstName).toBe('Alice');
    });
  });

  describe('Reset', () => {
    it('should reset store to initial state', () => {
      const participant = createTestParticipant({ id: 'p1' });
      const category = createTestCategory({ id: 'cat1' });
      useTournamentStore.getState().setParticipants([participant]);
      useTournamentStore.getState().setCategories([category]);
      
      useTournamentStore.getState().reset();
      
      const state = useTournamentStore.getState();
      expect(state.participants).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.checkpoints).toEqual([]);
    });
  });

  describe('Checkpoint Diff - Alt Rings and Forms/Sparring Distinction', () => {
    it('should track only the specific alt ring when only its order changes', async () => {
      // Setup: participant in sparring with alt ring 'a'
      const participant = createTestParticipant({
        id: 'p1',
        competingSparring: true,
        sparringCategoryId: 'cat1',
        sparringPool: 'P1',
        sparringAltRing: 'a',
        sparringRankOrder: 1,
      });

      const category = createTestCategory({
        id: 'cat1',
        name: 'Beginner',
        type: 'sparring',
        division: 'Youth',
      });

      useTournamentStore.getState().setParticipants([participant]);
      useTournamentStore.getState().setCategories([category]);

      // Create checkpoint
      const checkpoint = await useTournamentStore.getState().createCheckpoint('Before');

      // Change only the rank order in alt ring 'a'
      useTournamentStore.getState().updateParticipant('p1', { sparringRankOrder: 2 });

      // Get diff
      const diff = useTournamentStore.getState().diffCheckpoint(checkpoint.id);
      
      expect(diff).not.toBeNull();
      // New format uses _sparring_a suffix
      expect(diff!.ringsAffected.has('Beginner_P1_sparring_a')).toBe(true);
      expect(diff!.ringsAffected.has('Beginner_P1_sparring_b')).toBe(false);
      expect(diff!.ringsAffected.has('Beginner_P1_sparring')).toBe(false);
    });

    it('should track forms and sparring separately when both exist with same category/pool', async () => {
      // Setup: participants in forms and sparring with same category/pool
      const formsPart = createTestParticipant({
        id: 'pf1',
        competingForms: true,
        formsCategoryId: 'cat1',
        formsPool: 'P1',
        formsRankOrder: 1,
      });

      const sparringPart = createTestParticipant({
        id: 'ps1',
        competingSparring: true,
        sparringCategoryId: 'cat1',
        sparringPool: 'P1',
        sparringAltRing: '',
        sparringRankOrder: 1,
      });

      const category = createTestCategory({
        id: 'cat1',
        name: 'Beginner',
        division: 'Youth',
      });

      useTournamentStore.getState().setParticipants([formsPart, sparringPart]);
      useTournamentStore.getState().setCategories([category]);

      // Create checkpoint
      const checkpoint = await useTournamentStore.getState().createCheckpoint('Before');

      // Change ONLY forms order
      useTournamentStore.getState().updateParticipant('pf1', { formsRankOrder: 2 });

      // Get diff
      const diff = useTournamentStore.getState().diffCheckpoint(checkpoint.id);
      
      expect(diff).not.toBeNull();
      // Should track forms ring as changed
      expect(diff!.ringsAffected.has('Beginner_P1_forms')).toBe(true);
      // Should NOT track sparring ring as changed (only forms changed)
      expect(diff!.ringsAffected.has('Beginner_P1_sparring')).toBe(false);
    });

    it('should track sparring with multiple alt rings separately', async () => {
      // Setup: two participants in sparring alt rings a and b
      const partA = createTestParticipant({
        id: 'p1',
        competingSparring: true,
        sparringCategoryId: 'cat1',
        sparringPool: 'P1',
        sparringAltRing: 'a',
        sparringRankOrder: 1,
      });

      const partB = createTestParticipant({
        id: 'p2',
        competingSparring: true,
        sparringCategoryId: 'cat1',
        sparringPool: 'P1',
        sparringAltRing: 'b',
        sparringRankOrder: 1,
      });

      const category = createTestCategory({
        id: 'cat1',
        name: 'Beginner',
        type: 'sparring',
        division: 'Youth',
      });

      useTournamentStore.getState().setParticipants([partA, partB]);
      useTournamentStore.getState().setCategories([category]);

      // Create checkpoint
      const checkpoint = await useTournamentStore.getState().createCheckpoint('Before');

      // Change ONLY alt ring 'a' order
      useTournamentStore.getState().updateParticipant('p1', { sparringRankOrder: 2 });

      // Get diff
      const diff = useTournamentStore.getState().diffCheckpoint(checkpoint.id);
      
      expect(diff).not.toBeNull();
      // Should track only alt ring a as changed (new format)
      expect(diff!.ringsAffected.has('Beginner_P1_sparring_a')).toBe(true);
      // Should NOT track alt ring b
      expect(diff!.ringsAffected.has('Beginner_P1_sparring_b')).toBe(false);
      // Should NOT track base sparring ring
      expect(diff!.ringsAffected.has('Beginner_P1_sparring')).toBe(false);
    });

    it('should match ring names correctly when filtering for PDF export', async () => {
      // This test simulates the PDF export scenario where we need to match
      // diff.ringsAffected (which includes suffixes) against competitionRings (which don't)
      
      // Import computeCompetitionRings
      const { computeCompetitionRings } = await import('../src/renderer/utils/computeRings');
      
      // Setup: participants in both forms and sparring with same category/pool
      const formsPart = createTestParticipant({
        id: 'pf1',
        competingForms: true,
        formsCategoryId: 'cat1',
        formsPool: 'P1',
        formsRankOrder: 1,
      });

      const sparringPart = createTestParticipant({
        id: 'ps1',
        competingSparring: true,
        sparringCategoryId: 'cat1',
        sparringPool: 'P1',
        sparringAltRing: '',
        sparringRankOrder: 1,
      });

      const category = createTestCategory({
        id: 'cat1',
        name: 'Beginner',
        division: 'Youth',
      });

      useTournamentStore.getState().setParticipants([formsPart, sparringPart]);
      useTournamentStore.getState().setCategories([category]);

      // Create checkpoint
      const checkpoint = await useTournamentStore.getState().createCheckpoint('Before');

      // Change ONLY forms order
      useTournamentStore.getState().updateParticipant('pf1', { formsRankOrder: 2 });

      // Get diff and compute rings (simulating what happens in app)
      const diff = useTournamentStore.getState().diffCheckpoint(checkpoint.id);
      const state = useTournamentStore.getState();
      const competitionRings = computeCompetitionRings(
        state.participants,
        state.categories,
        state.categoryPoolMappings
      );
      
      expect(diff).not.toBeNull();
      expect(diff!.ringsAffected.has('Beginner_P1_forms')).toBe(true);
      
      // The ring in competitionRings has name "Beginner_P1" (without suffix)
      const formsRing = competitionRings.find(r => 
        r.name === 'Beginner_P1' && r.type === 'forms'
      );
      const sparringRing = competitionRings.find(r => 
        r.name === 'Beginner_P1' && r.type === 'sparring'
      );
      
      expect(formsRing).toBeDefined();
      expect(sparringRing).toBeDefined();
      
      // To correctly match, we need to check if the ring matches the affected name
      // by comparing base name + type suffix
      const shouldIncludeFormsRing = diff!.ringsAffected.has(`${formsRing!.name}_forms`);
      const shouldIncludeSparringRing = diff!.ringsAffected.has(`${sparringRing!.name}_sparring`);
      
      expect(shouldIncludeFormsRing).toBe(true); // Forms changed, should be included
      expect(shouldIncludeSparringRing).toBe(false); // Sparring didn't change
    });

    it('should only track forms when only forms order changes (comprehensive scenario)', async () => {
      // This test covers the user's exact scenario:
      // - Category has both forms and sparring participants
      // - Sparring has alt rings a and b
      // - Only forms order changes
      // - Should only track forms, not sparring alt a or b
      
      const { computeCompetitionRings } = await import('../src/renderer/utils/computeRings');
      
      // Setup: forms participant + sparring participants in alt rings
      const formsPart = createTestParticipant({
        id: 'pf1',
        competingForms: true,
        formsCategoryId: 'cat1',
        formsPool: 'P1',
        formsRankOrder: 1,
      });

      const sparringPartA = createTestParticipant({
        id: 'ps1',
        competingSparring: true,
        sparringCategoryId: 'cat1',
        sparringPool: 'P1',
        sparringAltRing: 'a',
        sparringRankOrder: 1,
      });

      const sparringPartB = createTestParticipant({
        id: 'ps2',
        competingSparring: true,
        sparringCategoryId: 'cat1',
        sparringPool: 'P1',
        sparringAltRing: 'b',
        sparringRankOrder: 1,
      });

      const category = createTestCategory({
        id: 'cat1',
        name: 'Beginner',
        division: 'Youth',
      });

      useTournamentStore.getState().setParticipants([formsPart, sparringPartA, sparringPartB]);
      useTournamentStore.getState().setCategories([category]);

      // Create checkpoint
      const checkpoint = await useTournamentStore.getState().createCheckpoint('Before');

      // Change ONLY forms order
      useTournamentStore.getState().updateParticipant('pf1', { formsRankOrder: 2 });

      // Get diff
      const diff = useTournamentStore.getState().diffCheckpoint(checkpoint.id);
      
      expect(diff).not.toBeNull();
      
      // Should ONLY track forms
      expect(diff!.ringsAffected.has('Beginner_P1_forms')).toBe(true);
      
      // Should NOT track any sparring rings (new format uses _sparring prefix)
      expect(diff!.ringsAffected.has('Beginner_P1_sparring')).toBe(false);
      expect(diff!.ringsAffected.has('Beginner_P1_sparring_a')).toBe(false);
      expect(diff!.ringsAffected.has('Beginner_P1_sparring_b')).toBe(false);
      
      // Verify only 1 ring is affected (forms)
      expect(diff!.ringsAffected.size).toBe(1);
      
      // Verify the correct ring is matched for PDF export
      const state = useTournamentStore.getState();
      const competitionRings = computeCompetitionRings(
        state.participants,
        state.categories,
        state.categoryPoolMappings
      );
      
      const formsRing = competitionRings.find(r => 
        r.name === 'Beginner_P1' && r.type === 'forms'
      );
      const sparringRing = competitionRings.find(r => 
        r.name === 'Beginner_P1' && r.type === 'sparring'
      );
      
      expect(formsRing).toBeDefined();
      expect(sparringRing).toBeDefined();
      
      // Simulate PDF export matching logic (as implemented in PDFExport.tsx)
      const shouldExportForms = Array.from(diff!.ringsAffected).some(ringName => {
        // Skip if explicitly sparring
        if (ringName.endsWith('_sparring')) {
          return false;
        }
        const baseRingName = ringName.replace(/_(forms|sparring|[a-z])$/i, '');
        return (formsRing!.name === ringName || formsRing!.name === baseRingName);
      });
      
      const shouldExportSparring = Array.from(diff!.ringsAffected).some(ringName => {
        // Skip if explicitly forms
        if (ringName.endsWith('_forms')) {
          return false;
        }
        const baseRingName = ringName.replace(/_(forms|sparring|[a-z])$/i, '');
        return (sparringRing!.name === ringName || sparringRing!.name === baseRingName);
      });
      
      expect(shouldExportForms).toBe(true);  // Should export forms
      expect(shouldExportSparring).toBe(false); // Should NOT export sparring
    });
  });
});