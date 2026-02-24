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
        
        if (urgency > bestUrgency) {
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
 * Order schools using urgency-based algorithm
 * Phase 1: First three people from different schools (if possible)
 * Phase 2: Strategic distribution using urgency scores
 */
function orderSchools(schoolGroups: Map<string, Participant[]>): Participant[] {
  const schools = Array.from(schoolGroups.entries())
    .map(([schoolKey, participants]) => ({
      key: schoolKey,
      participants: participants, // Already sorted by hash in orderFormsRing
      index: 0
    }))
    .sort((a, b) => b.participants.length - a.participants.length); // Largest schools first
  
  if (schools.length === 0) return [];
  if (schools.length === 1) return schools[0].participants;
  
  const result: Participant[] = [];
  const totalCount = schools.reduce((sum, s) => sum + s.participants.length, 0);
  
  // Phase 1: First three people from different SCHOOLS (not school-branch combos)
  const usedSchools = new Set<string>();
  let phase1Count = 0;
  
  for (let i = 0; i < schools.length && phase1Count < 3; i++) {
    if (schools[i].index >= schools[i].participants.length) continue;
    
    // Extract actual school name (remove branch part)
    const participant = schools[i].participants[schools[i].index];
    const actualSchool = participant.school;
    
    // Only use if we haven't used this actual school yet
    if (!usedSchools.has(actualSchool)) {
      result.push(participant);
      schools[i].index++;
      usedSchools.add(actualSchool);
      phase1Count++;
    }
  }
  
  // Phase 2: Strategic distribution using urgency scoring
  for (let position = result.length; position < totalCount; position++) {
    let bestSchool = null;
    let bestScore = -Infinity;
    
    const positionsLeft = totalCount - position;
    const lastParticipant = result.length > 0 ? result[result.length - 1] : null;
    const lastSchoolBranchKey = lastParticipant
      ? (lastParticipant.branch 
          ? `${lastParticipant.school} ${lastParticipant.branch}`
          : lastParticipant.school)
      : null;
    const lastActualSchool = lastParticipant ? lastParticipant.school : null;
    
    // Debug logging
    const debugMode = false; // Set to true to enable debug output
    if (debugMode) {
      console.log(`\n--- Position ${position}, positionsLeft: ${positionsLeft}, last: ${lastSchoolBranchKey}`);
      console.log('Available schools:', schools.map(s => `${s.key}: ${s.participants.length - s.index} left`));
    }
    
    // First pass: try to find school where neither school-branch nor actual school matches previous
    for (const school of schools) {
      if (school.index >= school.participants.length) continue; // School exhausted
      
      const nextParticipant = school.participants[school.index];
      const nextActualSchool = nextParticipant.school;
      
      // Skip if exact same school-branch combo
      if (lastSchoolBranchKey === school.key) {
        if (debugMode) console.log(`  Skip ${school.key} - same school-branch as last`);
        continue;
      }
      
      // Skip if same actual school (we want different schools first)
      if (lastActualSchool === nextActualSchool) {
        if (debugMode) console.log(`  Skip ${school.key} - same actual school as last`);
        continue;
      }
      
      // Calculate urgency ratio
      const remaining = school.participants.length - school.index;
      const urgency = remaining / positionsLeft;
      
      // Tiebreaker: slight bonus for schools with more remaining
      const tiebreaker = remaining * 0.001;
      
      const score = urgency + tiebreaker;
      
      if (debugMode) console.log(`  ${school.key}: urgency=${urgency.toFixed(3)}, score=${score.toFixed(3)}`);
      
      if (score > bestScore) {
        bestScore = score;
        bestSchool = school;
      }
    }
    
    if (debugMode && bestSchool) console.log(`  First pass selected: ${bestSchool.key}`);
    
    // Second pass: if no different school available, allow same school but different branch
    if (!bestSchool) {
      if (debugMode) console.log('  Second pass: allowing same school, different branch');
      bestScore = -Infinity;
      for (const school of schools) {
        if (school.index >= school.participants.length) continue;
        
        // Still skip exact same school-branch combo
        if (lastSchoolBranchKey === school.key) {
          continue;
        }
        
        const remaining = school.participants.length - school.index;
        const urgency = remaining / positionsLeft;
        const tiebreaker = remaining * 0.001;
        const score = urgency + tiebreaker;
        
        if (score > bestScore) {
          bestScore = score;
          bestSchool = school;
        }
      }
      if (debugMode && bestSchool) console.log(`  Second pass selected: ${bestSchool.key}`);
    }
    
    // Third pass: if still no option (shouldn't happen), take any available including exact same
    if (!bestSchool) {
      if (debugMode) console.log('  Third pass: taking any available');
      bestSchool = schools.find(s => s.index < s.participants.length) || null;
    }
    
    // Add next person from best school
    if (bestSchool && bestSchool.index < bestSchool.participants.length) {
      result.push(bestSchool.participants[bestSchool.index]);
      bestSchool.index++;
    } else {
      // Fallback: if all remaining schools are same as previous, just take the first available
      const availableSchool = schools.find(s => s.index < s.participants.length);
      if (availableSchool) {
        result.push(availableSchool.participants[availableSchool.index]);
        availableSchool.index++;
      }
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

  // Step 1: Group by school-branch combination directly
  const schoolBranchGroups = new Map<string, Participant[]>();
  
  ringParticipants.forEach((p) => {
    const schoolBranchKey = p.branch ? `${p.school} ${p.branch}` : p.school;
    if (!schoolBranchGroups.has(schoolBranchKey)) {
      schoolBranchGroups.set(schoolBranchKey, []);
    }
    schoolBranchGroups.get(schoolBranchKey)!.push(p);
  });

  // Step 2: Within each school-branch group, sort by hash of name+age
  schoolBranchGroups.forEach((group) => {
    group.sort((a, b) => 
      hashNameAge(a.firstName, a.lastName, a.age) - hashNameAge(b.firstName, b.lastName, b.age)
    );
  });

  // Step 3: Use urgency-based algorithm to order all school-branch groups
  const orderedParticipants = orderSchools(schoolBranchGroups);

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