/**
 * Ordering of category pools for physical-ring scheduling (Ring Map → Auto
 * Assign). Pools are ordered youngest-age-first, then by gender with female
 * before male before mixed, then by pool number. Keeping this pure makes the
 * ordering easy to test independently of the Ring Map UI.
 */

/** A category pool reduced to the fields needed to schedule physical rings. */
export interface SchedulablePool {
  /** Display name, e.g. "Beginner - Female 8-10 Pool 1". */
  ringName: string;
  /** Youngest age covered by the category. */
  minAge: number;
  /** Category gender: 'male' | 'female' | 'mixed'. */
  gender: string;
}

/**
 * Normalise a pool's gender using both its `gender` field and its display name.
 *
 * The display name is consulted first because it always encodes the gender
 * ("Female 11-12"), which guards against legacy or capitalised field values
 * (e.g. "Female"/"Male"/"F"/"M", "Women"/"Men"). Only when neither source is
 * conclusive do we fall back to 'mixed'.
 */
export function normalizeGender(gender: string, label = ''): 'female' | 'male' | 'mixed' {
  const text = `${gender || ''} ${label || ''}`.toLowerCase();

  if (/\bfemale\b/.test(text) || /\bwomen\b/.test(text) || /\bgirls?\b/.test(text)) return 'female';
  if (/\bmale\b/.test(text) || /\bmen\b/.test(text) || /\bboys?\b/.test(text)) return 'male';
  if (/\bmixed\b/.test(text) || /\bco-?ed\b/.test(text)) return 'mixed';

  // Fall back to the raw gender field for single-letter encodings ("f"/"m").
  const g = (gender || '').trim().toLowerCase();
  if (g.startsWith('f')) return 'female';
  if (g.startsWith('m')) return 'male';
  return 'mixed';
}

/**
 * Sort rank for a pool's gender: female `0`, male `1`, mixed/unknown `2`.
 * The optional `label` (the pool display name) is used to disambiguate when the
 * `gender` field is capitalised, abbreviated or missing.
 */
export function genderRank(gender: string, label = ''): number {
  switch (normalizeGender(gender, label)) {
    case 'female':
      return 0;
    case 'male':
      return 1;
    default:
      return 2;
  }
}

/** Extract the numeric pool number from a ring name (defaults to 0). */
function poolNumber(ringName: string): number {
  return parseInt(ringName.match(/Pool\s*(\d+)/i)?.[1] ?? '0', 10);
}

/**
 * Order pools for physical-ring assignment: youngest age first, then gender
 * (female, then male, then mixed), then pool number.
 */
export function comparePoolsBySchedule(a: SchedulablePool, b: SchedulablePool): number {
  if (a.minAge !== b.minAge) return a.minAge - b.minAge;

  const aGender = genderRank(a.gender, a.ringName);
  const bGender = genderRank(b.gender, b.ringName);
  if (aGender !== bGender) return aGender - bGender;

  return poolNumber(a.ringName) - poolNumber(b.ringName);
}

/** Strip the trailing "Pool N" from a pool name to identify its category. */
function categoryKey(ringName: string): string {
  return ringName.replace(/\s*Pool\s*\d+\s*$/i, '').trim();
}

/**
 * Build the physical-ring names for an ordered list of pools.
 *
 * When there are no more pools than physical rings, pools are assigned
 * sequentially to `Ring 1`, `Ring 2`, ...
 *
 * When there are more pools than rings, the schedule is split into two waves:
 * the first uses the `a` suffix (`Ring 1a`, `Ring 2a`, ...) and the second uses
 * `b` (`Ring 1b`, `Ring 2b`, ...). The split is placed on the category edge
 * closest to the halfway point while keeping both waves within the physical
 * ring count, so a category is never spread across `a` and `b`.
 */
export function assignPhysicalRingNames(
  pools: { ringName: string }[],
  numPhysicalRings: number
): string[] {
  const ringCount = Math.max(1, Math.floor(numPhysicalRings));
  const poolCount = pools.length;

  if (poolCount === 0) return [];
  if (poolCount <= ringCount) {
    return pools.map((_, index) => `Ring ${index + 1}`);
  }

  // Positions where a new category starts. Splitting here keeps every
  // category's pools inside a single wave.
  const categoryEdges: number[] = [];
  for (let index = 1; index < poolCount; index++) {
    if (categoryKey(pools[index - 1].ringName) !== categoryKey(pools[index].ringName)) {
      categoryEdges.push(index);
    }
  }

  // Each wave must fit on the available physical rings.
  const minSplit = Math.max(1, poolCount - ringCount);
  const maxSplit = Math.min(ringCount, poolCount - 1);
  const halfway = poolCount / 2;

  const pickClosestEdge = (edges: number[]): number | null =>
    edges.reduce<number | null>((best, edge) => {
      if (best === null) return edge;
      const edgeDistance = Math.abs(edge - halfway);
      const bestDistance = Math.abs(best - halfway);
      if (edgeDistance < bestDistance) return edge;
      // On a tie, put the extra pool (and the category) in the `a` wave.
      if (edgeDistance === bestDistance && edge > best) return edge;
      return best;
    }, null);

  const fittingEdges = categoryEdges.filter(
    (edge) => edge >= minSplit && edge <= maxSplit
  );

  const splitIndex =
    pickClosestEdge(fittingEdges) ??
    pickClosestEdge(categoryEdges) ??
    Math.min(maxSplit, Math.max(minSplit, Math.ceil(halfway)));

  return pools.map((_, index) => {
    const isFirstWave = index < splitIndex;
    const suffix = isFirstWave ? 'a' : 'b';
    const withinWave = isFirstWave ? index : index - splitIndex;
    return `Ring ${(withinWave % ringCount) + 1}${suffix}`;
  });
}
