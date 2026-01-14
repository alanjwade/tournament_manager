import { Participant, Category, CompetitionRing, PhysicalRing } from '../types/tournament';
import { v4 as uuidv4 } from 'uuid';

export function assignRingsWithinCategory(
  category: Category,
  participants: Participant[],
  physicalRings: PhysicalRing[],
  type: 'forms' | 'sparring'
): { updatedParticipants: Participant[]; competitionRings: CompetitionRing[] } {
  const categoryParticipants = participants.filter((p) =>
    category.participantIds.includes(p.id)
  );

  if (categoryParticipants.length === 0) {
    return { updatedParticipants: participants, competitionRings: [] };
  }

  const poolsNeeded = category.numPools;
  const availableRings = physicalRings.slice(0, poolsNeeded);

  if (availableRings.length < poolsNeeded) {
    throw new Error(
      `Not enough physical rings. Need ${poolsNeeded}, have ${availableRings.length}`
    );
  }

  // Sort participants by age for distribution
  const sortedParticipants = [...categoryParticipants].sort(
    (a, b) => a.age - b.age
  );

  // Distribute participants across pools
  const poolAssignments: Map<string, Participant[]> = new Map();
  availableRings.forEach((ring) => {
    poolAssignments.set(ring.id, []);
  });

  sortedParticipants.forEach((participant, index) => {
    const poolIndex = index % poolsNeeded;
    const ring = availableRings[poolIndex];
    poolAssignments.get(ring.id)!.push(participant);
  });

  // Create competition rings and update participants
  const competitionRings: CompetitionRing[] = [];
  const updatedParticipants = [...participants];

  let poolCounter = 1;
  poolAssignments.forEach((poolParticipants, physicalRingId) => {
    const ring = availableRings.find((r) => r.id === physicalRingId)!;
    const ringId = `${type}-${category.id}-${ring.id}`;
    const ringName = `${category.name}_R${poolCounter}`;
    const pool = `R${poolCounter}`; // Pool identifier

    competitionRings.push({
      id: ringId,
      division: category.division,
      categoryId: category.id,
      physicalRingId: ring.id,
      type,
      participantIds: poolParticipants.map((p) => p.id),
      name: ringName,
    });

    poolCounter++;

    // Update participants with pool assignment
    poolParticipants.forEach((p) => {
      const index = updatedParticipants.findIndex((up) => up.id === p.id);
      if (index !== -1) {
        if (type === 'forms') {
          updatedParticipants[index] = {
            ...updatedParticipants[index],
            formsPool: pool,
          };
        } else {
          updatedParticipants[index] = {
            ...updatedParticipants[index],
            sparringPool: pool,
          };
        }
      }
    });
  });

  return { updatedParticipants, competitionRings };
}

export function assignRingsForAllCategories(
  categories: Category[],
  participants: Participant[],
  physicalRings: PhysicalRing[],
  type: 'forms' | 'sparring',
  division?: string
): { updatedParticipants: Participant[]; competitionRings: CompetitionRing[] } {
  let currentParticipants = [...participants];
  const allCompetitionRings: CompetitionRing[] = [];

  const targetCategories = division
    ? categories.filter((c) => c.division === division)
    : categories;

  targetCategories.forEach((category) => {
    const { updatedParticipants, competitionRings } = assignRingsWithinCategory(
      category,
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
// the corresponding sparring pools.
export function mapSparringToForms(
  categories: Category[],
  participants: Participant[],
  formsCompetitionRings: CompetitionRing[]
): { updatedParticipants: Participant[]; competitionRings: CompetitionRing[] } {
  console.log('[mapSparringToForms] FUNCTION START');
  console.log('[mapSparringToForms] categories:', categories.length);
  console.log('[mapSparringToForms] participants:', participants.length);
  console.log('[mapSparringToForms] formsCompetitionRings:', formsCompetitionRings.length);
  
  const updatedParticipants = [...participants];
  const sparringRings: CompetitionRing[] = [];

  // Group participants by their sparring category and forms pool (R1, R2, etc.)
  // This ensures sparring participants are in the same pool as their forms assignment
  const grouping: Map<string, Map<string, {
    participantIds: string[];
    physicalId: string;
    ringName: string;
  }>> = new Map();
  
  // CRITICAL FIX: Only process rings from FORMS categories, not sparring categories
  // Get all Forms category IDs
  const formsCategoryIds = new Set(categories.filter(c => c.type === 'forms').map(c => c.id));
  console.log('[mapSparringToForms] formsCategoryIds:', formsCategoryIds.size);
  
  // Filter to only process Forms category rings
  const actualFormsRings = formsCompetitionRings.filter(ring => formsCategoryIds.has(ring.categoryId));
  console.log('[mapSparringToForms] actualFormsRings:', actualFormsRings.length, 'of', formsCompetitionRings.length);

  // Debugging: log participant/sparring counts to help trace mapping issues
  try {
    console.log('[mapSparringToForms] total participants:', participants.length);
    const totalSparring = participants.filter(p => p.competingSparring).length;
    const totalWithSparringCategory = participants.filter(p => !!p.sparringCategoryId).length;
    const totalWithFormsPool = participants.filter(p => !!p.formsPool).length;
    const sparringWithFormsPool = participants.filter(p => p.competingSparring && !!p.formsPool).length;
    const sparringWithCategoryAndPool = participants.filter(p => p.competingSparring && !!p.sparringCategoryId && !!p.formsPool).length;
    console.log('[mapSparringToForms] competingSparring=', totalSparring, 'with sparringCategoryId=', totalWithSparringCategory);
    console.log('[mapSparringToForms] totalWithFormsPool=', totalWithFormsPool);
    console.log('[mapSparringToForms] sparringWithFormsPool=', sparringWithFormsPool);
    console.log('[mapSparringToForms] sparringWithCategoryAndPool=', sparringWithCategoryAndPool);
    
    // Warn if participants are competing in sparring but not assigned to sparring categories
    if (totalSparring > 0 && totalWithSparringCategory === 0) {
      console.warn('⚠️ WARNING: Participants are marked as competing in sparring, but NONE are assigned to sparring categories!');
      console.warn('⚠️ Please go to Category Management tab and assign participants to sparring categories first.');
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
      let hasFormsPool = 0;
      formsRing.participantIds.forEach((pid) => {
        const participant = participants.find((p) => p.id === pid);
        if (participant) {
          if (participant.formsPool) hasFormsPool++;
          if (participant.competingSparring && participant.sparringCategoryId) qualified++;
        }
      });
      console.log(`[mapSparringToForms] formsRing ${formsRing.id} (${formsRing.name}) participants=${ringSize} hasFormsPool=${hasFormsPool} qualifiedForSparring=${qualified}`);
    } catch (e) {
      console.warn('[mapSparringToForms] ring-level debug failed', e);
    }

    formsRing.participantIds.forEach((pid) => {
      const participant = participants.find((p) => p.id === pid);
      if (!participant) return;

      // Only map participants who are actually sparring and have a sparring category
      const sparringCategoryId = participant.sparringCategoryId;
      if (participant.competingSparring && sparringCategoryId) {
        const scId = sparringCategoryId;
        
        // Use the participant's forms pool to determine their sparring pool
        const formsPool = participant.formsPool;
        if (!formsPool) {
          console.log('[mapSparringToForms] SKIPPING participant - no formsPool', pid, 'competingForms=', participant.competingForms, 'formsCategoryId=', participant.formsCategoryId, 'formsPool=', formsPool);
          return; // Skip if they don't have a forms pool assigned
        }

        // Debug: log when a participant is skipped due to missing sparring category or not competing
        if (!participant.competingSparring || !sparringCategoryId) {
          console.log('[mapSparringToForms] skipping participant for sparring mapping', pid, 'competingSparring=', participant.competingSparring, 'sparringCategoryId=', sparringCategoryId);
          return;
        }
        
        if (!grouping.has(scId)) grouping.set(scId, new Map());
        const byPool = grouping.get(scId)!;
        
        if (!byPool.has(formsPool)) {
          byPool.set(formsPool, {
            participantIds: [],
            physicalId: physicalId,
            ringName: formsRing.name || ''
          });
        }
        byPool.get(formsPool)!.participantIds.push(pid);
      }
    });
  });

  // For each sparring category, create competition rings corresponding to the pools
  grouping.forEach((byPool, sparringCategoryId) => {
    const category = categories.find((c) => c.id === sparringCategoryId);
    if (!category) return;

    // For each pool (R1, R2, etc.) with sparring participants
    byPool.forEach((ringData, formsPool) => {
      const { participantIds, physicalId, ringName: formsRingName } = ringData;
      
      // Use the same pool identifier as forms (e.g., "R1")
      const pool = formsPool;
      
      // Create ring name matching the forms ring name
      const ringName = formsRingName
        ? formsRingName.replace(' Forms', '').replace(' Sparring', '')
        : `${category.name}_${pool}`;
      
      const ringId = `sparring-${sparringCategoryId}-${pool}`;

      sparringRings.push({
        id: ringId,
        division: category.division,
        categoryId: sparringCategoryId,
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
            sparringPool: pool,
          };
        }
      });
    });
  });

  console.log('[mapSparringToForms] FUNCTION END - created', sparringRings.length, 'sparring rings');
  return { updatedParticipants, competitionRings: sparringRings };
}
