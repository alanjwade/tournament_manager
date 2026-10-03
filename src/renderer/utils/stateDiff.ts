/**
 * Compute the difference between a baseline state (a history commit) and the
 * current state, used by the "changed since baseline" highlighting, the
 * Print-All-Changed feature, and selective PDF export.
 *
 * The ring identifiers produced here match the format used elsewhere:
 *   "Division - CategoryName Pool N_type[_altRing]"
 */
import type {
  Participant,
  ParticipantChange,
  StateDiff,
  TournamentState as SavedState,
} from '../types/tournament';

/** Build a ring identifier with full context (division, category, pool, type, alt ring). */
function buildRingId(
  division: string,
  categoryName: string,
  pool: string,
  type: 'forms' | 'sparring',
  altRing?: string
): string {
  const poolDisplay = pool.replace(/^P(\d+)$/, 'Pool $1');
  let id = `${division} - ${categoryName} ${poolDisplay}_${type}`;
  if (type === 'sparring' && altRing) {
    id += `_${altRing}`;
  }
  return id;
}

export function computeStateDiff(baseline: SavedState, current: SavedState): StateDiff {
  const currentParticipants = current.participants ?? [];
  const baselineParticipants = baseline.participants ?? [];

  const currentMap = new Map(currentParticipants.map((p) => [p.id, p]));
  const baselineMap = new Map(baselineParticipants.map((p) => [p.id, p]));

  const participantsAdded = currentParticipants.filter((p) => !baselineMap.has(p.id));
  const participantsRemoved = baselineParticipants.filter((p) => !currentMap.has(p.id));

  const participantsModified: ParticipantChange[] = [];
  const ringsAffected = new Set<string>();

  const fieldsToCheck: (keyof Participant)[] = [
    'formsCategoryId', 'sparringCategoryId',
    'formsPool', 'sparringPool', 'sparringAltRing',
    'competingForms', 'competingSparring',
    'formsRankOrder', 'sparringRankOrder',
  ];

  currentParticipants.forEach((currentP) => {
    const baselineP = baselineMap.get(currentP.id);
    if (!baselineP) return; // Already counted in participantsAdded

    fieldsToCheck.forEach((field) => {
      const currentValue = (currentP as any)[field];
      const baselineValue = (baselineP as any)[field];
      if (JSON.stringify(currentValue) === JSON.stringify(baselineValue)) return;

      participantsModified.push({
        participantId: currentP.id,
        participantName: `${currentP.firstName} ${currentP.lastName}`,
        field,
        oldValue: baselineValue,
        newValue: currentValue,
      });

      // Track affected rings for forms changes
      if (field === 'formsCategoryId' || field === 'formsPool' || field === 'formsRankOrder' || field === 'competingForms') {
        if (field === 'formsRankOrder') {
          const category = current.categories.find((c) => c.id === currentP.formsCategoryId);
          if (category && currentP.competingForms) {
            ringsAffected.add(buildRingId(category.division, category.name, currentP.formsPool || 'P1', 'forms'));
          }
        } else {
          if (baselineP.competingForms && baselineP.formsCategoryId) {
            const category = baseline.categories.find((c) => c.id === baselineP.formsCategoryId);
            if (category) ringsAffected.add(buildRingId(category.division, category.name, baselineP.formsPool || 'P1', 'forms'));
          }
          if (currentP.competingForms && currentP.formsCategoryId) {
            const category = current.categories.find((c) => c.id === currentP.formsCategoryId);
            if (category) ringsAffected.add(buildRingId(category.division, category.name, currentP.formsPool || 'P1', 'forms'));
          }
        }
      }

      // Track affected rings for sparring changes
      if (field === 'sparringCategoryId' || field === 'sparringPool' || field === 'sparringAltRing' || field === 'sparringRankOrder' || field === 'competingSparring') {
        if (field === 'sparringRankOrder') {
          const category = current.categories.find((c) => c.id === currentP.sparringCategoryId);
          if (category && currentP.competingSparring) {
            ringsAffected.add(buildRingId(category.division, category.name, currentP.sparringPool || 'P1', 'sparring', currentP.sparringAltRing || undefined));
          }
        } else {
          if (baselineP.competingSparring && baselineP.sparringCategoryId) {
            const category = baseline.categories.find((c) => c.id === baselineP.sparringCategoryId);
            if (category) ringsAffected.add(buildRingId(category.division, category.name, baselineP.sparringPool || 'P1', 'sparring', baselineP.sparringAltRing || undefined));
          }
          if (currentP.competingSparring && currentP.sparringCategoryId) {
            const category = current.categories.find((c) => c.id === currentP.sparringCategoryId);
            if (category) ringsAffected.add(buildRingId(category.division, category.name, currentP.sparringPool || 'P1', 'sparring', currentP.sparringAltRing || undefined));
          }
        }
      }
    });
  });

  // Track rings for newly added participants
  participantsAdded.forEach((p) => {
    if (p.competingForms && p.formsCategoryId) {
      const category = current.categories.find((c) => c.id === p.formsCategoryId);
      if (category) ringsAffected.add(buildRingId(category.division, category.name, p.formsPool || 'P1', 'forms'));
    }
    if (p.competingSparring && p.sparringCategoryId) {
      const category = current.categories.find((c) => c.id === p.sparringCategoryId);
      if (category) ringsAffected.add(buildRingId(category.division, category.name, p.sparringPool || 'P1', 'sparring', p.sparringAltRing || undefined));
    }
  });

  // Track rings for removed participants (use baseline categories to resolve their ring)
  participantsRemoved.forEach((p) => {
    if (p.competingForms && p.formsCategoryId) {
      const category = baseline.categories.find((c) => c.id === p.formsCategoryId);
      if (category) ringsAffected.add(buildRingId(category.division, category.name, p.formsPool || 'P1', 'forms'));
    }
    if (p.competingSparring && p.sparringCategoryId) {
      const category = baseline.categories.find((c) => c.id === p.sparringCategoryId);
      if (category) ringsAffected.add(buildRingId(category.division, category.name, p.sparringPool || 'P1', 'sparring', p.sparringAltRing || undefined));
    }
  });

  return { participantsAdded, participantsRemoved, participantsModified, ringsAffected };
}

