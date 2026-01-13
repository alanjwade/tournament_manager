import { Participant, Category, CompetitionRing, CategoryPoolMapping } from '../types/tournament';

/**
 * Gets the effective sparring category ID and pool for a participant,
 * resolving "same as forms" to use forms values.
 */
export function getEffectiveSparringInfo(participant: Participant): {
  categoryId: string | undefined;
  pool: string | undefined;
} {
  // If sparringDivision is "same as forms", use forms category/pool
  if (participant.sparringDivision === 'same as forms') {
    return {
      categoryId: participant.formsCategoryId || participant.formsCohortId,
      pool: participant.formsPool || participant.formsCohortRing
    };
  }
  // Otherwise use sparring values
  return {
    categoryId: participant.sparringCategoryId || participant.sparringCohortId,
    pool: participant.sparringPool || participant.sparringCohortRing
  };
}

/**
 * Gets the effective forms category ID and pool for a participant,
 * resolving "same as sparring" to use sparring values.
 */
export function getEffectiveFormsInfo(participant: Participant): {
  categoryId: string | undefined;
  pool: string | undefined;
} {
  // If formsDivision is "same as sparring", use sparring category/pool
  if (participant.formsDivision === 'same as sparring') {
    return {
      categoryId: participant.sparringCategoryId || participant.sparringCohortId,
      pool: participant.sparringPool || participant.sparringCohortRing
    };
  }
  // Otherwise use forms values
  return {
    categoryId: participant.formsCategoryId || participant.formsCohortId,
    pool: participant.formsPool || participant.formsCohortRing
  };
}

/**
 * Computes CompetitionRing objects from participant data.
 * This makes participants the single source of truth for ring assignments.
 * 
 * @param participants - All participants
 * @param categories - All categories
 * @param categoryPoolMappings - Mappings from category pools to physical rings
 * @returns Array of CompetitionRing objects with participantIds populated
 */
export function computeCompetitionRings(
  participants: Participant[],
  categories: Category[],
  categoryPoolMappings: CategoryPoolMapping[]
): CompetitionRing[] {
  const rings: CompetitionRing[] = [];
  
  // Group participants by their category and pool assignments
  const ringGroups = new Map<string, {
    categoryId: string;
    pool: string;
    type: 'forms' | 'sparring';
    participantIds: string[];
  }>();
  
  participants.forEach(participant => {
    // Process Forms - resolve "same as sparring" if needed
    const effectiveForms = getEffectiveFormsInfo(participant);
    if (participant.competingForms && effectiveForms.categoryId && effectiveForms.pool) {
      const key = `forms-${effectiveForms.categoryId}-${effectiveForms.pool}`;
      if (!ringGroups.has(key)) {
        ringGroups.set(key, {
          categoryId: effectiveForms.categoryId,
          pool: effectiveForms.pool,
          type: 'forms',
          participantIds: []
        });
      }
      ringGroups.get(key)!.participantIds.push(participant.id);
    }
    
    // Process Sparring - resolve "same as forms" if needed
    const effectiveSparring = getEffectiveSparringInfo(participant);
    if (participant.competingSparring && effectiveSparring.categoryId && effectiveSparring.pool) {
      const key = `sparring-${effectiveSparring.categoryId}-${effectiveSparring.pool}`;
      if (!ringGroups.has(key)) {
        ringGroups.set(key, {
          categoryId: effectiveSparring.categoryId,
          pool: effectiveSparring.pool,
          type: 'sparring',
          participantIds: []
        });
      }
      ringGroups.get(key)!.participantIds.push(participant.id);
    }
  });
  
  // Convert groups to CompetitionRing objects
  ringGroups.forEach((group, key) => {
    const category = categories.find(c => c.id === group.categoryId);
    if (!category) return;
    
    // Look up physical ring mapping
    const mapping = categoryPoolMappings.find(m => 
      (m.categoryId === group.categoryId || m.cohortId === group.categoryId) && 
      m.pool === group.pool
    );
    
    const physicalRingId = mapping?.physicalRingId || 'unassigned';
    
    // Create ring name: internal format is category_pool (e.g., "Mixed 8-10_P1")
    // Display formatting happens in UI components
    const ringName = `${category.name}_${group.pool}`;
    
    rings.push({
      id: key,
      division: category.division,
      categoryId: group.categoryId,
      cohortId: group.categoryId, // Legacy
      physicalRingId,
      type: group.type,
      participantIds: group.participantIds,
      name: ringName
    });
  });
  
  return rings;
}

/**
 * Gets all participants in a specific pool
 */
export function getParticipantsInRing(
  participants: Participant[],
  categoryId: string,
  pool: string,
  type: 'forms' | 'sparring'
): Participant[] {
  return participants.filter(p => {
    if (type === 'forms') {
      const effective = getEffectiveFormsInfo(p);
      return p.competingForms && 
             effective.categoryId === categoryId && 
             effective.pool === pool;
    } else {
      const effective = getEffectiveSparringInfo(p);
      return p.competingSparring && 
             effective.categoryId === categoryId && 
             effective.pool === pool;
    }
  });
}

/**
 * Updates a participant's pool assignment
 */
export function updateParticipantRing(
  participant: Participant,
  pool: string,
  type: 'forms' | 'sparring'
): Participant {
  if (type === 'forms') {
    return { ...participant, formsPool: pool, formsCohortRing: pool };
  } else {
    return { ...participant, sparringPool: pool, sparringCohortRing: pool };
  }
}
