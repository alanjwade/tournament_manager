import { Participant } from '../types/tournament';
import { getEffectiveSparringInfo, getEffectiveFormsInfo } from './computeRings';

/**
 * Check if a sparring ring has mixed alt ring assignments (some set, some not).
 * Returns validation status for alt ring assignments.
 * Only counts participants who are actually participating in sparring.
 */
export function checkSparringAltRingStatus(
  participants: Participant[],
  categoryId: string,
  pool: string
): { status: 'none' | 'all' | 'mixed'; countA: number; countB: number; countEmpty: number } {
  // Filter to only participants who are actually in this sparring ring
  // (those with sparringCategoryId set and matching pool)
  const ringSparringParticipants = participants.filter(p => {
    const effective = getEffectiveSparringInfo(p);
    return effective.categoryId === categoryId && effective.pool === pool;
  });

  // Among those actually participating in sparring, count alt ring assignments
  const countA = ringSparringParticipants.filter(p => p.sparringAltRing === 'a').length;
  const countB = ringSparringParticipants.filter(p => p.sparringAltRing === 'b').length;
  const countEmpty = ringSparringParticipants.filter(p => !p.sparringAltRing).length;

  if (countA === 0 && countB === 0) {
    return { status: 'none', countA, countB, countEmpty };
  } else if (countEmpty === 0) {
    return { status: 'all', countA, countB, countEmpty };
  } else {
    return { status: 'mixed', countA, countB, countEmpty };
  }
}


function hashName(firstName: string, lastName: string): number {
  const str = `${firstName}${lastName}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Order Forms participants by distributing schools and assigning rank order.
 * @param participants - All participants
 * @param categoryId - The category ID (or legacy ringId for backward compatibility)
 * @param pool - Optional: The pool identifier (e.g., "R1", "R2")
 */
export function orderFormsRing(
  participants: Participant[],
  categoryId: string,
  pool?: string
): Participant[] {
  // Filter participants for this ring
  const ringParticipants = participants.filter((p) => {
    const effective = getEffectiveFormsInfo(p);
    // Use effective formsCategoryId and formsPool
    if (pool) {
      return effective.categoryId === categoryId && effective.pool === pool;
    }
    // Without pool, just match category
    return effective.categoryId === categoryId;
  });

  if (ringParticipants.length === 0) {
    return participants; // No changes if no participants in this ring
  }

  // Group by school
  const schoolGroups = new Map<string, Participant[]>();
  
  ringParticipants.forEach((p) => {
    const key = p.branch ? `${p.school}-${p.branch}` : p.school;
    if (!schoolGroups.has(key)) {
      schoolGroups.set(key, []);
    }
    schoolGroups.get(key)!.push(p);
  });

  // Within each school, order by hash and assign fraction
  const participantsWithFraction: Array<Participant & { fraction: number }> = [];

  schoolGroups.forEach((schoolParticipants) => {
    // Sort by hash of name
    const sorted = schoolParticipants.sort((a, b) => {
      const hashA = hashName(a.firstName, a.lastName);
      const hashB = hashName(b.firstName, b.lastName);
      return hashA - hashB;
    });

    // Assign fractions
    sorted.forEach((p, index) => {
      const fraction = (index + 1) / sorted.length;
      participantsWithFraction.push({ ...p, fraction });
    });
  });

  // Sort all participants by fraction
  participantsWithFraction.sort((a, b) => a.fraction - b.fraction);

  // Ensure first three are not from same school if possible
  const result = [...participantsWithFraction];
  
  if (result.length >= 3) {
    const firstThree = result.slice(0, 3);
    const schools = firstThree.map((p) =>
      p.branch ? `${p.school}-${p.branch}` : p.school
    );
    
    // Check if all three are from same school
    if (schools[0] === schools[1] && schools[1] === schools[2]) {
      // Try to swap third with first participant from different school
      for (let i = 3; i < result.length; i++) {
        const school = result[i].branch
          ? `${result[i].school}-${result[i].branch}`
          : result[i].school;
        if (school !== schools[0]) {
          // Swap
          [result[2], result[i]] = [result[i], result[2]];
          break;
        }
      }
    }
    // Check if first two are from same school
    else if (schools[0] === schools[1]) {
      // Try to swap second with first participant from different school
      for (let i = 2; i < result.length; i++) {
        const school = result[i].branch
          ? `${result[i].school}-${result[i].branch}`
          : result[i].school;
        if (school !== schools[0]) {
          // Swap
          [result[1], result[i]] = [result[i], result[1]];
          break;
        }
      }
    }
  }

  // Assign rank order numbers (position for ordering)
  const orderedWithRanks = result.map((p, index) => ({
    ...p,
    formsRankOrder: index + 1,
  }));
  
  // Update all participants, replacing those in this ring with ordered versions
  return participants.map((p) => {
    const ordered = orderedWithRanks.find((op) => op.id === p.id);
    return ordered || p;
  });
}

/**
 * Order Sparring participants by height and assign rank order.
 * Handles sparringAltRing subdivision ('a' and 'b' groups).
 * @param participants - All participants
 * @param categoryId - The category ID (or legacy ringId for backward compatibility)
 * @param pool - Optional: The pool identifier (e.g., "R1", "R2")
 */
export function orderSparringRing(
  participants: Participant[],
  categoryId: string,
  pool?: string
): Participant[] {
  // Filter participants for this ring
  const ringParticipants = participants.filter((p) => {
    const effective = getEffectiveSparringInfo(p);
    // Use effective sparringCategoryId and sparringPool
    if (pool) {
      return effective.categoryId === categoryId && effective.pool === pool;
    }
    // Without pool, just match category
    return effective.categoryId === categoryId;
  });

  if (ringParticipants.length === 0) {
    return participants; // No changes if no participants in this ring
  }

  // Check alt ring distribution
  const altRingA = ringParticipants.filter(p => p.sparringAltRing === 'a');
  const altRingB = ringParticipants.filter(p => p.sparringAltRing === 'b');
  const altRingEmpty = ringParticipants.filter(p => !p.sparringAltRing);
  
  let orderedWithRanks: Participant[];

  // If all participants have alt ring set to 'a' or 'b', split the ring
  if (altRingEmpty.length === 0 && (altRingA.length > 0 || altRingB.length > 0)) {
    // Sort each group by height
    const sortedA = [...altRingA].sort((a, b) => {
      const heightA = a.heightFeet * 12 + a.heightInches;
      const heightB = b.heightFeet * 12 + b.heightInches;
      return heightA - heightB;
    });
    
    const sortedB = [...altRingB].sort((a, b) => {
      const heightA = a.heightFeet * 12 + a.heightInches;
      const heightB = b.heightFeet * 12 + b.heightInches;
      return heightA - heightB;
    });

    // Assign rank orders: 'a' group first (1, 2, 3...), then 'b' group continues
    const rankedA = sortedA.map((p, index) => ({
      ...p,
      sparringRankOrder: index + 1,
    }));

    const rankedB = sortedB.map((p, index) => ({
      ...p,
      sparringRankOrder: rankedA.length + index + 1,
    }));

    orderedWithRanks = [...rankedA, ...rankedB];
  } else {
    // Normal ordering (no alt ring split or mixed)
    const sorted = [...ringParticipants].sort((a, b) => {
      const heightA = a.heightFeet * 12 + a.heightInches;
      const heightB = b.heightFeet * 12 + b.heightInches;
      return heightA - heightB;
    });

    orderedWithRanks = sorted.map((p, index) => ({
      ...p,
      sparringRankOrder: index + 1,
    }));
  }

  // Update all participants, replacing those in this ring with ordered versions
  return participants.map((p) => {
    const ordered = orderedWithRanks.find((op) => op.id === p.id);
    return ordered || p;
  });
}
