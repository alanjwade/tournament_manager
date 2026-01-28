/**
 * Tests for PDF page management to ensure content never overlays
 * 
 * These tests verify that when multiple PDF generators are called in sequence,
 * each generator gets its own page(s) and never overlays content from another generator.
 */

import jsPDF from 'jspdf';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateFormsScoringSheets } from '../src/renderer/utils/pdfGenerators/formsScoringSheet';
import { generateSparringBrackets } from '../src/renderer/utils/pdfGenerators/sparringBracket';
import { Participant, CompetitionRing, PhysicalRing } from '../src/renderer/types/tournament';

// Mock participant factory
function createParticipant(id: string, overrides: Partial<Participant> = {}): Participant {
  return {
    id,
    firstName: `First${id}`,
    lastName: `Last${id}`,
    age: 25,
    belt: 'black',
    heightFeet: 5,
    heightInches: 10,
    weight: 150,
    school: 'Test School',
    gender: 'M',
    formsRankOrder: parseInt(id) || 0,
    sparringRankOrder: parseInt(id) || 0,
    ...overrides,
  };
}

// Mock competition ring factory
function createFormsRing(name: string, division: string, participantIds: string[]): CompetitionRing {
  return {
    id: `forms-${name}`,
    name,
    division,
    type: 'forms',
    categoryId: `cat-${name}`,
    participantIds,
  };
}

function createSparringRing(name: string, division: string, participantIds: string[]): CompetitionRing {
  return {
    id: `sparring-${name}`,
    name,
    division,
    type: 'sparring',
    categoryId: `cat-${name}`,
    participantIds,
  };
}

describe('PDF Page Management', () => {
  let physicalRings: PhysicalRing[];
  let physicalRingMappings: { categoryPoolName: string; physicalRingName: string }[];

  beforeEach(() => {
    physicalRings = [
      { id: 'PR1', name: 'PR1', color: '#FF0000' },
      { id: 'PR2', name: 'PR2', color: '#00FF00' },
      { id: 'PR3', name: 'PR3', color: '#0000FF' },
    ];
    // New format: "Division - CategoryName Pool N"
    physicalRingMappings = [
      { categoryPoolName: 'Youth - Youth Pool 1', physicalRingName: 'PR1' },
      { categoryPoolName: 'Youth - Youth Pool 2', physicalRingName: 'PR2' },
      { categoryPoolName: 'Adult - Adult Pool 1', physicalRingName: 'PR3' },
    ];
  });

  describe('Forms scoring sheet generation', () => {
    it('should use initial blank page for first ring', () => {
      const participants = [createParticipant('1'), createParticipant('2')];
      const rings = [createFormsRing('Youth - Youth Pool 1', 'Youth', ['1', '2'])];

      const doc = generateFormsScoringSheets(
        participants,
        rings,
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings
      );

      // Should have 1 content page (no masterPdf means no trailing blank)
      expect(doc.getNumberOfPages()).toBe(1);
    });

    it('should add page for each additional ring', () => {
      const participants = [
        createParticipant('1'),
        createParticipant('2'),
        createParticipant('3'),
        createParticipant('4'),
      ];
      const rings = [
        createFormsRing('Youth - Youth Pool 1', 'Youth', ['1', '2']),
        createFormsRing('Youth - Youth Pool 2', 'Youth', ['3', '4']),
      ];

      const doc = generateFormsScoringSheets(
        participants,
        rings,
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings
      );

      // Should have 2 content pages
      expect(doc.getNumberOfPages()).toBe(2);
    });

    it('should add trailing blank page when using masterPdf', () => {
      const participants = [createParticipant('1'), createParticipant('2')];
      const rings = [createFormsRing('Youth - Youth Pool 1', 'Youth', ['1', '2'])];

      const masterPdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });

      generateFormsScoringSheets(
        participants,
        rings,
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf
      );

      // Should have 1 content page + 1 trailing blank = 2 pages
      expect(masterPdf.getNumberOfPages()).toBe(2);
    });
  });

  describe('Sparring bracket generation', () => {
    it('should use initial blank page for first ring', () => {
      const participants = [
        createParticipant('1'),
        createParticipant('2'),
        createParticipant('3'),
        createParticipant('4'),
      ];
      const rings = [createSparringRing('Youth - Youth Pool 1', 'Youth', ['1', '2', '3', '4'])];

      const doc = generateSparringBrackets(
        participants,
        rings,
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings
      );

      // Should have 1 content page (no masterPdf means no trailing blank)
      expect(doc.getNumberOfPages()).toBe(1);
    });

    it('should add trailing blank page when using masterPdf', () => {
      const participants = [
        createParticipant('1'),
        createParticipant('2'),
        createParticipant('3'),
        createParticipant('4'),
      ];
      const rings = [createSparringRing('Youth - Youth Pool 1', 'Youth', ['1', '2', '3', '4'])];

      const masterPdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });

      generateSparringBrackets(
        participants,
        rings,
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf
      );

      // Should have 1 content page + 1 trailing blank = 2 pages
      expect(masterPdf.getNumberOfPages()).toBe(2);
    });
  });

  describe('Sequential generator calls (no overlay)', () => {
    it('forms followed by sparring should not overlay', () => {
      const participants = [
        createParticipant('1'),
        createParticipant('2'),
        createParticipant('3'),
        createParticipant('4'),
      ];
      const formsRings = [createFormsRing('Youth - Youth Pool 1', 'Youth', ['1', '2', '3', '4'])];
      const sparringRings = [createSparringRing('Youth - Youth Pool 1', 'Youth', ['1', '2', '3', '4'])];

      const masterPdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });

      // Forms first
      generateFormsScoringSheets(
        participants,
        formsRings,
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf
      );

      const pagesAfterForms = masterPdf.getNumberOfPages();
      // Forms should have: 1 content + 1 trailing blank = 2
      expect(pagesAfterForms).toBe(2);

      // Sparring second
      generateSparringBrackets(
        participants,
        sparringRings,
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf
      );

      const pagesAfterSparring = masterPdf.getNumberOfPages();
      // Should have: 1 forms + 1 sparring (used blank from forms) + 1 new trailing blank = 3
      expect(pagesAfterSparring).toBe(3);

      // After removing trailing blank: 2 content pages
      masterPdf.deletePage(masterPdf.getNumberOfPages());
      expect(masterPdf.getNumberOfPages()).toBe(2);
    });

    it('two forms rings followed by two sparring rings should not overlay', () => {
      const participants = [
        createParticipant('1'),
        createParticipant('2'),
        createParticipant('3'),
        createParticipant('4'),
        createParticipant('5'),
        createParticipant('6'),
      ];
      const formsRings = [
        createFormsRing('Youth - Youth Pool 1', 'Youth', ['1', '2', '3']),
        createFormsRing('Youth - Youth Pool 2', 'Youth', ['4', '5', '6']),
      ];
      const sparringRings = [
        createSparringRing('Youth - Youth Pool 1', 'Youth', ['1', '2', '3']),
        createSparringRing('Youth - Youth Pool 2', 'Youth', ['4', '5', '6']),
      ];

      const masterPdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });

      // All forms first
      generateFormsScoringSheets(
        participants,
        formsRings,
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf
      );

      const pagesAfterForms = masterPdf.getNumberOfPages();
      // Forms should have: 2 content + 1 trailing blank = 3
      expect(pagesAfterForms).toBe(3);

      // All sparring second (simulating multiple calls like TournamentDay does)
      generateSparringBrackets(
        participants,
        [sparringRings[0]],
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf
      );

      const pagesAfterSparring1 = masterPdf.getNumberOfPages();
      // Should have: 2 forms + 1 sparring (used blank) + 1 trailing blank = 4
      expect(pagesAfterSparring1).toBe(4);

      generateSparringBrackets(
        participants,
        [sparringRings[1]],
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf
      );

      const pagesAfterSparring2 = masterPdf.getNumberOfPages();
      // Should have: 2 forms + 2 sparring (second used blank from first) + 1 trailing blank = 5
      expect(pagesAfterSparring2).toBe(5);

      // After removing trailing blank: 4 content pages
      masterPdf.deletePage(masterPdf.getNumberOfPages());
      expect(masterPdf.getNumberOfPages()).toBe(4);
    });

    it('multiple sparring calls should not overlay', () => {
      const participants = [
        createParticipant('1'),
        createParticipant('2'),
        createParticipant('3'),
        createParticipant('4'),
        createParticipant('5'),
        createParticipant('6'),
      ];
      const sparringRings = [
        createSparringRing('Youth - Youth Pool 1', 'Youth', ['1', '2', '3']),
        createSparringRing('Youth - Youth Pool 2', 'Youth', ['4', '5', '6']),
      ];

      const masterPdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });

      // First sparring call
      generateSparringBrackets(
        participants,
        [sparringRings[0]],
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf
      );

      const pagesAfterSparring1 = masterPdf.getNumberOfPages();
      // Should have: 1 content + 1 trailing blank = 2
      expect(pagesAfterSparring1).toBe(2);

      // Second sparring call
      generateSparringBrackets(
        participants,
        [sparringRings[1]],
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf
      );

      const pagesAfterSparring2 = masterPdf.getNumberOfPages();
      // Should have: 2 content (second used blank from first) + 1 trailing blank = 3
      expect(pagesAfterSparring2).toBe(3);

      // After removing trailing blank: 2 content pages
      masterPdf.deletePage(masterPdf.getNumberOfPages());
      expect(masterPdf.getNumberOfPages()).toBe(2);
    });

    it('forms only should have no trailing blank after cleanup', () => {
      const participants = [createParticipant('1'), createParticipant('2')];
      const formsRings = [createFormsRing('Youth - Youth Pool 1', 'Youth', ['1', '2'])];

      const masterPdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });

      generateFormsScoringSheets(
        participants,
        formsRings,
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf
      );

      const pagesBeforeCleanup = masterPdf.getNumberOfPages();
      expect(pagesBeforeCleanup).toBe(2); // 1 content + 1 trailing blank

      // Simulate TournamentDay cleanup
      if (masterPdf.getNumberOfPages() > 1) {
        masterPdf.deletePage(masterPdf.getNumberOfPages());
      }

      expect(masterPdf.getNumberOfPages()).toBe(1); // Just the content page
    });
  });

  describe('Alt ring scenarios', () => {
    it('forms + alt A + alt B should produce 3 separate pages', () => {
      // Create participants with proper sparring category info for alt ring detection
      const participants = [
        createParticipant('1', { sparringAltRing: 'a', sparringCategoryId: 'cat-Youth - Youth Pool 1', sparringPool: 'P1' }),
        createParticipant('2', { sparringAltRing: 'a', sparringCategoryId: 'cat-Youth - Youth Pool 1', sparringPool: 'P1' }),
        createParticipant('3', { sparringAltRing: 'b', sparringCategoryId: 'cat-Youth - Youth Pool 1', sparringPool: 'P1' }),
        createParticipant('4', { sparringAltRing: 'b', sparringCategoryId: 'cat-Youth - Youth Pool 1', sparringPool: 'P1' }),
      ];
      const formsRings = [createFormsRing('Youth - Youth Pool 1', 'Youth', ['1', '2', '3', '4'])];
      const sparringRings = [createSparringRing('Youth - Youth Pool 1', 'Youth', ['1', '2', '3', '4'])];

      const masterPdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });

      // Forms
      generateFormsScoringSheets(
        participants,
        formsRings,
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf
      );

      const pagesAfterForms = masterPdf.getNumberOfPages();
      expect(pagesAfterForms).toBe(2); // 1 content + 1 trailing blank

      // Sparring with alt ring filter for both A and B
      generateSparringBrackets(
        participants,
        sparringRings,
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf,
        undefined,
        false,
        { altRingFilter: new Set(['a', 'b']) }
      );

      const pagesAfterSparring = masterPdf.getNumberOfPages();
      // Should have: 1 forms + 1 sparring alt A (used blank from forms) + 1 alt B + 1 trailing blank = 4
      // Note: Alt A uses the blank page from forms, alt B gets its own page from internal isFirstBracketForRing logic
      expect(pagesAfterSparring).toBe(4);

      // After cleanup
      masterPdf.deletePage(masterPdf.getNumberOfPages());
      expect(masterPdf.getNumberOfPages()).toBe(3); // forms, alt A, alt B
    });

    it('only alt A change should produce 2 pages (forms + alt A)', () => {
      const participants = [
        createParticipant('1', { sparringAltRing: 'a', sparringCategoryId: 'cat-Youth - Youth Pool 1', sparringPool: 'P1' }),
        createParticipant('2', { sparringAltRing: 'a', sparringCategoryId: 'cat-Youth - Youth Pool 1', sparringPool: 'P1' }),
        createParticipant('3', { sparringAltRing: 'b', sparringCategoryId: 'cat-Youth - Youth Pool 1', sparringPool: 'P1' }),
        createParticipant('4', { sparringAltRing: 'b', sparringCategoryId: 'cat-Youth - Youth Pool 1', sparringPool: 'P1' }),
      ];
      const formsRings = [createFormsRing('Youth - Youth Pool 1', 'Youth', ['1', '2', '3', '4'])];
      const sparringRings = [createSparringRing('Youth - Youth Pool 1', 'Youth', ['1', '2', '3', '4'])];

      const masterPdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });

      // Forms
      generateFormsScoringSheets(
        participants,
        formsRings,
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf
      );

      // Sparring with alt ring filter for only A
      generateSparringBrackets(
        participants,
        sparringRings,
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf,
        undefined,
        false,
        { altRingFilter: new Set(['a']) }
      );

      const pagesAfterSparring = masterPdf.getNumberOfPages();
      // Should have: 1 forms + 1 sparring alt A + 1 trailing blank = 3
      expect(pagesAfterSparring).toBe(3);

      // After cleanup
      masterPdf.deletePage(masterPdf.getNumberOfPages());
      expect(masterPdf.getNumberOfPages()).toBe(2); // forms, alt A
    });
  });

  describe('Edge cases', () => {
    it('empty rings array should not add pages', () => {
      const participants: Participant[] = [];
      const rings: CompetitionRing[] = [];

      const masterPdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
      const initialPages = masterPdf.getNumberOfPages();

      generateFormsScoringSheets(
        participants,
        rings,
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf
      );

      // Should not add any pages for empty rings
      expect(masterPdf.getNumberOfPages()).toBe(initialPages);
    });

    it('mixed divisions should each get own pages', () => {
      const participants = [
        createParticipant('1'),
        createParticipant('2'),
        createParticipant('3'),
        createParticipant('4'),
      ];
      const youthFormsRings = [createFormsRing('Youth - Youth Pool 1', 'Youth', ['1', '2'])];
      const adultFormsRings = [createFormsRing('Adult - Adult Pool 1', 'Adult', ['3', '4'])];

      const masterPdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });

      // Youth forms
      generateFormsScoringSheets(
        participants,
        youthFormsRings,
        physicalRings,
        'Youth',
        undefined,
        physicalRingMappings,
        masterPdf
      );

      const pagesAfterYouth = masterPdf.getNumberOfPages();
      expect(pagesAfterYouth).toBe(2); // 1 content + 1 trailing blank

      // Adult forms
      generateFormsScoringSheets(
        participants,
        adultFormsRings,
        physicalRings,
        'Adult',
        undefined,
        physicalRingMappings,
        masterPdf
      );

      const pagesAfterAdult = masterPdf.getNumberOfPages();
      // Should have: 1 youth + 1 adult (used blank) + 1 trailing blank = 3
      expect(pagesAfterAdult).toBe(3);

      // After cleanup
      masterPdf.deletePage(masterPdf.getNumberOfPages());
      expect(masterPdf.getNumberOfPages()).toBe(2); // youth, adult
    });
  });
});
