import { Participant } from '../../types/tournament';

// Hash function for name-based ordering
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function orderFormsRing(
  participants: Participant[],
  ringId: string
): Participant[] {
  // Filter participants for this ring
  const ringParticipants = participants.filter((p) => p.formsRingId === ringId);

  // Group by school
  const bySchool = new Map<string, Participant[]>();
  ringParticipants.forEach((p) => {
    const school = p.school || 'Unknown';
    if (!bySchool.has(school)) {
      bySchool.set(school, []);
    }
    bySchool.get(school)!.push(p);
  });

  // Order within each school by hash, assign fractions
  const participantsWithFraction: Array<Participant & { fraction: number }> = [];
  
  bySchool.forEach((schoolParticipants, school) => {
    const sorted = schoolParticipants.sort((a, b) => {
      const hashA = hashString(a.firstName + a.lastName);
      const hashB = hashString(b.firstName + b.lastName);
      return hashA - hashB;
    });

    sorted.forEach((p, idx) => {
      participantsWithFraction.push({
        ...p,
        fraction: (idx + 1) / sorted.length,
      });
    });
  });

  // Sort by fraction to interleave schools
  participantsWithFraction.sort((a, b) => a.fraction - b.fraction);

  // Ensure first three are not from the same school if possible
  if (participantsWithFraction.length >= 3) {
    const firstThree = participantsWithFraction.slice(0, 3);
    const schools = new Set(firstThree.map((p) => p.school));
    
    if (schools.size === 1 && participantsWithFraction.length > 3) {
      // Try to swap with a participant from a different school
      for (let i = 3; i < participantsWithFraction.length; i++) {
        if (participantsWithFraction[i].school !== firstThree[0].school) {
          // Swap position 2 with this participant
          const temp = participantsWithFraction[2];
          participantsWithFraction[2] = participantsWithFraction[i];
          participantsWithFraction[i] = temp;
          break;
        }
      }
    }
  }

  // Assign rank_order (10x position)
  return participantsWithFraction.map((p, idx) => ({
    ...p,
    formsRankOrder: (idx + 1) * 10,
  }));
}

export function orderSparringRing(
  participants: Participant[],
  ringId: string
): Participant[] {
  // Filter participants for this ring
  const ringParticipants = participants.filter((p) => p.sparringRingId === ringId);

  // Calculate total height in inches
  const withHeight = ringParticipants.map((p) => ({
    ...p,
    totalHeightInches: p.heightFeet * 12 + p.heightInches,
  }));

  // Sort by height
  const sorted = withHeight.sort((a, b) => a.totalHeightInches - b.totalHeightInches);

  // Assign rank order
  return sorted.map((p, idx) => ({
    ...p,
    sparringRankOrder: (idx + 1) * 10,
  }));
}
