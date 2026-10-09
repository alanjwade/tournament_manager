import { Participant, Category, Division, PhysicalRingMapping } from '../types/tournament';
import { buildCategoryPoolName } from './ringNameFormatter';

/** Per-division participation counts. */
export interface DivisionStat {
  name: string;
  /** Unique participants competing (Forms and/or Sparring) in this division. */
  total: number;
  /** Participants competing in Forms in this division. */
  forms: number;
  /** Participants competing in Sparring in this division. */
  sparring: number;
}

/** Breakdown of participants that don't land in any division row. */
export interface UnmappedBreakdown {
  /** Withdrawn participants (excluded from all active counts). */
  withdrawn: number;
  /** Not competing in Forms or Sparring. */
  notCompeting: number;
  /** Competing but assigned to no division at all. */
  noDivision: number;
  /** Competing with a division that isn't in Configuration. */
  unknownDivision: number;
  /** Competing in Forms without a Forms category. */
  formsNoCategory: number;
  /** Competing in Sparring without a Sparring category. */
  sparringNoCategory: number;
  /** Has a category but no pool. */
  categoryNoPool: number;
  /** Has a category + pool that isn't mapped to a physical ring. */
  poolNoPhysicalRing: number;
  /** Number of names shared by more than one participant. */
  duplicateNames: number;
}

/** A Configuration problem that drives the Configuration tab badge. */
export interface ConfigIssueCategory {
  id: string;
  name: string;
  numPools: number;
}

export interface ConfigIssuePool {
  /** Category pool name, e.g. "Black Belt - Male 18+ Pool 3". */
  name: string;
  participantCount: number;
}

export interface ConfigIssue {
  division: string;
  kind: 'pool-unmapped';
  type: 'forms' | 'sparring';
  message: string;
  /** Total pools for this division + type (sum of the categories' numPools). */
  poolCount: number;
  /** Pools that have participants but no physical ring assigned in the Ring Map. */
  unmappedCount: number;
  /** The categories whose pools make up poolCount. */
  categories: ConfigIssueCategory[];
  /** The pools missing a physical ring (with participant counts). */
  pools: ConfigIssuePool[];
}

/** A physical ring currently referenced by a mapping, and the pools on it. */
export interface PhysicalRingUsage {
  name: string;
  pools: string[];
}

/** A pool with participants that isn't mapped to a physical ring. */
export interface UnmappedPoolProblem {
  poolName: string;
  type: 'forms' | 'sparring';
  participants: string[];
}

export interface ParticipantProblem {
  participant: string;
  type: 'forms' | 'sparring';
  detail: string;
}

/** A participant who isn't counted in any division, and why. */
export interface UnmappedParticipant {
  participant: string;
  reason: string;
  detail: string;
}

/** Names behind the non-configuration problems, for follow-up in the Editor. */
export interface ProblemDetails {
  missingCategory: ParticipantProblem[];
  categoryNoPool: ParticipantProblem[];
  unmappedPools: UnmappedPoolProblem[];
  /** Everyone not counted in a division, with the reason. */
  notInDivision: UnmappedParticipant[];
}

export interface SanityStats {
  divisions: DivisionStat[];
  totals: {
    participants: number;
    /** Unique participants counted in at least one division. */
    inAnyDivision: number;
    /** Participants competing in Forms (excluding withdrawn). */
    formsCompeting: number;
    /** Participants competing in Sparring (excluding withdrawn). */
    sparringCompeting: number;
  };
  /** Total participants not counted in any division row. */
  unmappedTotal: number;
  unmapped: UnmappedBreakdown;
  configIssues: ConfigIssue[];
  /** Physical rings currently referenced by ring mappings (Ring 1, Ring 1a, …). */
  physicalRings: PhysicalRingUsage[];
  /** Names/pools behind the unmapped problems, for follow-up in the Editor. */
  problemDetails: ProblemDetails;
}

/**
 * Configuration problems that are surfaced as the Configuration tab badge.
 *
 * A pool only needs a physical ring once it has competitors. The real problem
 * (and the only thing the Ring Map can't fix silently) is a pool that has
 * participants but hasn't been assigned to a physical ring yet — those matches
 * have nowhere to run. Multiple pools routinely share one physical ring (the
 * Ring Map splits them into Ring 1a / Ring 1b), so the number of pools is NOT
 * compared against a ring count.
 *
 * Kept here so the badge and the Sanity Check tab agree.
 */
export function computeConfigIssues(
  divisions: Division[],
  categories: Category[],
  participants: Participant[] = [],
  physicalRingMappings: PhysicalRingMapping[] = []
): ConfigIssue[] {
  const issues: ConfigIssue[] = [];

  // A pool counts as mapped only when the Ring Map stored a non-empty ring name.
  const mappedPoolNames = new Set(
    physicalRingMappings
      .filter((m) => m.physicalRingName && m.physicalRingName.trim() !== '')
      .map((m) => m.categoryPoolName)
  );

  const poolsFor = (
    divisionName: string,
    type: 'forms' | 'sparring'
  ): {
    categories: ConfigIssueCategory[];
    pools: ConfigIssuePool[];
    unmapped: ConfigIssuePool[];
  } => {
    const cats = categories.filter((c) => c.division === divisionName && c.type === type);
    const pools: ConfigIssuePool[] = [];
    const unmapped: ConfigIssuePool[] = [];

    cats.forEach((c) => {
      const numPools = c.numPools || 1;
      for (let i = 1; i <= numPools; i++) {
        const pool = `P${i}`;
        const participantCount = participants.filter((p) =>
          type === 'forms'
            ? p.competingForms && p.formsCategoryId === c.id && p.formsPool === pool
            : p.competingSparring && p.sparringCategoryId === c.id && p.sparringPool === pool
        ).length;
        const name = buildCategoryPoolName(c.division, c.name, pool);
        pools.push({ name, participantCount });
        // Only pools that actually have competitors need a ring.
        if (participantCount > 0 && !mappedPoolNames.has(name)) {
          unmapped.push({ name, participantCount });
        }
      }
    });

    return {
      categories: cats.map((c) => ({ id: c.id, name: c.name, numPools: c.numPools || 1 })),
      pools,
      unmapped,
    };
  };

  divisions.forEach((division) => {
    (['forms', 'sparring'] as const).forEach((type) => {
      const data = poolsFor(division.name, type);
      if (data.unmapped.length === 0) return;

      const label = type === 'forms' ? 'Forms' : 'Sparring';
      const allUnmapped = data.unmapped.length === data.pools.length;
      issues.push({
        division: division.name,
        kind: 'pool-unmapped',
        type,
        poolCount: data.pools.length,
        unmappedCount: data.unmapped.length,
        categories: data.categories,
        pools: data.unmapped,
        message: allUnmapped
          ? `${data.unmapped.length} ${label} pool(s) have participants but no physical ring yet (set them up on the Ring Map tab)`
          : `${data.unmapped.length} of ${data.pools.length} ${label} pool(s) have participants but no physical ring yet`,
      });
    });
  });

  return issues;
}

/**
 * Build the Sanity Check totals: participation per division, grand totals, and
 * a breakdown of everyone who isn't counted in any division.
 *
 * Withdrawn participants are excluded from active counts and reported separately.
 */
export function computeSanityStats(
  participants: Participant[],
  categories: Category[],
  divisions: Division[],
  physicalRingMappings: PhysicalRingMapping[]
): SanityStats {
  const sortedDivisions = [...divisions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const known = new Map(
    sortedDivisions.map((d) => [d.name, { name: d.name, forms: 0, sparring: 0, ids: new Set<string>() }])
  );
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const mappedPoolKeys = new Set(physicalRingMappings.map((m) => m.categoryPoolName));

  let inAnyDivision = 0;
  let formsCompeting = 0;
  let sparringCompeting = 0;

  const unmapped: UnmappedBreakdown = {
    withdrawn: 0,
    notCompeting: 0,
    noDivision: 0,
    unknownDivision: 0,
    formsNoCategory: 0,
    sparringNoCategory: 0,
    categoryNoPool: 0,
    poolNoPhysicalRing: 0,
    duplicateNames: 0,
  };

  const problemDetails: ProblemDetails = {
    missingCategory: [],
    categoryNoPool: [],
    unmappedPools: [],
    notInDivision: [],
  };
  const unmappedPoolMap = new Map<string, UnmappedPoolProblem>();
  const participantName = (p: Participant) =>
    `${(p.firstName ?? '').trim()} ${(p.lastName ?? '').trim()}`.trim() || p.id;

  participants.forEach((p) => {
    if (p.withdrawn) {
      unmapped.withdrawn++;
      problemDetails.notInDivision.push({ participant: participantName(p), reason: 'Withdrawn', detail: '' });
      return;
    }

    const competingForms = !!p.competingForms;
    const competingSparring = !!p.competingSparring;

    // Category / pool / ring sanity (independent of division placement).
    if (competingForms) {
      if (!p.formsCategoryId) {
        unmapped.formsNoCategory++;
        problemDetails.missingCategory.push({
          participant: participantName(p),
          type: 'forms',
          detail: p.formsDivision || 'no division',
        });
      } else if (!p.formsPool) {
        unmapped.categoryNoPool++;
        problemDetails.categoryNoPool.push({
          participant: participantName(p),
          type: 'forms',
          detail: categoryById.get(p.formsCategoryId)?.name || p.formsCategoryId,
        });
      } else {
        const cat = categoryById.get(p.formsCategoryId);
        if (cat) {
          const poolKey = buildCategoryPoolName(cat.division, cat.name, p.formsPool);
          if (!mappedPoolKeys.has(poolKey)) {
            unmapped.poolNoPhysicalRing++;
            const existing = unmappedPoolMap.get(poolKey);
            if (existing) existing.participants.push(participantName(p));
            else unmappedPoolMap.set(poolKey, { poolName: poolKey, type: 'forms', participants: [participantName(p)] });
          }
        }
      }
    }
    if (competingSparring) {
      if (!p.sparringCategoryId) {
        unmapped.sparringNoCategory++;
        problemDetails.missingCategory.push({
          participant: participantName(p),
          type: 'sparring',
          detail: p.sparringDivision || 'no division',
        });
      } else if (!p.sparringPool) {
        unmapped.categoryNoPool++;
        problemDetails.categoryNoPool.push({
          participant: participantName(p),
          type: 'sparring',
          detail: categoryById.get(p.sparringCategoryId)?.name || p.sparringCategoryId,
        });
      } else {
        const cat = categoryById.get(p.sparringCategoryId);
        if (cat) {
          const poolKey = buildCategoryPoolName(cat.division, cat.name, p.sparringPool);
          if (!mappedPoolKeys.has(poolKey)) {
            unmapped.poolNoPhysicalRing++;
            const existing = unmappedPoolMap.get(poolKey);
            if (existing) existing.participants.push(participantName(p));
            else unmappedPoolMap.set(poolKey, { poolName: poolKey, type: 'sparring', participants: [participantName(p)] });
          }
        }
      }
    }

    if (!competingForms && !competingSparring) {
      unmapped.notCompeting++;
      problemDetails.notInDivision.push({
        participant: participantName(p),
        reason: 'Not competing in Forms or Sparring',
        detail: '',
      });
      return;
    }

    let placed = false;
    if (competingForms) {
      formsCompeting++;
      const stat = p.formsDivision ? known.get(p.formsDivision) : undefined;
      if (stat) {
        stat.forms++;
        stat.ids.add(p.id);
        placed = true;
      }
    }
    if (competingSparring) {
      sparringCompeting++;
      const stat = p.sparringDivision ? known.get(p.sparringDivision) : undefined;
      if (stat) {
        stat.sparring++;
        stat.ids.add(p.id);
        placed = true;
      }
    }

    if (placed) {
      inAnyDivision++;
    } else if (p.formsDivision || p.sparringDivision) {
      unmapped.unknownDivision++;
      problemDetails.notInDivision.push({
        participant: participantName(p),
        reason: 'Competing in an unknown division',
        detail: p.formsDivision || p.sparringDivision || '',
      });
    } else {
      unmapped.noDivision++;
      problemDetails.notInDivision.push({
        participant: participantName(p),
        reason: 'Competing but no division',
        detail: '',
      });
    }
  });

  // Duplicate first+last name detection.
  const nameCounts = new Map<string, number>();
  participants.forEach((p) => {
    const key = `${(p.firstName ?? '').trim()} ${(p.lastName ?? '').trim()}`.trim();
    if (key) nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  });
  unmapped.duplicateNames = Array.from(nameCounts.values()).filter((count) => count > 1).length;

  problemDetails.unmappedPools = Array.from(unmappedPoolMap.values()).sort((a, b) =>
    a.poolName.localeCompare(b.poolName, undefined, { numeric: true })
  );
  problemDetails.notInDivision.sort((a, b) =>
    a.reason === b.reason ? a.participant.localeCompare(b.participant) : a.reason.localeCompare(b.reason)
  );

  // Physical rings actually referenced by ring mappings.
  const ringMap = new Map<string, string[]>();
  physicalRingMappings.forEach((m) => {
    if (!ringMap.has(m.physicalRingName)) ringMap.set(m.physicalRingName, []);
    ringMap.get(m.physicalRingName)!.push(m.categoryPoolName);
  });
  const physicalRings: PhysicalRingUsage[] = Array.from(ringMap.entries())
    .map(([name, pools]) => ({ name, pools }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return {
    divisions: sortedDivisions.map((d) => {
      const stat = known.get(d.name)!;
      return { name: stat.name, total: stat.ids.size, forms: stat.forms, sparring: stat.sparring };
    }),
    totals: {
      participants: participants.length,
      inAnyDivision,
      formsCompeting,
      sparringCompeting,
    },
    unmappedTotal: participants.length - inAnyDivision,
    unmapped,
    configIssues: computeConfigIssues(sortedDivisions, categories, participants, physicalRingMappings),
    physicalRings,
    problemDetails,
  };
}
