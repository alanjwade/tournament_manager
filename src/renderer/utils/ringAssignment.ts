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
  console.log('[mapSparringToForms] FUNCTION START');
  console.log('[mapSparringToForms] cohorts:', cohorts.length);
  console.log('[mapSparringToForms] participants:', participants.length);
  console.log('[mapSparringToForms] formsCompetitionRings:', formsCompetitionRings.length);
  
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
  console.log('[mapSparringToForms] formsCohortIds:', formsCohortIds.size);
  
  // Filter to only process Forms cohort rings
  const actualFormsRings = formsCompetitionRings.filter(ring => formsCohortIds.has(ring.cohortId));
  console.log('[mapSparringToForms] actualFormsRings:', actualFormsRings.length, 'of', formsCompetitionRings.length);

  // Debugging: log participant/sparring counts to help trace mapping issues
  try {
    console.log('[mapSparringToForms] total participants:', participants.length);
    const totalSparring = participants.filter(p => p.competingSparring).length;
    const totalWithSparringCohort = participants.filter(p => !!p.sparringCohortId).length;
    const totalWithFormsCohortRing = participants.filter(p => !!p.formsCohortRing).length;
    const sparringWithFormsCohortRing = participants.filter(p => p.competingSparring && !!p.formsCohortRing).length;
    const sparringWithSparringCohortAndFormsCohortRing = participants.filter(p => p.competingSparring && !!p.sparringCohortId && !!p.formsCohortRing).length;
    console.log('[mapSparringToForms] competingSparring=', totalSparring, 'with sparringCohortId=', totalWithSparringCohort);
    console.log('[mapSparringToForms] totalWithFormsCohortRing=', totalWithFormsCohortRing);
    console.log('[mapSparringToForms] sparringWithFormsCohortRing=', sparringWithFormsCohortRing);
    console.log('[mapSparringToForms] sparringWithSparringCohortAndFormsCohortRing=', sparringWithSparringCohortAndFormsCohortRing);
    
    // Warn if participants are competing in sparring but not assigned to sparring cohorts
    if (totalSparring > 0 && totalWithSparringCohort === 0) {
      console.warn('⚠️ WARNING: Participants are marked as competing in sparring, but NONE are assigned to sparring cohorts!');
      console.warn('⚠️ Please go to Cohort Management tab and assign participants to sparring cohorts first.');
    }
  } catch (e) {
    console.warn('[mapSparringToForms] debug logging failed', e);
  }
  
  actualFormsRings.forEach((formsRing) => {
    const physicalId = formsRing.physicalRingId;
    // Debug: count how many participants in this forms ring are eligible for sparring mapping
    try {
      const ringSize = formsRing.participantIds.length;
      let qualified = 0;
      let hasFormsCohortRing = 0;
      formsRing.participantIds.forEach((pid) => {
        const participant = participants.find((p) => p.id === pid);
        if (participant) {
          if (participant.formsCohortRing) hasFormsCohortRing++;
          if (participant.competingSparring && participant.sparringCohortId) qualified++;
        }
      });
      console.log(`[mapSparringToForms] formsRing ${formsRing.id} (${formsRing.name}) participants=${ringSize} hasFormsCohortRing=${hasFormsCohortRing} qualifiedForSparring=${qualified}`);
    } catch (e) {
      console.warn('[mapSparringToForms] ring-level debug failed', e);
    }

    formsRing.participantIds.forEach((pid) => {
      const participant = participants.find((p) => p.id === pid);
      if (!participant) return;

      // Only map participants who are actually sparring and have a sparring cohort
      if (participant.competingSparring && participant.sparringCohortId) {
        const scId = participant.sparringCohortId;
        
        // Use the participant's forms cohort ring to determine their sparring cohort ring
        const formsCohortRing = participant.formsCohortRing;
        if (!formsCohortRing) {
          console.log('[mapSparringToForms] SKIPPING participant - no formsCohortRing', pid, 'competingForms=', participant.competingForms, 'formsCohortId=', participant.formsCohortId, 'formsCohortRing=', participant.formsCohortRing);
          return; // Skip if they don't have a forms ring assigned
        }

        // Debug: log when a participant is skipped due to missing sparring cohort or not competing
        if (!participant.competingSparring || !participant.sparringCohortId) {
          console.log('[mapSparringToForms] skipping participant for sparring mapping', pid, 'competingSparring=', participant.competingSparring, 'sparringCohortId=', participant.sparringCohortId);
          return;
        }
        
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

  console.log('[mapSparringToForms] FUNCTION END - created', sparringRings.length, 'sparring rings');
  return { updatedParticipants, competitionRings: sparringRings };
}
