import { v4 as uuidv4 } from 'uuid';
import { Participant, Cohort } from '../../types/tournament';

export interface CohortCriteria {
  division: string;
  gender: 'male' | 'female' | 'mixed';
  minAge: number;
  maxAge: number;
  numRings: number;
}

export function assignCohorts(
  participants: Participant[],
  criteria: CohortCriteria[]
): { cohorts: Cohort[]; updatedParticipants: Participant[] } {
  const cohorts: Cohort[] = [];
  const updatedParticipants = [...participants];

  criteria.forEach((criterion) => {
    const cohortId = uuidv4();
    const matchingParticipants = updatedParticipants.filter((p) => {
      const ageMatch = p.age >= criterion.minAge && p.age <= criterion.maxAge;
      const genderMatch =
        criterion.gender === 'mixed' ||
        p.gender.toLowerCase() === criterion.gender;
      const divisionMatch = p.division === criterion.division;
      return ageMatch && genderMatch && divisionMatch && !p.cohortId; // Only unassigned participants
    });

    if (matchingParticipants.length > 0) {
      const cohortName = `${criterion.gender === 'mixed' ? 'Mixed' : criterion.gender === 'male' ? 'Male' : 'Female'} ${criterion.minAge}-${criterion.maxAge === 999 ? '18+' : criterion.maxAge}`;
      
      cohorts.push({
        id: cohortId,
        name: cohortName,
        division: criterion.division,
        gender: criterion.gender,
        minAge: criterion.minAge,
        maxAge: criterion.maxAge,
        participantIds: matchingParticipants.map((p) => p.id),
        numRings: criterion.numRings,
      });

      // Update participants with cohort assignment
      matchingParticipants.forEach((p) => {
        const idx = updatedParticipants.findIndex((up) => up.id === p.id);
        if (idx !== -1) {
          updatedParticipants[idx] = { ...updatedParticipants[idx], cohortId };
        }
      });
    }
  });

  return { cohorts, updatedParticipants };
}

export function getUnassignedParticipants(participants: Participant[]): Participant[] {
  return participants.filter((p) => !p.cohortId);
}
