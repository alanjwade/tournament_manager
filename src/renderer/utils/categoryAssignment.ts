import { Participant, Category } from '../types/tournament';
import { AGE_THRESHOLDS } from './constants';
import { v4 as uuidv4 } from 'uuid';

export interface CategoryDefinition {
  division: string;
  gender: 'Male' | 'Female' | 'Mixed';
  minAge: number;
  maxAge: number;
  numPools: number;
}

export function assignCategories(
  participants: Participant[],
  categoryDefinitions: CategoryDefinition[],
  type: 'forms' | 'sparring' = 'forms'
): Category[] {
  const categories: Category[] = [];

  categoryDefinitions.forEach((def) => {
    const matchingParticipants = participants.filter((p) => {
      const division = type === 'forms' ? p.formsDivision : p.sparringDivision;
      if (division !== def.division) return false;
      if (type === 'forms' && !p.competingForms) return false;
      if (type === 'sparring' && !p.competingSparring) return false;
      
      const ageMatches = p.age >= def.minAge && p.age <= def.maxAge;
      const genderMatches =
        def.gender === 'Mixed' ||
        p.gender === def.gender;

      return ageMatches && genderMatches;
    });

    if (matchingParticipants.length > 0) {
      const category: Category = {
        id: uuidv4(),
        division: def.division,
        gender: def.gender.toLowerCase() as 'male' | 'female' | 'mixed',
        minAge: def.minAge,
        maxAge: def.maxAge,
        numPools: def.numPools,
        participantIds: matchingParticipants.map((p) => p.id),
        name: `${def.gender} ${def.minAge}-${def.maxAge === 999 ? '18+' : def.maxAge}`,
      };
      categories.push(category);
    }
  });

  return categories;
}

export function autoGenerateCategoryDefinitions(
  participants: Participant[],
  division?: string
): CategoryDefinition[] {
  const definitions: CategoryDefinition[] = [];
  const divisions = division
    ? [division]
    : [...new Set(participants.flatMap((p) => [p.formsDivision, p.sparringDivision].filter(Boolean)))];

  divisions.forEach((div) => {
    const divParticipants = participants.filter((p) => p.formsDivision === div || p.sparringDivision === div);
    
    // Group by gender
    const males = divParticipants.filter((p) => p.gender === 'Male');
    const females = divParticipants.filter((p) => p.gender === 'Female');

    // Helper to create age-based categories
    const createAgeCategories = (
      gender: 'Male' | 'Female' | 'Mixed',
      parts: Participant[]
    ) => {
      if (parts.length === 0) return;

      const ages = parts.map((p) => p.age).sort((a, b) => a - b);
      const minAge = ages[0];
      const maxAge = ages[ages.length - 1];

      // Determine if adult (18+)
      const hasAdults = parts.some((p) => p.age >= AGE_THRESHOLDS.ADULT);
      const hasYouth = parts.some((p) => p.age < 18);

      if (hasAdults && hasYouth) {
        // Split into youth and adult
        const youth = parts.filter((p) => p.age < 18);
        const adults = parts.filter((p) => p.age >= AGE_THRESHOLDS.ADULT);

        if (youth.length > 0) {
          definitions.push({
            division: div,
            gender,
            minAge: Math.min(...youth.map((p) => p.age)),
            maxAge: 17,
            numPools: calculatePoolsNeeded(youth.length),
          });
        }

        if (adults.length > 0) {
          definitions.push({
            division: div,
            gender,
            minAge: 18,
            maxAge: Math.max(...adults.map((p) => p.age)),
            numPools: calculatePoolsNeeded(adults.length),
          });
        }
      } else {
        // Single category
        definitions.push({
          division: div,
          gender,
          minAge,
          maxAge,
          numPools: calculatePoolsNeeded(parts.length),
        });
      }
    };

    // Create categories for males and females
    createAgeCategories('Male', males);
    createAgeCategories('Female', females);
  });

  return definitions;
}

function calculatePoolsNeeded(participantCount: number): number {
  if (participantCount <= 10) return 1;
  if (participantCount <= 20) return 2;
  if (participantCount <= 30) return 3;
  return Math.ceil(participantCount / 10);
}

export function updateParticipantsWithCategories(
  participants: Participant[],
  categories: Category[],
  type: 'forms' | 'sparring'
): Participant[] {
  return participants.map((p) => {
    const category = categories.find((c) => c.participantIds.includes(p.id));
    if (category) {
      if (type === 'forms') {
        return { ...p, formsCategoryId: category.id };
      } else {
        return { ...p, sparringCategoryId: category.id };
      }
    }
    return p;
  });
}
