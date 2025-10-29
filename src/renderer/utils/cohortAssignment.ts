import { Participant, Cohort } from '../types/tournament';
import { v4 as uuidv4 } from 'uuid';

export interface CohortDefinition {
  division: string;
  gender: 'Male' | 'Female' | 'Mixed';
  minAge: number;
  maxAge: number;
  numRings: number;
}

export function assignCohorts(
  participants: Participant[],
  cohortDefinitions: CohortDefinition[],
  type: 'forms' | 'sparring' = 'forms'
): Cohort[] {
  const cohorts: Cohort[] = [];

  cohortDefinitions.forEach((def) => {
    const matchingParticipants = participants.filter((p) => {
      if (p.division !== def.division) return false;
      if (type === 'forms' && !p.competingForms) return false;
      if (type === 'sparring' && !p.competingSparring) return false;
      
      const ageMatches = p.age >= def.minAge && p.age <= def.maxAge;
      const genderMatches =
        def.gender === 'Mixed' ||
        p.gender === def.gender;

      return ageMatches && genderMatches;
    });

    if (matchingParticipants.length > 0) {
      const cohort: Cohort = {
        id: uuidv4(),
        division: def.division,
        gender: def.gender.toLowerCase() as 'male' | 'female' | 'mixed',
        minAge: def.minAge,
        maxAge: def.maxAge,
        numRings: def.numRings,
        participantIds: matchingParticipants.map((p) => p.id),
        name: `${def.gender} ${def.minAge}-${def.maxAge === 999 ? '18+' : def.maxAge}`,
      };
      cohorts.push(cohort);
    }
  });

  return cohorts;
}

export function autoGenerateCohortDefinitions(
  participants: Participant[],
  division?: string
): CohortDefinition[] {
  const definitions: CohortDefinition[] = [];
  const divisions = division
    ? [division]
    : [...new Set(participants.map((p) => p.division))];

  divisions.forEach((div) => {
    const divParticipants = participants.filter((p) => p.division === div);
    
    // Group by gender
    const males = divParticipants.filter((p) => p.gender === 'Male');
    const females = divParticipants.filter((p) => p.gender === 'Female');

    // Helper to create age-based cohorts
    const createAgeCohorts = (
      gender: 'Male' | 'Female' | 'Mixed',
      parts: Participant[]
    ) => {
      if (parts.length === 0) return;

      const ages = parts.map((p) => p.age).sort((a, b) => a - b);
      const minAge = ages[0];
      const maxAge = ages[ages.length - 1];

      // Determine if adult (18+)
      const hasAdults = parts.some((p) => p.age >= 18);
      const hasYouth = parts.some((p) => p.age < 18);

      if (hasAdults && hasYouth) {
        // Split into youth and adult
        const youth = parts.filter((p) => p.age < 18);
        const adults = parts.filter((p) => p.age >= 18);

        if (youth.length > 0) {
          definitions.push({
            division: div,
            gender,
            minAge: Math.min(...youth.map((p) => p.age)),
            maxAge: 17,
            numRings: calculateRingsNeeded(youth.length),
          });
        }

        if (adults.length > 0) {
          definitions.push({
            division: div,
            gender,
            minAge: 18,
            maxAge: Math.max(...adults.map((p) => p.age)),
            numRings: calculateRingsNeeded(adults.length),
          });
        }
      } else {
        // Single cohort
        definitions.push({
          division: div,
          gender,
          minAge,
          maxAge,
          numRings: calculateRingsNeeded(parts.length),
        });
      }
    };

    // Create cohorts for males and females
    createAgeCohorts('Male', males);
    createAgeCohorts('Female', females);
  });

  return definitions;
}

function calculateRingsNeeded(participantCount: number): number {
  if (participantCount <= 10) return 1;
  if (participantCount <= 20) return 2;
  if (participantCount <= 30) return 3;
  return Math.ceil(participantCount / 10);
}

export function updateParticipantsWithCohorts(
  participants: Participant[],
  cohorts: Cohort[],
  type: 'forms' | 'sparring'
): Participant[] {
  return participants.map((p) => {
    const cohort = cohorts.find((c) => c.participantIds.includes(p.id));
    if (cohort) {
      if (type === 'forms') {
        return { ...p, formsCohort: cohort.id };
      } else {
        return { ...p, sparringCohort: cohort.id };
      }
    }
    return p;
  });
}
