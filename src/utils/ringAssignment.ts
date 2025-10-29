import { v4 as uuidv4 } from 'uuid';
import { Participant, Cohort, CompetitionRing, PhysicalRing } from '../../types/tournament';

export function assignRings(
  participants: Participant[],
  cohort: Cohort,
  physicalRings: PhysicalRing[]
): { rings: CompetitionRing[]; updatedParticipants: Participant[] } {
  const numRings = cohort.numRings;
  const cohortParticipants = participants.filter((p) => p.cohortId === cohort.id);
  
  // Separate participants by competition type
  const formsParticipants = cohortParticipants.filter((p) => p.competingForms);
  const sparringParticipants = cohortParticipants.filter((p) => p.competingSparring);

  const formsRings: CompetitionRing[] = [];
  const sparringRings: CompetitionRing[] = [];
  const updatedParticipants = [...participants];

  // Sort participants by age for distribution
  const sortedForms = [...formsParticipants].sort((a, b) => a.age - b.age);
  const sortedSparring = [...sparringParticipants].sort((a, b) => a.age - b.age);

  // Create rings
  for (let i = 0; i < numRings; i++) {
    const physicalRing = physicalRings[i % physicalRings.length];
    
    formsRings.push({
      id: uuidv4(),
      physicalRingId: physicalRing?.id || `temp-${i}`,
      cohortId: cohort.id,
      division: cohort.division,
      type: 'forms',
      participantIds: [],
    });

    sparringRings.push({
      id: uuidv4(),
      physicalRingId: physicalRing?.id || `temp-${i}`,
      cohortId: cohort.id,
      division: cohort.division,
      type: 'sparring',
      participantIds: [],
    });
  }

  // Distribute forms participants
  sortedForms.forEach((participant, index) => {
    const ringIndex = index % numRings;
    formsRings[ringIndex].participantIds.push(participant.id);
    
    const pIdx = updatedParticipants.findIndex((p) => p.id === participant.id);
    if (pIdx !== -1) {
      updatedParticipants[pIdx] = {
        ...updatedParticipants[pIdx],
        formsRingId: formsRings[ringIndex].id,
      };
    }
  });

  // Distribute sparring participants, trying to keep them in same ring as forms
  sortedSparring.forEach((participant) => {
    let assignedRingIndex = -1;

    // If participant is also in forms, try to assign to same ring
    if (participant.competingForms && participant.formsRingId) {
      const formsRingIndex = formsRings.findIndex((r) => r.id === participant.formsRingId);
      if (formsRingIndex !== -1) {
        assignedRingIndex = formsRingIndex;
      }
    }

    // If not found or not in forms, assign to ring with fewest participants
    if (assignedRingIndex === -1) {
      assignedRingIndex = sparringRings.reduce((minIdx, ring, idx, arr) => 
        ring.participantIds.length < arr[minIdx].participantIds.length ? idx : minIdx
      , 0);
    }

    sparringRings[assignedRingIndex].participantIds.push(participant.id);
    
    const pIdx = updatedParticipants.findIndex((p) => p.id === participant.id);
    if (pIdx !== -1) {
      updatedParticipants[pIdx] = {
        ...updatedParticipants[pIdx],
        sparringRingId: sparringRings[assignedRingIndex].id,
      };
    }
  });

  return {
    rings: [...formsRings, ...sparringRings],
    updatedParticipants,
  };
}
