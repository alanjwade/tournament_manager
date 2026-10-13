/**
 * Centralized utility functions for managing participant pool assignments.
 * All pool movement logic should go through these functions to ensure consistency.
 */

import { Participant, Category } from '../../../types/tournament';

export type CompetitionType = 'forms' | 'sparring';

/**
 * Move a participant to a new pool, handling all renumbering logic.
 * Returns a new array of participants with all necessary updates applied.
 */
export function moveParticipantToPool(
  participants: Participant[],
  participantId: string,
  type: CompetitionType,
  newCategoryId: string | undefined,
  newPool: string | undefined
): Participant[] {
  const participant = participants.find(p => p.id === participantId);
  if (!participant) return participants;

  const categoryIdField = type === 'forms' ? 'formsCategoryId' : 'sparringCategoryId';
  const poolField = type === 'forms' ? 'formsPool' : 'sparringPool';
  const rankField = type === 'forms' ? 'formsRankOrder' : 'sparringRankOrder';

  const oldCategoryId = participant[categoryIdField];
  const oldPool = participant[poolField];

  // If nothing is changing, return as-is
  if (oldCategoryId === newCategoryId && oldPool === newPool) {
    return participants;
  }

  // Build update map for batch processing
  const updates = new Map<string, Partial<Participant>>();

  // Set the moved participant's new assignment
  updates.set(participantId, {
    [categoryIdField]: newCategoryId,
    [poolField]: newPool,
    [rankField]: newPool ? 1 : undefined, // Position 1 in new pool, or undefined if clearing
  });

  // If leaving an old pool, renumber remaining participants
  if (oldCategoryId && oldPool) {
    const oldPoolParticipants = participants
      .filter(p => p.id !== participantId && p[categoryIdField] === oldCategoryId && p[poolField] === oldPool)
      .sort((a, b) => (a[rankField] || 0) - (b[rankField] || 0));

    oldPoolParticipants.forEach((p, index) => {
      const existing = updates.get(p.id) || {};
      updates.set(p.id, { ...existing, [rankField]: index + 1 });
    });
  }

  // If entering a new pool, shift existing participants down
  if (newCategoryId && newPool) {
    const newPoolParticipants = participants
      .filter(p => p.id !== participantId && p[categoryIdField] === newCategoryId && p[poolField] === newPool)
      .sort((a, b) => (a[rankField] || 0) - (b[rankField] || 0));

    newPoolParticipants.forEach((p, index) => {
      const existing = updates.get(p.id) || {};
      updates.set(p.id, { ...existing, [rankField]: index + 2 }); // Start at 2 since moved person is at 1
    });
  }

  // Apply all updates
  return participants.map(p => {
    const update = updates.get(p.id);
    return update ? { ...p, ...update } : p;
  });
}

/**
 * Withdraw a participant from forms, sparring, or both competitions.
 * Saves their current assignment to last* fields for easy reinstatement.
 */
export function withdrawParticipant(
  participants: Participant[],
  participantId: string,
  type: CompetitionType | 'both'
): Participant[] {
  const participant = participants.find(p => p.id === participantId);
  if (!participant) return participants;

  let result = [...participants];

  if (type === 'forms' || type === 'both') {
    // Save current assignment before clearing
    const participantIndex = result.findIndex(p => p.id === participantId);
    if (participantIndex >= 0) {
      result[participantIndex] = {
        ...result[participantIndex],
        lastFormsCategoryId: result[participantIndex].formsCategoryId,
        lastFormsPool: result[participantIndex].formsPool,
      };
    }
    
    // Use moveParticipantToPool to properly handle renumbering
    result = moveParticipantToPool(result, participantId, 'forms', undefined, undefined);
    
    // Update division and competing flag
    const idx = result.findIndex(p => p.id === participantId);
    if (idx >= 0) {
      result[idx] = {
        ...result[idx],
        formsDivision: null,
        competingForms: false,
      };
    }
  }

  if (type === 'sparring' || type === 'both') {
    // Save current assignment before clearing
    const participantIndex = result.findIndex(p => p.id === participantId);
    if (participantIndex >= 0) {
      result[participantIndex] = {
        ...result[participantIndex],
        lastSparringCategoryId: result[participantIndex].sparringCategoryId,
        lastSparringPool: result[participantIndex].sparringPool,
      };
    }
    
    // Use moveParticipantToPool to properly handle renumbering
    result = moveParticipantToPool(result, participantId, 'sparring', undefined, undefined);
    
    // Update division, competing flag, and clear alt ring
    const idx = result.findIndex(p => p.id === participantId);
    if (idx >= 0) {
      result[idx] = {
        ...result[idx],
        sparringDivision: null,
        competingSparring: false,
        sparringAltRing: '',
      };
    }
  }

  return result;
}

/**
 * Reinstate a participant using their saved last* assignment.
 * Returns the updated participants array, or the original if no saved assignment exists.
 */
export function reinstateParticipant(
  participants: Participant[],
  participantId: string,
  type: CompetitionType,
  division: string,
  categories: Category[]
): Participant[] {
  const participant = participants.find(p => p.id === participantId);
  if (!participant) return participants;

  const lastCategoryId = type === 'forms' ? participant.lastFormsCategoryId : participant.lastSparringCategoryId;
  const lastPool = type === 'forms' ? participant.lastFormsPool : participant.lastSparringPool;

  // Verify the category still exists
  const category = lastCategoryId ? categories.find(c => c.id === lastCategoryId) : undefined;
  
  if (!category || !lastPool) {
    // No saved assignment or category no longer exists - just update division/competing flag
    const divisionField = type === 'forms' ? 'formsDivision' : 'sparringDivision';
    const competingField = type === 'forms' ? 'competingForms' : 'competingSparring';
    
    return participants.map(p => 
      p.id === participantId 
        ? { ...p, [divisionField]: division, [competingField]: true }
        : p
    );
  }

  // Move to saved pool
  let result = moveParticipantToPool(participants, participantId, type, lastCategoryId, lastPool);
  
  // Update division and competing flag
  const divisionField = type === 'forms' ? 'formsDivision' : 'sparringDivision';
  const competingField = type === 'forms' ? 'competingForms' : 'competingSparring';
  
  return result.map(p => 
    p.id === participantId 
      ? { ...p, [divisionField]: division, [competingField]: true }
      : p
  );
}

/**
 * Copy forms assignment to sparring.
 * This is a one-time copy, not an ongoing sync.
 */
export function copySparringFromForms(
  participants: Participant[],
  participantId: string
): Participant[] {
  const participant = participants.find(p => p.id === participantId);
  if (!participant) return participants;

  // If no forms assignment, nothing to copy
  if (!participant.formsCategoryId || !participant.formsPool) {
    return participants;
  }

  // Move sparring to same pool as forms
  let result = moveParticipantToPool(
    participants,
    participantId,
    'sparring',
    participant.formsCategoryId,
    participant.formsPool
  );

  // Also copy the division
  return result.map(p =>
    p.id === participantId
      ? { ...p, sparringDivision: p.formsDivision, competingSparring: p.competingForms }
      : p
  );
}

/**
 * Whether a participant's sparring assignment currently mirrors their forms
 * assignment — same division, same category (the forms/sparring twin categories
 * share a name and age range) and same pool.
 *
 * Forms and sparring use separate twin categories whose ids differ only by the
 * `forms-`/`sparring-` prefix, so the comparison is done on the category's
 * division/name rather than its id.
 *
 * Used to seed the Quick Edit "Use same assignment for both Forms and Sparring"
 * checkbox so that reopening the modal reflects the saved data instead of always
 * defaulting to checked.
 *
 * Returns true when the participant isn't competing in both: in that case the
 * assignments can't meaningfully differ and "same" is the sensible default.
 */
export function sparringMirrorsForms(participant: Participant, categories: Category[]): boolean {
  if (!participant.competingForms || !participant.competingSparring) return true;

  const formsCategory = participant.formsCategoryId
    ? categories.find(c => c.id === participant.formsCategoryId)
    : undefined;
  const sparringCategory = participant.sparringCategoryId
    ? categories.find(c => c.id === participant.sparringCategoryId)
    : undefined;

  if (!formsCategory || !sparringCategory) return false;

  return (
    formsCategory.division === sparringCategory.division &&
    formsCategory.name === sparringCategory.name &&
    (participant.formsPool ?? '') === (participant.sparringPool ?? '')
  );
}

/**
 * When a Quick Edit changes a participant's division, a matching category + pool
 * must also be chosen; otherwise the participant keeps their old (other-division)
 * category/pool and the edit appears to do nothing. Returns the sides that are
 * missing a valid selection so the caller can prompt the user.
 *
 * Only sides whose division is actually being changed are checked (a null/empty
 * division means withdrawing, which needs no category).
 */
export interface DivisionSelectionGap {
  type: 'forms' | 'sparring';
  division: string;
}

export function findDivisionSelectionGaps(
  updates: Partial<Participant>,
  participant: Participant,
  categories: Category[]
): DivisionSelectionGap[] {
  const gaps: DivisionSelectionGap[] = [];

  const check = (
    type: 'forms' | 'sparring',
    newDivision: string | null | undefined,
    updatedCategoryId: string | undefined,
    updatedPool: string | undefined,
    currentCategoryId: string | undefined,
    currentPool: string | undefined
  ) => {
    // Not changing the division (or withdrawing) — nothing to validate.
    if (!newDivision) return;

    const categoryId = updatedCategoryId !== undefined ? updatedCategoryId : currentCategoryId;
    const pool = updatedPool !== undefined ? updatedPool : currentPool;
    const category = categories.find((c) => c.id === categoryId);

    if (!category || !pool || category.division !== newDivision) {
      gaps.push({ type, division: newDivision });
    }
  };

  check(
    'forms',
    updates.formsDivision,
    updates.formsCategoryId,
    updates.formsPool,
    participant.formsCategoryId,
    participant.formsPool
  );
  check(
    'sparring',
    updates.sparringDivision,
    updates.sparringCategoryId,
    updates.sparringPool,
    participant.sparringCategoryId,
    participant.sparringPool
  );

  return gaps;
}

/**
 * Normalize a participant's division field for display.
 * Converts null to "Not Participating" for UI display.
 */
export function getDivisionDisplayValue(division: string | null): string {
  return division ?? 'Not Participating';
}

/**
 * Parse a division display value back to the internal format.
 * Converts "Not Participating" to null.
 */
export function parseDivisionValue(displayValue: string): string | null {
  return displayValue === 'Not Participating' ? null : displayValue;
}
