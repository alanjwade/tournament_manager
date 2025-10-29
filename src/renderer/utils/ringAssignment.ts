import { Participant, Cohort, CompetitionRing, PhysicalRing } from '../types/tournament';
import { v4 as uuidv4 } from 'uuid';

export function assignRingsWithinCohort(
  cohort: Cohort,
  participants: Participant[],
  physicalRings: PhysicalRing[],
  type: 'forms' | 'sparring'
): { updatedParticipants: Participant[]; competitionRings: CompetitionRing[] } {
  const cohortParticipants = participants.filter((p) =>
    cohort.participantIds.includes(p.id)
  );

  if (cohortParticipants.length === 0) {
    return { updatedParticipants: participants, competitionRings: [] };
  }

  const ringsNeeded = cohort.numRings;
  const availableRings = physicalRings.slice(0, ringsNeeded);

  if (availableRings.length < ringsNeeded) {
    throw new Error(
      `Not enough physical rings. Need ${ringsNeeded}, have ${availableRings.length}`
    );
  }

  // Sort participants by age for distribution
  const sortedParticipants = [...cohortParticipants].sort(
    (a, b) => a.age - b.age
  );

  // Distribute participants across rings
  const ringAssignments: Map<string, Participant[]> = new Map();
  availableRings.forEach((ring) => {
    ringAssignments.set(ring.id, []);
  });

  sortedParticipants.forEach((participant, index) => {
    const ringIndex = index % ringsNeeded;
    const ring = availableRings[ringIndex];
    ringAssignments.get(ring.id)!.push(participant);
  });

  // Create competition rings and update participants
  const competitionRings: CompetitionRing[] = [];
  const updatedParticipants = [...participants];

  let ringCounter = 1;
  ringAssignments.forEach((ringParticipants, physicalRingId) => {
    const ring = availableRings.find((r) => r.id === physicalRingId)!;
    const ringId = `${type}-${cohort.id}-${ring.id}`;
    const ringName = `${cohort.name}_R${ringCounter}`;
    const cohortRing = `R${ringCounter}`; // NEW: Simple ring identifier

    competitionRings.push({
      id: ringId,
      division: cohort.division,
      cohortId: cohort.id,
      physicalRingId: ring.id,
      type,
      participantIds: ringParticipants.map((p) => p.id),
      name: ringName,
    });

    ringCounter++;

    // Update participants with ring assignment
    ringParticipants.forEach((p) => {
      const index = updatedParticipants.findIndex((up) => up.id === p.id);
      if (index !== -1) {
        if (type === 'forms') {
          updatedParticipants[index] = {
            ...updatedParticipants[index],
            formsRingId: ringId, // Legacy
            formsCohortRing: cohortRing, // NEW: Simple identifier
          };
        } else {
          updatedParticipants[index] = {
            ...updatedParticipants[index],
            sparringRingId: ringId, // Legacy
            sparringCohortRing: cohortRing, // NEW: Simple identifier
          };
        }
      }
    });
  });

  return { updatedParticipants, competitionRings };
}

export function assignRingsForAllCohorts(
  cohorts: Cohort[],
  participants: Participant[],
  physicalRings: PhysicalRing[],
  type: 'forms' | 'sparring',
  division?: string
): { updatedParticipants: Participant[]; competitionRings: CompetitionRing[] } {
  let currentParticipants = [...participants];
  const allCompetitionRings: CompetitionRing[] = [];

  const targetCohorts = division
    ? cohorts.filter((c) => c.division === division)
    : cohorts;

  targetCohorts.forEach((cohort) => {
    const { updatedParticipants, competitionRings } = assignRingsWithinCohort(
      cohort,
      currentParticipants,
      physicalRings,
      type
    );
    currentParticipants = updatedParticipants;
    allCompetitionRings.push(...competitionRings);
  });

  return {
    updatedParticipants: currentParticipants,
    competitionRings: allCompetitionRings,
  };
}

// Map sparring participants into the same physical rings they were assigned for forms.
// This creates sparring CompetitionRing entries that reuse the same physicalRingId
// and places only those participants who are actually competing in sparring into
// the corresponding sparring cohort rings.
export function mapSparringToForms(
  cohorts: Cohort[],
  participants: Participant[],
  formsCompetitionRings: CompetitionRing[]
): { updatedParticipants: Participant[]; competitionRings: CompetitionRing[] } {
  const updatedParticipants = [...participants];
  const sparringRings: CompetitionRing[] = [];

  // Group participants by their sparring cohort and forms cohort ring (R1, R2, etc.)
  // This ensures sparring participants are in the same cohort ring as their forms assignment
  const grouping: Map<string, Map<string, {
    participantIds: string[];
    physicalId: string;
    ringName: string;
  }>> = new Map();
  
  // CRITICAL FIX: Only process rings from FORMS cohorts, not sparring cohorts
  // Get all Forms cohort IDs
  const formsCohortIds = new Set(cohorts.filter(c => c.type === 'forms').map(c => c.id));
  
  // Filter to only process Forms cohort rings
  const actualFormsRings = formsCompetitionRings.filter(ring => formsCohortIds.has(ring.cohortId));
  
  actualFormsRings.forEach((formsRing) => {
    const physicalId = formsRing.physicalRingId;
    formsRing.participantIds.forEach((pid) => {
      const participant = participants.find((p) => p.id === pid);
      if (!participant) return;

      // Only map participants who are actually sparring and have a sparring cohort
      if (participant.competingSparring && participant.sparringCohortId) {
        const scId = participant.sparringCohortId;
        
        // Use the participant's forms cohort ring to determine their sparring cohort ring
        const formsCohortRing = participant.formsCohortRing;
        if (!formsCohortRing) return; // Skip if they don't have a forms ring assigned
        
        if (!grouping.has(scId)) grouping.set(scId, new Map());
        const byCohortRing = grouping.get(scId)!;
        
        if (!byCohortRing.has(formsCohortRing)) {
          byCohortRing.set(formsCohortRing, {
            participantIds: [],
            physicalId: physicalId,
            ringName: formsRing.name || ''
          });
        }
        byCohortRing.get(formsCohortRing)!.participantIds.push(pid);
      }
    });
  });

  // For each sparring cohort, create competition rings corresponding to the cohort rings
  grouping.forEach((byCohortRing, sparringCohortId) => {
    const cohort = cohorts.find((c) => c.id === sparringCohortId);
    if (!cohort) return;

    // For each cohort ring (R1, R2, etc.) with sparring participants
    byCohortRing.forEach((ringData, formsCohortRing) => {
      const { participantIds, physicalId, ringName: formsRingName } = ringData;
      
      // Use the same cohort ring identifier as forms (e.g., "R1")
      const cohortRing = formsCohortRing;
      
      // Create ring name matching the forms ring name
      const ringName = formsRingName
        ? formsRingName.replace(' Forms', '').replace(' Sparring', '')
        : `${cohort.name}_${cohortRing}`;
      
      const ringId = `sparring-${sparringCohortId}-${cohortRing}`;

      sparringRings.push({
        id: ringId,
        division: cohort.division,
        cohortId: sparringCohortId,
        physicalRingId: physicalId,
        type: 'sparring',
        participantIds: participantIds,
        name: ringName,
      });

      // Update participants to reference the new sparring ring id
      participantIds.forEach((pid) => {
        const i = updatedParticipants.findIndex((p) => p.id === pid);
        if (i !== -1) {
          updatedParticipants[i] = {
            ...updatedParticipants[i],
            sparringRingId: ringId, // Legacy
            sparringCohortRing: cohortRing, // Use same cohort ring as forms
          };
        }
      });
    });
  });

  return { updatedParticipants, competitionRings: sparringRings };
}
