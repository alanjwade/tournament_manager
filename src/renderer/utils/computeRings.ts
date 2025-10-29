import { Participant, Cohort, CompetitionRing, CohortRingMapping } from '../types/tournament';

/**
 * Computes CompetitionRing objects from participant data.
 * This makes participants the single source of truth for ring assignments.
 * 
 * @param participants - All participants
 * @param cohorts - All cohorts
 * @param cohortRingMappings - Mappings from cohort rings to physical rings
 * @returns Array of CompetitionRing objects with participantIds populated
 */
export function computeCompetitionRings(
  participants: Participant[],
  cohorts: Cohort[],
  cohortRingMappings: CohortRingMapping[]
): CompetitionRing[] {
  const rings: CompetitionRing[] = [];
  
  // Group participants by their cohort and ring assignments
  const ringGroups = new Map<string, {
    cohortId: string;
    cohortRing: string;
    type: 'forms' | 'sparring';
    participantIds: string[];
  }>();
  
  participants.forEach(participant => {
    // Process Forms
    if (participant.competingForms && participant.formsCohortId && participant.formsCohortRing) {
      const key = `forms-${participant.formsCohortId}-${participant.formsCohortRing}`;
      if (!ringGroups.has(key)) {
        ringGroups.set(key, {
          cohortId: participant.formsCohortId,
          cohortRing: participant.formsCohortRing,
          type: 'forms',
          participantIds: []
        });
      }
      ringGroups.get(key)!.participantIds.push(participant.id);
    }
    
    // Process Sparring
    if (participant.competingSparring && participant.sparringCohortId && participant.sparringCohortRing) {
      const key = `sparring-${participant.sparringCohortId}-${participant.sparringCohortRing}`;
      if (!ringGroups.has(key)) {
        ringGroups.set(key, {
          cohortId: participant.sparringCohortId,
          cohortRing: participant.sparringCohortRing,
          type: 'sparring',
          participantIds: []
        });
      }
      ringGroups.get(key)!.participantIds.push(participant.id);
    }
  });
  
  // Convert groups to CompetitionRing objects
  ringGroups.forEach((group, key) => {
    const cohort = cohorts.find(c => c.id === group.cohortId);
    if (!cohort) return;
    
    // Look up physical ring mapping
    const mapping = cohortRingMappings.find(m => 
      m.cohortId === group.cohortId && 
      m.cohortRing === group.cohortRing
    );
    
    const physicalRingId = mapping?.physicalRingId || 'unassigned';
    
    // Create ring name (e.g., "Mixed 8-10_R1")
    const ringName = `${cohort.name}_${group.cohortRing}`;
    
    rings.push({
      id: key,
      division: cohort.division,
      cohortId: group.cohortId,
      physicalRingId,
      type: group.type,
      participantIds: group.participantIds,
      name: ringName
    });
  });
  
  return rings;
}

/**
 * Gets all participants in a specific ring
 */
export function getParticipantsInRing(
  participants: Participant[],
  cohortId: string,
  cohortRing: string,
  type: 'forms' | 'sparring'
): Participant[] {
  return participants.filter(p => {
    if (type === 'forms') {
      return p.competingForms && 
             p.formsCohortId === cohortId && 
             p.formsCohortRing === cohortRing;
    } else {
      return p.competingSparring && 
             p.sparringCohortId === cohortId && 
             p.sparringCohortRing === cohortRing;
    }
  });
}

/**
 * Updates a participant's ring assignment
 */
export function updateParticipantRing(
  participant: Participant,
  cohortRing: string,
  type: 'forms' | 'sparring'
): Participant {
  if (type === 'forms') {
    return { ...participant, formsCohortRing: cohortRing };
  } else {
    return { ...participant, sparringCohortRing: cohortRing };
  }
}
