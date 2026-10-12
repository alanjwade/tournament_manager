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
