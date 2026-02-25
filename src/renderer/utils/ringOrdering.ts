import { Participant, Category, CategoryPoolMapping } from '../types/tournament';
import { getEffectiveSparringInfo, getEffectiveFormsInfo, computeCompetitionRings } from './computeRings';

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


/**
 * Hash function combining name and age for repeatable ordering
 */
function hashNameAge(firstName: string, lastName: string, age: number): number {
  const str = `${firstName}${lastName}${age}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get the school abbreviation (first letter of each word, max 4 letters)
 */
function getSchoolAbbreviation(schoolName: string): string {
  return schoolName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 4);
}

/**
 * Get the branch abbreviation (first letter, uppercase)
 */
function getBranchAbbreviation(branchName: string | undefined): string {
  return branchName ? branchName.charAt(0).toUpperCase() : '';
}

/**
 * Distribute branches of a school evenly
 * E.g., if 4 in branch A and 1 in branch B, order would be AABAA
 */
function distributeBranches(participants: Participant[]): Participant[] {
  if (participants.length === 0) return [];
  
  // Group by branch
  const branchGroups = new Map<string, Participant[]>();
  participants.forEach(p => {
    const branchKey = p.branch || '__no_branch__';
    if (!branchGroups.has(branchKey)) {
      branchGroups.set(branchKey, []);
    }
    branchGroups.get(branchKey)!.push(p);
  });
  
  // If only one branch, return sorted by hash
  if (branchGroups.size === 1) {
    return participants.sort((a, b) => 
      hashNameAge(a.firstName, a.lastName, a.age) - hashNameAge(b.firstName, b.lastName, b.age)
    );
  }
  
  // Sort within each branch by hash
  branchGroups.forEach(group => {
    group.sort((a, b) => 
      hashNameAge(a.firstName, a.lastName, a.age) - hashNameAge(b.firstName, b.lastName, b.age)
    );
  });
  
  // Convert to array of branches sorted by count (largest first) 
  const branches = Array.from(branchGroups.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([key, participants]) => ({ key, participants, index: 0 }));
  
  // Distribute evenly using ratio-based selection
  const result: Participant[] = [];
  const totalCount = participants.length;
  
  for (let i = 0; i < totalCount; i++) {
    // Find branch with highest urgency (remaining/total_positions_left)
    let bestBranch = branches[0];
    let bestUrgency = -1;
    
    for (const branch of branches) {
      if (branch.index < branch.participants.length) {
        const remaining = branch.participants.length - branch.index;
        const positionsLeft = totalCount - i;
        const urgency = remaining / positionsLeft;
        
        // Use >= so that on a tie the last-processed (smallest) branch wins,
        // ensuring minority branches are pulled forward instead of left at the end.
        if (urgency >= bestUrgency) {
          bestUrgency = urgency;
          bestBranch = branch;
        }
      }
    }
    
    // Add next person from best branch
    if (bestBranch && bestBranch.index < bestBranch.participants.length) {
      result.push(bestBranch.participants[bestBranch.index]);
      bestBranch.index++;
    }
  }
  
  return result;
}

/**
 * Order schools to minimise adjacent same-school participants.
 * Phase 1: Place the first three participants from different schools (if possible).
 * Phase 2: Greedy adjacency minimisation – at each position pick the school
 *          with the most remaining participants that is different from the
 *          immediately preceding school.  When forced to repeat a school,
 *          pick the one with the most remaining to keep future options open.
 *
 * Keys in schoolGroups must equal the participant's `school` field so that
 * last-school comparisons work correctly.
 */
function orderSchools(schoolGroups: Map<string, Participant[]>): Participant[] {
  const schools = Array.from(schoolGroups.entries())
    .map(([schoolKey, participants]) => ({
      key: schoolKey,
      participants,
      index: 0,
    }))
    .sort((a, b) => b.participants.length - a.participants.length); // largest first

  if (schools.length === 0) return [];
  if (schools.length === 1) return schools[0].participants;

  const result: Participant[] = [];
  const totalCount = schools.reduce((sum, s) => sum + s.participants.length, 0);

  // Phase 1: first three positions from different schools
  const usedSchools = new Set<string>();
  for (const school of schools) {
    if (result.length >= 3) break;
    if (school.index >= school.participants.length) continue;
    if (!usedSchools.has(school.key)) {
      result.push(school.participants[school.index]);
      school.index++;
      usedSchools.add(school.key);
    }
  }

  // Phase 2: greedy – always prefer a different school; among ties pick most remaining
  for (let position = result.length; position < totalCount; position++) {
    const lastSchool = result.length > 0 ? result[result.length - 1].school : null;

    let bestSchool = null;
    let bestRemaining = -1;

    for (const school of schools) {
      if (school.index >= school.participants.length) continue;
      if (school.key === lastSchool) continue; // avoid same-school adjacency

      const remaining = school.participants.length - school.index;
      if (remaining > bestRemaining) {
        bestRemaining = remaining;
        bestSchool = school;
      }
    }

    // Forced repeat: no different school left – pick the one with the most remaining
    if (!bestSchool) {
      for (const school of schools) {
        if (school.index >= school.participants.length) continue;
        const remaining = school.participants.length - school.index;
        if (remaining > bestRemaining) {
          bestRemaining = remaining;
          bestSchool = school;
        }
      }
    }

    if (bestSchool) {
      result.push(bestSchool.participants[bestSchool.index]);
      bestSchool.index++;
    }
  }

  return result;
}

/**
 * Order Forms participants by distributing schools and assigning rank order.
 * Uses sophisticated urgency-based algorithm to distribute schools optimally.
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

  // Step 1: Group by school (keys must equal p.school for orderSchools comparisons)
  const schoolGroups = new Map<string, Participant[]>();

  ringParticipants.forEach((p) => {
    const key = p.school || '__no_school__';
    if (!schoolGroups.has(key)) {
      schoolGroups.set(key, []);
    }
    schoolGroups.get(key)!.push(p);
  });

  // Step 2: Within each school, distribute branches evenly and sort by hash within each branch
  schoolGroups.forEach((group, key) => {
    schoolGroups.set(key, distributeBranches(group));
  });

  // Step 3: Order schools – first 3 from different schools, then minimise adjacencies
  const orderedParticipants = orderSchools(schoolGroups);

  // Assign rank order numbers (position for ordering)
  const orderedWithRanks = orderedParticipants.map((p, index) => ({
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
/**
 * Re-order all competition rings (forms and sparring) in one pass.
 * Idempotent: running on already-ordered participants produces the same result.
 */
export function reorderAllRings(
  participants: Participant[],
  categories: Category[],
  categoryPoolMappings: CategoryPoolMapping[]
): Participant[] {
  const rings = computeCompetitionRings(participants, categories, categoryPoolMappings);

  let updated = participants;

  for (const ring of rings) {
    if (ring.type === 'forms') {
      const prefix = `forms-${ring.categoryId}-`;
      const pool = ring.id.startsWith(prefix) ? ring.id.substring(prefix.length) : undefined;
      updated = pool
        ? orderFormsRing(updated, ring.categoryId, pool)
        : orderFormsRing(updated, ring.id);
    } else if (ring.type === 'sparring') {
      const prefix = `sparring-${ring.categoryId}-`;
      const pool = ring.id.startsWith(prefix) ? ring.id.substring(prefix.length) : undefined;
      updated = pool
        ? orderSparringRing(updated, ring.categoryId, pool)
        : orderSparringRing(updated, ring.id);
    }
  }

  return updated;
}