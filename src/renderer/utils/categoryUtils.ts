import { Category, Participant, PhysicalRingMapping } from '../types/tournament';
import { buildCategoryPoolName } from './ringNameFormatter';

/**
 * Two categories are "twins" when they describe the exact same group of
 * competitors and differ only by type (Forms vs Sparring). The Categories tab
 * creates them as a pair sharing name/division/gender/age, with ids of the form
 * `<type>-<division>-<gender>-<minAge>-<maxAge>`.
 */
function isSameCompetitorGroup(a: Category, b: Category): boolean {
  return (
    a.name === b.name &&
    a.division === b.division &&
    a.gender === b.gender &&
    a.minAge === b.minAge &&
    a.maxAge === b.maxAge
  );
}

/** Find the opposite-type category paired with `category`, if one exists. */
export function findTwinCategory(categories: Category[], category: Category): Category | undefined {
  const oppositeType: Category['type'] = category.type === 'forms' ? 'sparring' : 'forms';
  return categories.find(c => c.type === oppositeType && isSameCompetitorGroup(c, category));
}

/**
 * Return the opposite-type twin of `category`. When no twin exists yet a copy is
 * created (in memory) so callers can persist it alongside the rest of the
 * category list. This keeps Forms/Sparring assignments paired even when the
 * category was originally created for only one event type.
 */
export function ensureTwinCategory(
  categories: Category[],
  category: Category
): { categories: Category[]; twin: Category } {
  const existing = findTwinCategory(categories, category);
  if (existing) return { categories, twin: existing };

  const twinType: Category['type'] = category.type === 'forms' ? 'sparring' : 'forms';
  const canonicalId = `${twinType}-${category.division}-${category.gender}-${category.minAge}-${category.maxAge}`;

  // Reuse a same-id category if one is already present, otherwise add the twin.
  const existingById = categories.find(c => c.id === canonicalId);
  if (existingById) return { categories, twin: existingById };

  const twin: Category = {
    id: canonicalId,
    name: category.name,
    division: category.division,
    type: twinType,
    gender: category.gender,
    minAge: category.minAge,
    maxAge: category.maxAge,
    numPools: category.numPools,
  };

  return { categories: [...categories, twin], twin };
}

/**
 * Turn on "competing in sparring" for a participant, preferring an existing
 * sparring assignment and otherwise pairing them with the Sparring twin of
 * their Forms category (creating that twin if needed). The sparring pool is
 * copied from the forms pool because it usually isn't set yet.
 *
 * The participant's Forms physical-ring mapping is also carried over to the
 * matching Sparring category pool, so the "Sparring Ring" column is populated
 * without a separate trip to the Ring Map tab.
 *
 * Returns the (possibly updated) category and physical-ring-mapping lists plus
 * the participant field updates to apply. The caller is responsible for
 * persisting all three.
 */
export function assignSparringFromForms(
  participant: Participant,
  categories: Category[],
  physicalRingMappings: PhysicalRingMapping[] = []
): {
  categories: Category[];
  physicalRingMappings: PhysicalRingMapping[];
  updates: Partial<Participant>;
} {
  const formsCategory = categories.find(c => c.id === participant.formsCategoryId);
  const existingSparringCategory = participant.sparringCategoryId
    ? categories.find(c => c.id === participant.sparringCategoryId)
    : undefined;

  let nextCategories = categories;
  let sparringCategory = existingSparringCategory;
  let sparringPool = participant.sparringPool;

  if (existingSparringCategory) {
    // Keep the existing sparring category; mirror the forms pool if unset.
    sparringPool = participant.sparringPool ?? participant.formsPool;
  } else if (formsCategory) {
    // Pair with the Sparring twin of the Forms category (creating it if needed)
    // and copy the forms pool.
    const ensured = ensureTwinCategory(categories, formsCategory);
    nextCategories = ensured.categories;
    sparringCategory = ensured.twin;
    sparringPool = participant.formsPool;
  }

  const updates: Partial<Participant> = {
    competingSparring: true,
    sparringDivision: participant.sparringDivision ?? participant.formsDivision,
  };
  if (sparringCategory && !existingSparringCategory) {
    updates.sparringCategoryId = sparringCategory.id;
  }
  if (sparringPool !== undefined) {
    updates.sparringPool = sparringPool;
  }

  // Carry the Forms physical-ring assignment over to the Sparring pool so the
  // "Sparring Ring" column is filled in as well.
  const nextPhysicalRingMappings =
    formsCategory && sparringCategory
      ? copyFormsPhysicalRingMapping(
          physicalRingMappings,
          formsCategory,
          participant.formsPool,
          sparringCategory,
          sparringPool
        )
      : physicalRingMappings;

  return {
    categories: nextCategories,
    physicalRingMappings: nextPhysicalRingMappings,
    updates,
  };
}

/** Copy the Forms category pool's physical-ring assignment onto the twin pool. */
function copyFormsPhysicalRingMapping(
  physicalRingMappings: PhysicalRingMapping[],
  formsCategory: Category,
  formsPool: string | undefined,
  sparringCategory: Category,
  sparringPool: string | undefined
): PhysicalRingMapping[] {
  if (!formsPool || !sparringPool) return physicalRingMappings;

  const formsKey = buildCategoryPoolName(formsCategory.division, formsCategory.name, formsPool);
  const formsMapping = physicalRingMappings.find(m => m.categoryPoolName === formsKey);
  if (!formsMapping) return physicalRingMappings;

  const sparringKey = buildCategoryPoolName(sparringCategory.division, sparringCategory.name, sparringPool);
  if (sparringKey === formsKey) return physicalRingMappings; // shared key — already covered
  if (physicalRingMappings.some(m => m.categoryPoolName === sparringKey)) return physicalRingMappings;

  return [...physicalRingMappings, { categoryPoolName: sparringKey, physicalRingName: formsMapping.physicalRingName }];
}

