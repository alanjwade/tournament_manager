/**
 * Tests for school abbreviation utility.
 */

import { describe, it, expect } from 'vitest';
import { getSchoolAbbreviation } from '../src/renderer/utils/schoolAbbreviations';

describe('schoolAbbreviations', () => {
  const testAbbreviations = {
    'Longmont': 'REMA LM',
    'Broomfield': 'REMA BF',
    'Fort Collins': 'REMA FC',
    'Littleton': 'EMA LT',
    'Personal Achievement': 'PAMA',
    'Success': 'SMA',
    'Exclusive Martial Arts - Littleton': 'EMA LT',
  };

  describe('getSchoolAbbreviation', () => {
    it('should return abbreviation for exact match', () => {
      const result = getSchoolAbbreviation('Longmont', testAbbreviations);
      expect(result).toBe('REMA LM');
    });

    it('should match case-insensitively', () => {
      const result = getSchoolAbbreviation('longmont', testAbbreviations);
      expect(result).toBe('REMA LM');
    });

    it('should match with different casing', () => {
      const result = getSchoolAbbreviation('BROOMFIELD', testAbbreviations);
      expect(result).toBe('REMA BF');
    });

    it('should return original name when no abbreviations provided', () => {
      const result = getSchoolAbbreviation('Unknown School', undefined);
      expect(result).toBe('Unknown School');
    });

    it('should return original name when no match found', () => {
      const result = getSchoolAbbreviation('Unknown School', testAbbreviations);
      expect(result).toBe('Unknown School');
    });

    it('should match partial school names', () => {
      // If school name contains a key or vice versa
      const result = getSchoolAbbreviation('Success Martial Arts', testAbbreviations);
      expect(result).toBe('SMA');
    });

    it('should handle full school name with location', () => {
      const result = getSchoolAbbreviation('Exclusive Martial Arts - Littleton', testAbbreviations);
      expect(result).toBe('EMA LT');
    });

    it('should trim whitespace', () => {
      const result = getSchoolAbbreviation('  Longmont  ', testAbbreviations);
      expect(result).toBe('REMA LM');
    });
  });
});
