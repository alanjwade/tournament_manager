/**
 * Tests for ring name formatter utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  formatPoolNameForDisplay,
  formatPoolOnly,
  formatDateWithOrdinal,
  getPhysicalRingId,
  getExpandedRingName,
} from '../src/renderer/utils/ringNameFormatter';

describe('ringNameFormatter', () => {
  describe('formatPoolNameForDisplay', () => {
    it('should format pool name with underscore notation', () => {
      expect(formatPoolNameForDisplay('Male 8-10_P1')).toBe('Male 8-10 Pool 1');
    });

    it('should format multi-digit pool numbers', () => {
      expect(formatPoolNameForDisplay('Female 11-13_P12')).toBe('Female 11-13 Pool 12');
    });

    it('should return unchanged if no pool suffix', () => {
      expect(formatPoolNameForDisplay('Male 8-10')).toBe('Male 8-10');
    });

    it('should handle P2, P3 correctly', () => {
      expect(formatPoolNameForDisplay('Mixed 14-17_P2')).toBe('Mixed 14-17 Pool 2');
      expect(formatPoolNameForDisplay('Mixed 14-17_P3')).toBe('Mixed 14-17 Pool 3');
    });
  });

  describe('formatPoolOnly', () => {
    it('should format P1 to Pool 1', () => {
      expect(formatPoolOnly('P1')).toBe('Pool 1');
    });

    it('should format P2 to Pool 2', () => {
      expect(formatPoolOnly('P2')).toBe('Pool 2');
    });

    it('should handle empty string', () => {
      expect(formatPoolOnly('')).toBe('');
    });

    it('should return unchanged for non-matching format', () => {
      expect(formatPoolOnly('Pool1')).toBe('Pool1');
    });
  });

  describe('formatDateWithOrdinal', () => {
    it('should format date with 1st ordinal', () => {
      const date = new Date(2025, 6, 1); // July 1st, 2025
      expect(formatDateWithOrdinal(date)).toBe('July 1st, 2025');
    });

    it('should format date with 2nd ordinal', () => {
      const date = new Date(2025, 6, 2); // July 2nd, 2025
      expect(formatDateWithOrdinal(date)).toBe('July 2nd, 2025');
    });

    it('should format date with 3rd ordinal', () => {
      const date = new Date(2025, 6, 3); // July 3rd, 2025
      expect(formatDateWithOrdinal(date)).toBe('July 3rd, 2025');
    });

    it('should format date with th ordinal for 4th and beyond', () => {
      const date = new Date(2025, 6, 4); // July 4th, 2025
      expect(formatDateWithOrdinal(date)).toBe('July 4th, 2025');
    });

    it('should handle 11th, 12th, 13th specially', () => {
      expect(formatDateWithOrdinal(new Date(2025, 6, 11))).toBe('July 11th, 2025');
      expect(formatDateWithOrdinal(new Date(2025, 6, 12))).toBe('July 12th, 2025');
      expect(formatDateWithOrdinal(new Date(2025, 6, 13))).toBe('July 13th, 2025');
    });

    it('should handle 21st, 22nd, 23rd', () => {
      expect(formatDateWithOrdinal(new Date(2025, 6, 21))).toBe('July 21st, 2025');
      expect(formatDateWithOrdinal(new Date(2025, 6, 22))).toBe('July 22nd, 2025');
      expect(formatDateWithOrdinal(new Date(2025, 6, 23))).toBe('July 23rd, 2025');
    });
  });

  describe('getPhysicalRingId', () => {
    const mappings = [
      { categoryPoolName: 'Male 8-10_P1', physicalRingName: 'PR1a' },
      { categoryPoolName: 'Male 8-10_P2', physicalRingName: 'PR1b' },
      { categoryPoolName: 'Female 11-13_P1', physicalRingName: 'PR2' },
    ];

    it('should return physical ring ID for matching pool', () => {
      expect(getPhysicalRingId('Male 8-10_P1', mappings)).toBe('PR1a');
    });

    it('should return null for non-matching pool', () => {
      expect(getPhysicalRingId('Unknown_P1', mappings)).toBeNull();
    });

    it('should return correct mapping for different pools', () => {
      expect(getPhysicalRingId('Male 8-10_P2', mappings)).toBe('PR1b');
      expect(getPhysicalRingId('Female 11-13_P1', mappings)).toBe('PR2');
    });
  });

  describe('getExpandedRingName', () => {
    it('should expand PR1 to Ring 1', () => {
      expect(getExpandedRingName('PR1')).toBe('Ring 1');
    });

    it('should expand PR4b to Ring 4b', () => {
      expect(getExpandedRingName('PR4b')).toBe('Ring 4b');
    });

    it('should expand PR12 to Ring 12', () => {
      expect(getExpandedRingName('PR12')).toBe('Ring 12');
    });

    it('should return Unknown Ring for null', () => {
      expect(getExpandedRingName(null)).toBe('Unknown Ring');
    });

    it('should handle lowercase letters', () => {
      expect(getExpandedRingName('PR3a')).toBe('Ring 3a');
    });
  });
});
