/**
 * Tests for the Ring Map "Auto Assign" pool ordering: youngest age first, then
 * gender (female before male before mixed), then pool number.
 */
import { describe, it, expect } from 'vitest';
import { comparePoolsBySchedule, genderRank, normalizeGender } from '../src/renderer/utils/poolScheduling';
import type { SchedulablePool } from '../src/renderer/utils/poolScheduling';

const pool = (ringName: string, minAge: number, gender: string): SchedulablePool => ({
  ringName,
  minAge,
  gender,
});

const order = (pools: SchedulablePool[]) => [...pools].sort(comparePoolsBySchedule).map((p) => p.ringName);

describe('poolScheduling', () => {
  it('ranks female before male before mixed', () => {
    expect(genderRank('female')).toBeLessThan(genderRank('male'));
    expect(genderRank('male')).toBeLessThan(genderRank('mixed'));
    expect(genderRank('anything-else')).toBe(genderRank('mixed'));
  });

  it('sorts by age first', () => {
    const result = order([
      pool('Beginner - Male 11-13 Pool 1', 11, 'male'),
      pool('Beginner - Male 8-10 Pool 1', 8, 'male'),
      pool('Beginner - Male 9-10 Pool 1', 9, 'male'),
    ]);
    expect(result).toEqual([
      'Beginner - Male 8-10 Pool 1',
      'Beginner - Male 9-10 Pool 1',
      'Beginner - Male 11-13 Pool 1',
    ]);
  });

  it('sorts female before male at the same age', () => {
    const result = order([
      pool('Beginner - Male 8-10 Pool 1', 8, 'male'),
      pool('Beginner - Female 8-10 Pool 1', 8, 'female'),
      pool('Beginner - Mixed 8-10 Pool 1', 8, 'mixed'),
    ]);
    expect(result).toEqual([
      'Beginner - Female 8-10 Pool 1',
      'Beginner - Male 8-10 Pool 1',
      'Beginner - Mixed 8-10 Pool 1',
    ]);
  });

  it('falls back to pool number within the same age and gender', () => {
    const result = order([
      pool('Beginner - Female 8-10 Pool 2', 8, 'female'),
      pool('Beginner - Female 8-10 Pool 1', 8, 'female'),
    ]);
    expect(result).toEqual([
      'Beginner - Female 8-10 Pool 1',
      'Beginner - Female 8-10 Pool 2',
    ]);
  });

  it('applies all three keys together', () => {
    const result = order([
      pool('Beginner - Male 11-13 Pool 1', 11, 'male'),
      pool('Beginner - Female 8-10 Pool 2', 8, 'female'),
      pool('Beginner - Male 8-10 Pool 1', 8, 'male'),
      pool('Beginner - Female 8-10 Pool 1', 8, 'female'),
      pool('Beginner - Mixed 8-10 Pool 1', 8, 'mixed'),
    ]);
    expect(result).toEqual([
      'Beginner - Female 8-10 Pool 1',
      'Beginner - Female 8-10 Pool 2',
      'Beginner - Male 8-10 Pool 1',
      'Beginner - Mixed 8-10 Pool 1',
      'Beginner - Male 11-13 Pool 1',
    ]);
  });

  it('treats capitalised gender fields the same as lowercase', () => {
    expect(genderRank('Female')).toBe(0);
    expect(genderRank('Male')).toBe(1);
    expect(genderRank('Mixed')).toBe(2);
    expect(normalizeGender('F')).toBe('female');
    expect(normalizeGender('M')).toBe('male');
    expect(normalizeGender('Women')).toBe('female');
    expect(normalizeGender('Men')).toBe('male');
  });

  it('infers gender from the pool name when the field is ambiguous or wrong', () => {
    // Legacy / mis-typed field: the pool name is authoritative.
    expect(genderRank('', 'Black Belt - Female 11-12 Pool 1')).toBe(0);
    expect(genderRank('', 'Black Belt - Male 11-12 Pool 1')).toBe(1);
    expect(genderRank('mixed', 'Black Belt - Female 11-12 Pool 1')).toBe(0);
  });

  it('groups all female pools together in pool order, then male (black belt case)', () => {
    const result = order([
      // Deliberately unsorted input mirroring the reported listing.
      pool('Black Belt - Female 11-12 Pool 1', 11, 'Female'),
      pool('Black Belt - Male 11-12 Pool 1', 11, 'Male'),
      pool('Black Belt - Male 11-12 Pool 2', 11, 'Male'),
      pool('Black Belt - Female 11-12 Pool 2', 11, 'Female'),
    ]);
    expect(result).toEqual([
      'Black Belt - Female 11-12 Pool 1',
      'Black Belt - Female 11-12 Pool 2',
      'Black Belt - Male 11-12 Pool 1',
      'Black Belt - Male 11-12 Pool 2',
    ]);
  });
});
