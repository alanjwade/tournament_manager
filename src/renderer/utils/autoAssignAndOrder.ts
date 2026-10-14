import { Participant, Category, PoolCriteria } from '../types/tournament';
import { orderFormsRing, orderSparringRing } from './ringOrdering';

/** Fallback split when a category was created before the criteria existed. */
export const DEFAULT_POOL_CRITERIA: PoolCriteria = 'height';

/** Resolve a category's pool-splitting criteria (defaults to height). */
export function getPoolCriteria(category: Category): PoolCriteria {
  return category.poolCriteria ?? DEFAULT_POOL_CRITERIA;
}

/**
 * Numeric sort key used to distribute participants across pools: total height
 * (feet*12 + inches) for a height split, otherwise age. Participants are first
 * sorted by this key, then split into pools by `computePoolIndex`.
 */
function poolSortKey(participant: Participant, criteria: PoolCriteria): number {
  if (criteria === 'height') {
    const feet = Number.isFinite(participant.heightFeet) ? participant.heightFeet : 0;
    const inches = Number.isFinite(participant.heightInches) ? participant.heightInches : 0;
    return feet * 12 + inches;
  }
  return Number.isFinite(participant.age) ? participant.age : 0;
}

/**
 * Which pool (0-based) the participant at `index` of the sorted list belongs to.
 *
 * - height: **strict contiguous height bands** — the shortest competitors fill
 *   P1, the next band fills P2, and so on, so each pool covers a distinct height
 *   range instead of mixing the shortest with the tallest.
 * - age: round-robin, so each pool gets an even spread across the age range.
 *
 * Height bands are sized as evenly as possible; when the count doesn't divide
 * evenly the earliest pools take one extra participant.
 */
export function computePoolIndex(
  index: number,
  total: number,
  poolsNeeded: number,
  criteria: PoolCriteria
): number {
  if (poolsNeeded <= 1) return 0;

  if (criteria === 'height') {
    const base = Math.floor(total / poolsNeeded);
    const remainder = total % poolsNeeded;
    let cumulative = 0;
    for (let i = 0; i < poolsNeeded; i++) {
      cumulative += base + (i < remainder ? 1 : 0);
      if (index < cumulative) return i;
    }
    return poolsNeeded - 1;
  }

  return index % poolsNeeded;
}

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

  // Distribute by the category's chosen criteria (age or height)
  const criteria = getPoolCriteria(category);
  const sortedParticipants = [...categoryParticipants].sort(
    (a, b) => poolSortKey(a, criteria) - poolSortKey(b, criteria)
  );

  // Distribute participants across pools
  const poolAssignments: Map<string, Participant[]> = new Map();
  for (let i = 1; i <= poolsNeeded; i++) {
    poolAssignments.set(`P${i}`, []);
  }

  sortedParticipants.forEach((participant, index) => {
    let poolName: string | undefined;

    // If this is sparring and the participant already has a forms pool assigned,
    // try to use the same pool number (if it exists in this category), so a
    // competitor stays on the same physical ring number across both events.
    if (categoryType === 'sparring' && participant.formsPool) {
      const formsPoolNum = parseInt(participant.formsPool.replace('P', ''));
      if (formsPoolNum <= poolsNeeded) {
        poolName = participant.formsPool;
      }
    }

    if (!poolName) {
      const poolIndex = computePoolIndex(index, sortedParticipants.length, poolsNeeded, criteria);
      poolName = `P${poolIndex + 1}`;
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
