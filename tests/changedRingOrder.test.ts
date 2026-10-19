import { describe, it, expect } from 'vitest';
import { collectChangedRings } from '../src/renderer/utils/changedRingOrder';
import type { Category, CompetitionRing, Division } from '../types/tournament';

function category(id: string, name: string, division: string, type: 'forms' | 'sparring'): Category {
  return {
    id,
    name,
    division,
    type,
    gender: 'mixed',
    minAge: 10,
    maxAge: 12,
    numPools: 2,
  };
}

function ring(
  id: string,
  name: string,
  division: string,
  type: 'forms' | 'sparring',
  categoryId: string
): CompetitionRing {
  return {
    id,
    name,
    division,
    type,
    categoryId,
    physicalRingId: '',
    participantIds: [],
  };
}

describe('collectChangedRings', () => {
  it('orders by division, category, pool, then forms before sparring', () => {
    const divisions: Division[] = [
      { name: 'Black Belt', order: 1 },
      { name: 'Beginner', order: 2 },
    ];

    const categories: Category[] = [
      category('f-female', 'Female 11-12', 'Black Belt', 'forms'),
      category('s-female', 'Female 11-12', 'Black Belt', 'sparring'),
      category('f-male', 'Male 11-12', 'Black Belt', 'forms'),
      category('s-male', 'Male 11-12', 'Black Belt', 'sparring'),
      category('f-beginner', 'Female 8-10', 'Beginner', 'forms'),
      category('s-beginner', 'Female 8-10', 'Beginner', 'sparring'),
    ];

    const rings: CompetitionRing[] = [
      ring('beginner-forms', 'Beginner - Female 8-10 Pool 1', 'Beginner', 'forms', 'f-beginner'),
      ring('male-forms', 'Black Belt - Male 11-12 Pool 1', 'Black Belt', 'forms', 'f-male'),
      ring('female-p2-sparring', 'Black Belt - Female 11-12 Pool 2', 'Black Belt', 'sparring', 's-female'),
      ring('female-p1-sparring', 'Black Belt - Female 11-12 Pool 1', 'Black Belt', 'sparring', 's-female'),
      ring('female-p1-forms', 'Black Belt - Female 11-12 Pool 1', 'Black Belt', 'forms', 'f-female'),
      ring('female-p2-forms', 'Black Belt - Female 11-12 Pool 2', 'Black Belt', 'forms', 'f-female'),
      ring('male-sparring', 'Black Belt - Male 11-12 Pool 1', 'Black Belt', 'sparring', 's-male'),
      ring('beginner-sparring', 'Beginner - Female 8-10 Pool 1', 'Beginner', 'sparring', 's-beginner'),
    ];

    const changed = new Set<string>();
    rings.forEach((r) => changed.add(`${r.name}_${r.type}`));

    const ordered = collectChangedRings(rings, changed, categories, divisions);

    expect(ordered.map((item) => item.ring.id)).toEqual([
      'female-p1-forms',
      'female-p1-sparring',
      'female-p2-forms',
      'female-p2-sparring',
      'male-forms',
      'male-sparring',
      'beginner-forms',
      'beginner-sparring',
    ]);
  });

  it('keeps the alt-ring filter for sparring rings', () => {
    const divisions: Division[] = [{ name: 'Black Belt', order: 1 }];
    const categories: Category[] = [
      category('s-female', 'Female 11-12', 'Black Belt', 'sparring'),
    ];
    const sparring = ring(
      'sparring-a',
      'Black Belt - Female 11-12 Pool 1',
      'Black Belt',
      'sparring',
      's-female'
    );

    const ordered = collectChangedRings(
      [sparring],
      new Set(['Black Belt - Female 11-12 Pool 1_sparring_a']),
      categories,
      divisions
    );

    expect(ordered).toHaveLength(1);
    expect(ordered[0].altRings).toEqual(new Set(['a']));
  });
});
