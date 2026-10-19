/**
 * Collect the rings changed since the baseline and put them in the order used by
 * "Print Changed & Set Baseline":
 *
 *   division (configured order) -> category -> pool -> forms -> sparring
 *
 * This intentionally spans every division, regardless of the division filter
 * currently shown in the Ring Overview.
 */
import type { Category, CompetitionRing, Division } from '../types/tournament';
import { isRingAffected } from './ringNameFormatter';

export interface ChangedRing {
  ring: CompetitionRing;
  /** For sparring, the specific alt rings that changed (undefined = all). */
  altRings?: Set<string>;
}

function poolNumber(ringName: string): number {
  const match = ringName.match(/Pool\s*(\d+)/i) ?? ringName.match(/_P(\d+)$/i);
  return match ? parseInt(match[1], 10) : 0;
}

export function collectChangedRings(
  competitionRings: CompetitionRing[],
  changedRings: Set<string>,
  categories: Category[],
  divisions: Division[]
): ChangedRing[] {
  const divisionOrder = new Map(divisions.map((d) => [d.name, d.order]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const items = competitionRings
    .map((ring) => {
      const ringName = ring.name || ring.division;
      const affected = isRingAffected(ringName, ring.type, changedRings);
      if (!affected.isAffected) return null;

      const category = categoryMap.get(ring.categoryId);
      return {
        ring,
        altRings: affected.altRings,
        divisionOrder: divisionOrder.get(ring.division) ?? 999,
        categoryName: category?.name ?? ringName,
        poolNumber: poolNumber(ringName),
        typeOrder: ring.type === 'forms' ? 0 : 1,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  items.sort((a, b) => {
    if (a.divisionOrder !== b.divisionOrder) return a.divisionOrder - b.divisionOrder;
    if (a.ring.division !== b.ring.division) return a.ring.division.localeCompare(b.ring.division);

    const categoryCompare = a.categoryName.localeCompare(b.categoryName);
    if (categoryCompare !== 0) return categoryCompare;

    if (a.poolNumber !== b.poolNumber) return a.poolNumber - b.poolNumber;

    if (a.typeOrder !== b.typeOrder) return a.typeOrder - b.typeOrder;

    return (a.ring.name || '').localeCompare(b.ring.name || '');
  });

  return items.map(({ ring, altRings }) => ({ ring, altRings }));
}
