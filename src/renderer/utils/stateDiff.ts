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

/** Mark the forms ring a participant belongs to (if any). */
function addFormsRing(
  state: SavedState,
  participant: Participant,
  ringsAffected: Set<string>
): void {
  if (!participant.competingForms || !participant.formsCategoryId) return;
  const category = state.categories.find((c) => c.id === participant.formsCategoryId);
  if (category) {
    ringsAffected.add(
      buildRingId(category.division, category.name, participant.formsPool || 'P1', 'forms')
    );
  }
}

/** Mark the sparring ring (including alt-ring suffix) a participant belongs to. */
function addSparringRing(
  state: SavedState,
  participant: Participant,
  ringsAffected: Set<string>
): void {
  if (!participant.competingSparring || !participant.sparringCategoryId) return;
  const category = state.categories.find((c) => c.id === participant.sparringCategoryId);
  if (category) {
    ringsAffected.add(
      buildRingId(
        category.division,
        category.name,
        participant.sparringPool || 'P1',
        'sparring',
        participant.sparringAltRing || undefined
      )
    );
  }
}

/** Mark both rings a participant belongs to. */
function addParticipantRings(
  state: SavedState,
  participant: Participant,
  ringsAffected: Set<string>
): void {
  addFormsRing(state, participant, ringsAffected);
  addSparringRing(state, participant, ringsAffected);
}

/** Mark every configured pool of a category. */
function addCategoryRings(
  category: SavedState['categories'][number],
  ringsAffected: Set<string>
): void {
  const poolCount = Math.max(1, Number(category.numPools) || 1);
  for (let pool = 1; pool <= poolCount; pool++) {
    ringsAffected.add(
      buildRingId(category.division, category.name, `P${pool}`, category.type)
    );
  }
}

/** Mark every ring represented by the given state (used for global changes). */
function addAllRings(state: SavedState, ringsAffected: Set<string>): void {
  (state.participants ?? []).forEach((p) => addParticipantRings(state, p, ringsAffected));
  (state.categories ?? []).forEach((c) => addCategoryRings(c, ringsAffected));
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

  currentParticipants.forEach((currentP) => {
    const baselineP = baselineMap.get(currentP.id);
    if (!baselineP) return; // Already counted in participantsAdded

    // Compare every field, not just assignments: anything that differs from
    // the baseline means the ring's printed documents are stale.
    const fields = new Set<string>([
      ...Object.keys(baselineP),
      ...Object.keys(currentP),
    ]);

    fields.forEach((field) => {
      if (field === 'id') return;

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

      const formsAssignmentFields = [
        'formsDivision', 'formsCategoryId', 'formsPool', 'competingForms',
      ];
      const sparringAssignmentFields = [
        'sparringDivision', 'sparringCategoryId', 'sparringPool',
        'sparringAltRing', 'competingSparring',
      ];

      if (formsAssignmentFields.includes(field)) {
        // Assignment changed: both the old and new forms ring are affected.
        addFormsRing(baseline, baselineP, ringsAffected);
        addFormsRing(current, currentP, ringsAffected);
      } else if (field === 'formsRankOrder') {
        addFormsRing(current, currentP, ringsAffected);
      } else if (sparringAssignmentFields.includes(field)) {
        // Assignment changed: both the old and new sparring ring are affected.
        addSparringRing(baseline, baselineP, ringsAffected);
        addSparringRing(current, currentP, ringsAffected);
      } else if (field === 'sparringRankOrder') {
        addSparringRing(current, currentP, ringsAffected);
      } else {
        // Name, age, school, height, withdrawn state, etc. all appear on the
        // printed documents, so refresh every ring the participant belongs to.
        addParticipantRings(baseline, baselineP, ringsAffected);
        addParticipantRings(current, currentP, ringsAffected);
      }
    });
  });

  // Track rings for newly added participants
  participantsAdded.forEach((p) => addParticipantRings(current, p, ringsAffected));

  // Track rings for removed participants (use baseline categories to resolve their ring)
  participantsRemoved.forEach((p) => addParticipantRings(baseline, p, ringsAffected));

  // Physical-ring assignments changed in the Ring Map. The mapping is keyed by
  // the category-pool name and shared by forms and sparring.
  const baselinePhysicalMappings = new Map(
    (baseline.physicalRingMappings ?? []).map((m) => [m.categoryPoolName, m.physicalRingName])
  );
  const currentPhysicalMappings = new Map(
    (current.physicalRingMappings ?? []).map((m) => [m.categoryPoolName, m.physicalRingName])
  );
  new Set([
    ...baselinePhysicalMappings.keys(),
    ...currentPhysicalMappings.keys(),
  ]).forEach((poolName) => {
    if (baselinePhysicalMappings.get(poolName) !== currentPhysicalMappings.get(poolName)) {
      ringsAffected.add(`${poolName}_forms`);
      ringsAffected.add(`${poolName}_sparring`);
    }
  });

  // Category changes (rename, division, pools, criteria) affect every pool in
  // that category.
  const baselineCategories = new Map((baseline.categories ?? []).map((c) => [c.id, c]));
  const currentCategories = new Map((current.categories ?? []).map((c) => [c.id, c]));
  new Set([...baselineCategories.keys(), ...currentCategories.keys()]).forEach((categoryId) => {
    const baselineCategory = baselineCategories.get(categoryId);
    const currentCategory = currentCategories.get(categoryId);
    if (JSON.stringify(baselineCategory) === JSON.stringify(currentCategory)) return;

    if (baselineCategory) addCategoryRings(baselineCategory, ringsAffected);
    if (currentCategory) addCategoryRings(currentCategory, ringsAffected);
  });

  // A config change (school abbreviations, watermark, physical rings, division
  // labels, ...) alters every printed document, so mark all rings.
  if (JSON.stringify(baseline.config) !== JSON.stringify(current.config)) {
    addAllRings(current, ringsAffected);
  }

  // Category-pool mappings feed the computed physical ring ids; treat any
  // change as affecting the whole schedule.
  if (JSON.stringify(baseline.categoryPoolMappings) !== JSON.stringify(current.categoryPoolMappings)) {
    addAllRings(current, ringsAffected);
  }

  return { participantsAdded, participantsRemoved, participantsModified, ringsAffected };
}

