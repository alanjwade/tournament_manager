import { Participant } from '../types/tournament';

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
 * @param cohortId - The cohort ID (or legacy ringId for backward compatibility)
 * @param cohortRing - Optional: The cohort ring identifier (e.g., "R1", "R2")
 */
export function orderFormsRing(
  participants: Participant[],
  cohortId: string,
  cohortRing?: string
): Participant[] {
  // Filter participants for this ring
  const ringParticipants = participants.filter((p) => {
    // New approach: use formsCohortId and formsCohortRing
    if (cohortRing) {
      return p.formsCohortId === cohortId && p.formsCohortRing === cohortRing;
    }
    // Legacy approach: use formsRingId (for backward compatibility)
    return p.formsRingId === cohortId;
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

  // Assign rank order numbers (10x the position for easy later changes)
  const orderedWithRanks = result.map((p, index) => ({
    ...p,
    formsRankOrder: (index + 1) * 10,
  }));

  // Update all participants, replacing those in this ring with ordered versions
  return participants.map((p) => {
    const ordered = orderedWithRanks.find((op) => op.id === p.id);
    return ordered || p;
  });
}

/**
 * Order Sparring participants by height and assign rank order.
 * @param participants - All participants
 * @param cohortId - The cohort ID (or legacy ringId for backward compatibility)
 * @param cohortRing - Optional: The cohort ring identifier (e.g., "R1", "R2")
 */
export function orderSparringRing(
  participants: Participant[],
  cohortId: string,
  cohortRing?: string
): Participant[] {
  // Filter participants for this ring
  const ringParticipants = participants.filter((p) => {
    // New approach: use sparringCohortId and sparringCohortRing
    if (cohortRing) {
      return p.sparringCohortId === cohortId && p.sparringCohortRing === cohortRing;
    }
    // Legacy approach: use sparringRingId (for backward compatibility)
    return p.sparringRingId === cohortId;
  });

  if (ringParticipants.length === 0) {
    return participants; // No changes if no participants in this ring
  }

  // Sort by height (total inches)
  const sorted = [...ringParticipants].sort(
    (a, b) => {
      const heightA = a.heightFeet * 12 + a.heightInches;
      const heightB = b.heightFeet * 12 + b.heightInches;
      return heightA - heightB;
    }
  );

  // Assign rank order numbers
  const orderedWithRanks = sorted.map((p, index) => ({
    ...p,
    sparringRankOrder: (index + 1) * 10,
  }));

  // Update all participants, replacing those in this ring with ordered versions
  return participants.map((p) => {
    const ordered = orderedWithRanks.find((op) => op.id === p.id);
    return ordered || p;
  });
}
