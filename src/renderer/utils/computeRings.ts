import { Participant, Category, CompetitionRing, CategoryPoolMapping } from '../types/tournament';

/**
 * Gets the effective sparring category ID and pool for a participant.
 * With the simplified model, this now just returns the sparring values directly.
 */
export function getEffectiveSparringInfo(participant: Participant): {
  categoryId: string | undefined;
  pool: string | undefined;
} {
  return {
    categoryId: participant.sparringCategoryId,
    pool: participant.sparringPool
  };
}

/**
 * Gets the effective forms category ID and pool for a participant.
 * With the simplified model, this now just returns the forms values directly.
 */
export function getEffectiveFormsInfo(participant: Participant): {
  categoryId: string | undefined;
  pool: string | undefined;
} {
  return {
    categoryId: participant.formsCategoryId,
    pool: participant.formsPool
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
    // Process Forms
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
    
    // Process Sparring
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
    } else if (effectiveSparring.categoryId && effectiveSparring.pool) {
      // Log why participant was excluded from sparring ring
      console.log(`[computeRings] ✗ EXCLUDED ${participant.firstName} ${participant.lastName}:`, {
        competingSparring: participant.competingSparring,
        categoryId: effectiveSparring.categoryId,
        pool: effectiveSparring.pool
      });
    }
  });
  
  // Convert groups to CompetitionRing objects
  const ringNames = new Map<string, number>();
  
  ringGroups.forEach((group, key) => {
    const category = categories.find(c => c.id === group.categoryId);
    if (!category) {
      console.warn(`[computeRings] ⚠️ Category not found for ID: ${group.categoryId}`);
      return;
    }
    
    // Look up physical ring mapping
    const mapping = categoryPoolMappings.find(m => 
      m.categoryId === group.categoryId && 
      m.pool === group.pool
    );
    
    const physicalRingId = mapping?.physicalRingId || 'unassigned';
    
    // Create ring name: include division to ensure global uniqueness
    // Format: "Division - Category Pool N" (e.g., "Beginner - Mixed 8-10 Pool 1")
    // This prevents collisions when multiple divisions have same category names
    // Pool format: convert "P1" to "Pool 1"
    const poolDisplay = group.pool.replace(/^P(\d+)$/, 'Pool $1');
    const ringName = `${category.division} - ${category.name} ${poolDisplay}`;
    
    const ring = {
      id: key,
      division: category.division,
      categoryId: group.categoryId,
      physicalRingId,
      type: group.type,
      participantIds: group.participantIds,
      name: ringName
    };
    
    if (group.type === 'sparring') {
      console.log(`[computeRings] CREATED ${group.type} ring "${ringName}" with ${ring.participantIds.length} participants`);
      console.log(`[computeRings]   Ring ID: ${ring.id}`);
      console.log(`[computeRings]   Category ID: ${ring.categoryId}`);
      
      // Warn if duplicate ring names exist (different category IDs but same display name)
      const existingCount = ringNames.get(ringName) || 0;
      ringNames.set(ringName, existingCount + 1);
      if (existingCount > 0) {
        console.error(`[computeRings] ⚠️⚠️⚠️ DUPLICATE RING NAME "${ringName}" - This is ring #${existingCount + 1} with this name!`);
        console.error(`[computeRings] ⚠️⚠️⚠️ Category ID: ${ring.categoryId} - Check for participants with wrong category IDs!`);
      }
    }
    
    rings.push(ring);
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
    return { ...participant, formsPool: pool };
  } else {
    return { ...participant, sparringPool: pool };
  }
}
