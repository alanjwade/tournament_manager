import { Participant, Category, CompetitionRing, CategoryPoolMapping } from '../types/tournament';

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
    // Process Forms
    if (participant.competingForms && (participant.formsCategoryId || participant.formsCohortId) && (participant.formsPool || participant.formsCohortRing)) {
      const categoryId = participant.formsCategoryId || participant.formsCohortId;
      const pool = participant.formsPool || participant.formsCohortRing;
      const key = `forms-${categoryId}-${pool}`;
      if (!ringGroups.has(key)) {
        ringGroups.set(key, {
          categoryId: categoryId!,
          pool: pool!,
          type: 'forms',
          participantIds: []
        });
      }
      ringGroups.get(key)!.participantIds.push(participant.id);
    }
    
    // Process Sparring
    if (participant.competingSparring && (participant.sparringCategoryId || participant.sparringCohortId) && (participant.sparringPool || participant.sparringCohortRing)) {
      const categoryId = participant.sparringCategoryId || participant.sparringCohortId;
      const pool = participant.sparringPool || participant.sparringCohortRing;
      const key = `sparring-${categoryId}-${pool}`;
      if (!ringGroups.has(key)) {
        ringGroups.set(key, {
          categoryId: categoryId!,
          pool: pool!,
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
    
    // Create ring name (e.g., "Mixed 8-10_R1")
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
      const pCategoryId = p.formsCategoryId || p.formsCohortId;
      const pPool = p.formsPool || p.formsCohortRing;
      return p.competingForms && 
             pCategoryId === categoryId && 
             pPool === pool;
    } else {
      const pCategoryId = p.sparringCategoryId || p.sparringCohortId;
      const pPool = p.sparringPool || p.sparringCohortRing;
      return p.competingSparring && 
             pCategoryId === categoryId && 
             pPool === pool;
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
