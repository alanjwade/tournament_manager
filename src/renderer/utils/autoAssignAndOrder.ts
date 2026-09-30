import { Participant, Category } from '../types/tournament';
import { orderFormsRing, orderSparringRing } from './ringOrdering';

/**
 * Automatically assigns participants to pools and orders them
 * when a category is created or its pool count changes.
 *
 * Membership is derived from the participants themselves (their
 * formsCategoryId/sparringCategoryId), matching computeCompetitionRings.
 * Categories do not store a participant list, so participants added or
 * re-assigned elsewhere always receive a pool and appear in every ring/PDF.
 */
export function autoAssignAndOrderCategory(
  category: Category,
  allParticipants: Participant[]
): Participant[] {
  const categoryType = category.type;

  const categoryParticipants = allParticipants.filter((p) => {
    if (p.withdrawn) return false;
    return categoryType === 'sparring'
      ? p.sparringCategoryId === category.id
      : p.formsCategoryId === category.id;
  });

  if (categoryParticipants.length === 0) {
    return allParticipants;
  }

  const poolsNeeded = category.numPools;
  
  // Sort participants by age for distribution
  const sortedParticipants = [...categoryParticipants].sort(
    (a, b) => a.age - b.age
  );

  // Distribute participants across pools
  const poolAssignments: Map<string, Participant[]> = new Map();
  for (let i = 1; i <= poolsNeeded; i++) {
    poolAssignments.set(`P${i}`, []);
  }

  sortedParticipants.forEach((participant, index) => {
    let poolName: string;
    
    // If this is sparring and the participant already has a forms pool assigned,
    // try to use the same pool number (if it exists in this category)
    if (categoryType === 'sparring' && participant.formsPool) {
      const formsPoolNum = parseInt(participant.formsPool.replace('P', ''));
      if (formsPoolNum <= poolsNeeded) {
        poolName = participant.formsPool;
      } else {
        // Forms pool number is too high, use round-robin
        const poolIndex = (index % poolsNeeded) + 1;
        poolName = `P${poolIndex}`;
      }
    } else {
      // For forms, or sparring without forms pool, use round-robin
      const poolIndex = (index % poolsNeeded) + 1;
      poolName = `P${poolIndex}`;
    }
    
    poolAssignments.get(poolName)!.push(participant);
  });

  // Update participants with pool assignments
  let updatedParticipants = [...allParticipants];
  
  poolAssignments.forEach((poolParticipants, poolName) => {
    poolParticipants.forEach((participant) => {
      const index = updatedParticipants.findIndex((p) => p.id === participant.id);
      if (index !== -1) {
        if (categoryType === 'forms') {
          updatedParticipants[index] = {
            ...updatedParticipants[index],
            formsPool: poolName,
          };
        } else if (categoryType === 'sparring') {
          updatedParticipants[index] = {
            ...updatedParticipants[index],
            sparringPool: poolName,
          };
        }
      }
    });

    // Now order participants within this pool
    if (categoryType === 'forms') {
      updatedParticipants = orderFormsRing(updatedParticipants, category.id, poolName);
    } else if (categoryType === 'sparring') {
      updatedParticipants = orderSparringRing(updatedParticipants, category.id, poolName);
    }
  });

  return updatedParticipants;
}

/**
 * Automatically assigns and orders all categories.
 * Used when loading a tournament or after bulk operations.
 */
export function autoAssignAndOrderAllCategories(
  categories: Category[],
  participants: Participant[]
): Participant[] {
  let updatedParticipants = [...participants];
  
  for (const category of categories) {
    updatedParticipants = autoAssignAndOrderCategory(category, updatedParticipants);
  }
  
  return updatedParticipants;
}
