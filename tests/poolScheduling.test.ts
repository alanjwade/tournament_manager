/**
 * Tests for the Ring Map "Auto Assign" pool ordering: youngest age first, then
 * gender (female before male before mixed), then pool number.
 */
import { describe, it, expect } from 'vitest';
import { comparePoolsBySchedule, genderRank, normalizeGender, assignPhysicalRingNames } from '../src/renderer/utils/poolScheduling';
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

describe('assignPhysicalRingNames', () => {
  const pools = (...names: string[]) => names.map((ringName) => ({ ringName }));

  it('assigns pools sequentially when there are enough physical rings', () => {
    const result = assignPhysicalRingNames(
      pools('A Pool 1', 'B Pool 1', 'C Pool 1'),
      5
    );
    expect(result).toEqual(['Ring 1', 'Ring 2', 'Ring 3']);
  });

  it('uses all a-rings before b-rings, splitting at the halfway point', () => {
    const result = assignPhysicalRingNames(
      pools(
        'A Pool 1', 'B Pool 1', 'C Pool 1',
        'D Pool 1', 'E Pool 1', 'F Pool 1'
      ),
      4
    );
    expect(result).toEqual([
      'Ring 1a', 'Ring 2a', 'Ring 3a',
      'Ring 1b', 'Ring 2b', 'Ring 3b',
    ]);
  });

  it('keeps a category that straddles the halfway point together in the a wave', () => {
    // "C Pool 1" and "C Pool 2" fall either side of the nominal half (index 3),
    // so the boundary moves forward and both stay in the a wave.
    const result = assignPhysicalRingNames(
      pools(
        'A Pool 1', 'B Pool 1',
        'C Pool 1', 'C Pool 2',
        'D Pool 1', 'E Pool 1'
      ),
      4
    );
    expect(result).toEqual([
      'Ring 1a', 'Ring 2a', 'Ring 3a', 'Ring 4a',
      'Ring 1b', 'Ring 2b',
    ]);
  });

  it('starts the second wave after the first half of a large schedule', () => {
    const manyPools = Array.from({ length: 20 }, (_, i) => ({
      ringName: `Category ${i + 1} Pool 1`,
    }));
    const result = assignPhysicalRingNames(manyPools, 14);

    expect(result.slice(0, 10)).toEqual([
      'Ring 1a', 'Ring 2a', 'Ring 3a', 'Ring 4a', 'Ring 5a',
      'Ring 6a', 'Ring 7a', 'Ring 8a', 'Ring 9a', 'Ring 10a',
    ]);
    expect(result.slice(10)).toEqual([
      'Ring 1b', 'Ring 2b', 'Ring 3b', 'Ring 4b', 'Ring 5b',
      'Ring 6b', 'Ring 7b', 'Ring 8b', 'Ring 9b', 'Ring 10b',
    ]);
  });

  it('moves the split back to a category edge when the forward edge would exceed the rings', () => {
    // Black Belt has 15 pools and 8 rings. The halfway point lies inside
    // Female 13-14, but keeping that whole category in the a wave would need 9
    // rings, so the split moves back to the edge after Male 11-12: 7 a-rings
    // and 8 b-rings.
    const blackBeltPools = [
      'Black Belt - Mixed 9-10 Pool 1',
      'Black Belt - Mixed 9-10 Pool 2',
      'Black Belt - Female 11-12 Pool 1',
      'Black Belt - Female 11-12 Pool 2',
      'Black Belt - Male 11-12 Pool 1',
      'Black Belt - Male 11-12 Pool 2',
      'Black Belt - Male 11-12 Pool 3',
      'Black Belt - Female 13-14 Pool 1',
      'Black Belt - Female 13-14 Pool 2',
      'Black Belt - Male 13-14 Pool 1',
      'Black Belt - Male 13-14 Pool 2',
      'Black Belt - Female 15-17 Pool 1',
      'Black Belt - Male 15-17 Pool 1',
      'Black Belt - Female 18+ Pool 1',
      'Black Belt - Male 18+ Pool 1',
    ].map((ringName) => ({ ringName }));

    const result = assignPhysicalRingNames(blackBeltPools, 8);

    const firstWave = result.slice(0, 7);
    const secondWave = result.slice(7);

    // Black Belt Female 11-12 and Male 11-12 are entirely in the a wave.
    expect(firstWave).toEqual([
      'Ring 1a', 'Ring 2a', 'Ring 3a', 'Ring 4a', 'Ring 5a', 'Ring 6a', 'Ring 7a',
    ]);
    expect(secondWave).toEqual([
      'Ring 1b', 'Ring 2b', 'Ring 3b', 'Ring 4b',
      'Ring 5b', 'Ring 6b', 'Ring 7b', 'Ring 8b',
    ]);
    expect(result.every((name, index) => {
      const wave = index < 7 ? 'a' : 'b';
      return name.endsWith(wave);
    })).toBe(true);
  });
});
