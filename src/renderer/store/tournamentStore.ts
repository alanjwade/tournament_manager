import { create } from 'zustand';
import { Participant, Category, TournamentConfig, Division, PhysicalRing, PhysicalRingMapping, CategoryPoolMapping, TournamentState as SavedState, StateDiff, CustomRing } from '../types/tournament';
import { debounce } from '../utils/debounce';
import { AUTOSAVE_DELAY_MS } from '../utils/constants';
import { logger } from '../utils/logger';
import { reorderAllRings } from '../utils/ringOrdering';
import { computeStateDiff } from '../utils/stateDiff';
import type { CommitSummary, HistoryTag, OperationHint } from '../../shared/history';

/** Fields whose changes should trigger automatic ring re-ordering. */
const ASSIGNMENT_FIELDS: (keyof Participant)[] = [
  'formsCategoryId', 'formsPool', 'competingForms',
  'sparringCategoryId', 'sparringPool', 'competingSparring', 'sparringAltRing',
  'withdrawn',
];

/** Returns true if any participant has a changed ring-assignment field, or a new/removed participant carries ring assignments. */
function hasAssignmentChanges(oldList: Participant[], newList: Participant[]): boolean {
  const oldMap = new Map(oldList.map(p => [p.id, p]));
  const newMap = new Map(newList.map(p => [p.id, p]));

  // New participants with an assignment
  for (const np of newList) {
    if (!oldMap.has(np.id)) {
      if (np.formsCategoryId || np.sparringCategoryId) return true;
    }
  }

  // Removed participants that had an assignment
  for (const op of oldList) {
    if (!newMap.has(op.id)) {
      if (op.formsCategoryId || op.sparringCategoryId) return true;
    }
  }

  // Existing participants with changed assignment fields
  for (const np of newList) {
    const op = oldMap.get(np.id);
    if (op && ASSIGNMENT_FIELDS.some(f => (op as any)[f] !== (np as any)[f])) return true;
  }

  return false;
}

/**
 * True when a logical ring id belongs to `categoryId`. Ring ids look like
 * `forms-<categoryId>-P1` / `sparring-<categoryId>-P1`. Category ids themselves
 * contain hyphens (`forms-<division>-<gender>-<min-max>`), so we must match on
 * the exact prefix rather than naively splitting on '-' and hoping the division
 * has no hyphens.
 */
export function ringIdReferencesCategory(ringId: string, categoryId: string): boolean {
  return ringId.startsWith(`forms-${categoryId}-`) || ringId.startsWith(`sparring-${categoryId}-`);
}

/**
 * Migrate a participant from legacy/imported shapes to the current model
 * (turns "not participating" into null, expands "same as forms/sparring",
 * and normalises the sparringAltRing field).
 */
function normalizeParticipant(p: Participant): Participant {
  const normalized: any = { ...p, sparringAltRing: (p as any).sparringAltRing || '' };

  if (normalized.formsDivision === 'not participating') {
    normalized.formsDivision = null;
    normalized.competingForms = false;
  }
  if (normalized.sparringDivision === 'not participating') {
    normalized.sparringDivision = null;
    normalized.competingSparring = false;
  }

  if (normalized.sparringDivision === 'same as forms') {
    normalized.sparringDivision = normalized.formsDivision;
    normalized.sparringCategoryId = normalized.sparringCategoryId || normalized.formsCategoryId;
    normalized.sparringPool = normalized.sparringPool || normalized.formsPool;
    normalized.competingSparring = normalized.competingForms;
  }

  if (normalized.formsDivision === 'same as sparring') {
    normalized.formsDivision = normalized.sparringDivision;
    normalized.formsCategoryId = normalized.formsCategoryId || normalized.sparringCategoryId;
    normalized.formsPool = normalized.formsPool || normalized.sparringPool;
    normalized.competingForms = normalized.competingSparring;
  }

  return normalized as Participant;
}

function normalizeParticipants(participants: Participant[]): Participant[] {
  return participants.map(normalizeParticipant);
}

type Snapshot = {
  participants: Participant[];
  categories: Category[];
  config: TournamentConfig;
  physicalRingMappings: PhysicalRingMapping[];
  categoryPoolMappings: CategoryPoolMapping[];
  customRings: CustomRing[];
  customOrderRings: string[];
};

const MAX_HISTORY = 20;

interface TournamentState {
  participants: Participant[];
  categories: Category[];
  config: TournamentConfig;
  physicalRingMappings: PhysicalRingMapping[]; // Legacy
  categoryPoolMappings: CategoryPoolMapping[]; // New mapping system
  history: CommitSummary[]; // Git-like commit history (newest last)
  historyTags: HistoryTag[]; // Named pointers into the history (checkpoints)
  historyHeadId: string | null;
  /** Commit chosen as the diff baseline (its full state is cached below). */
  baselineCommitId: string | null;
  baselineState: SavedState | null;
  customRings: CustomRing[]; // Grand Champion / Side rings
  customOrderRings: string[]; // Ring IDs with custom (manual) ordering enabled
  highlightedParticipantId: string | null; // For cross-component highlighting
  openQuickEditParticipantId: string | null; // For opening quick-edit modal from global search
  undoStack: Snapshot[];
  redoStack: Snapshot[];

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  
  // Actions
  setParticipants: (participants: Participant[]) => void;
  updateParticipant: (id: string, updates: Partial<Participant>) => void;
  batchUpdateParticipants: (updates: Array<{ id: string; updates: Partial<Participant> }>) => void;
  withdrawParticipant: (id: string) => void;
  deleteParticipant: (id: string) => void;
  setCategories: (categories: Category[]) => void;
  /** Replace the whole roster from an import and clear any stale category-derived state. */
  importParticipants: (participants: Participant[]) => void;
  /** Remove one or more categories and clear every participant/mapping reference to them. */
  removeCategories: (categoryIds: string[]) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  setPhysicalRingMappings: (mappings: PhysicalRingMapping[]) => void;
  updatePhysicalRingMapping: (categoryPoolName: string, physicalRingName: string) => void;
  updateConfig: (config: Partial<TournamentConfig>) => void;
  setDivisions: (divisions: Division[]) => void;
  setPhysicalRings: (rings: PhysicalRing[]) => void;
  setWatermark: (image: string) => void;
  setSchoolAbbreviations: (abbreviations: { [schoolName: string]: string }) => void;
  saveState: () => Promise<void>;
  loadState: () => Promise<void>;
  loadStateFromData: (data: SavedState) => void;
  hydrateFromAutosave: (data: SavedState) => void;
  autoSave: (hint?: OperationHint) => void;
  /** Commit immediately (bypassing the debounce) with an optional operation hint. */
  commitNow: (hint?: OperationHint) => void;

  // History (git-like commit journal)
  loadHistory: () => Promise<void>;
  restoreCommit: (commitId: string) => Promise<boolean>;
  createHistoryTag: (name: string, commitId?: string) => Promise<void>;
  deleteHistoryTag: (tagId: string) => Promise<void>;
  /** Select (or clear) the commit used as the diff baseline; fetches its state. */
  setBaseline: (commitId: string | null) => Promise<void>;
  /**
   * Flush pending edits, refresh history, tag the newest commit, and select it as
   * the diff baseline. Returns the head commit id that was baselined (or null).
   */
  createBaseline: (name: string) => Promise<string | null>;
  /** Diff the current state against the selected baseline. */
  diffBaseline: () => StateDiff | null;
  reset: () => void;
  
  // Custom Ring actions
  addCustomRing: (name: string, type: 'forms' | 'sparring') => CustomRing;
  deleteCustomRing: (id: string) => void;
  updateCustomRing: (id: string, updates: Partial<CustomRing>) => void;
  addParticipantToCustomRing: (ringId: string, participantId: string) => void;
  removeParticipantFromCustomRing: (ringId: string, participantId: string) => void;
  moveParticipantInCustomRing: (ringId: string, participantId: string, direction: 'up' | 'down') => void;
  toggleCustomOrderRing: (ringId: string) => void;
  setHighlightedParticipantId: (id: string | null) => void;
  setOpenQuickEditParticipantId: (id: string | null) => void;
}

const initialConfig: TournamentConfig = {
  divisions: [
    { name: 'Black Belt', order: 1, abbreviation: 'BLKB' },
    { name: 'Beginner', order: 2, abbreviation: 'BGNR' },
    { name: 'Level 1', order: 3, abbreviation: 'LVL1' },
    { name: 'Level 2', order: 4, abbreviation: 'LVL2' },
    { name: 'Level 3', order: 5, abbreviation: 'LVL3' },
  ],
  physicalRings: [],
  watermarkImage: undefined,
  schoolAbbreviations: {
    // Branch-based abbreviations (exact matches from GAS code)
    'Longmont': 'REMA LM',
    'Broomfield': 'REMA BF',
    'Fort Collins': 'REMA FC',
    'Johnstown': 'REMA JT',
    'Littleton': 'EMA LT',
    'Lakewood': 'EMA LW',
    'Personal Achievement': 'PAMA',
    'Success': 'SMA',
    // Variations with hyphens
    'exclusive-littleton': 'EMA LT',
    'exclusive-lakewood': 'EMA LW',
    'personal-achievement': 'PAMA',
    'ripple-effect-longmont': 'REMA LM',
    'ripple-effect-broomfield': 'REMA BF',
    'ripple-effect-ft-collins': 'REMA FC',
    'ripple-effect-johnstown': 'REMA JT',
    'success': 'SMA',
    // Full name variations
    'Exclusive Martial Arts - Littleton': 'EMA LT',
    'Exclusive Martial Arts - Lakewood': 'EMA LW',
    'Exclusive Littleton': 'EMA LT',
    'Exclusive Lakewood': 'EMA LW',
    'Personal Achievement Martial Arts': 'PAMA',
    'Ripple Effect Martial Arts - Longmont': 'REMA LM',
    'Ripple Effect Martial Arts - Broomfield': 'REMA BF',
    'Ripple Effect Martial Arts - Fort Collins': 'REMA FC',
    'Ripple Effect Martial Arts - Johnstown': 'REMA JT',
    'Success Martial Arts': 'SMA',
  },
};

/**
 * Older datasets stored a single `division` name plus `competesInForms` /
 * `competesInSparring` booleans. The current model uses per-event
 * `formsDivision`/`sparringDivision` with `competingForms`/`competingSparring`.
 *
 * Normalize the legacy shape in place so every consumer (Categories, Ring Map,
 * exports, …) sees the current fields. Without this, legacy participants look
 * like they belong to no division and are filtered out everywhere.
 */
function migrateLegacyParticipant(p: Participant): Participant {
  const legacy = p as Participant & {
    division?: string | null;
    competesInForms?: boolean;
    competesInSparring?: boolean;
  };

  const legacyDivision = legacy.division ?? null;
  const competingForms = legacy.competingForms ?? legacy.competesInForms ?? false;
  const competingSparring = legacy.competingSparring ?? legacy.competesInSparring ?? false;

  const migrated: Participant = {
    ...p,
    // Only derive from the legacy fields when the new fields are absent, so a
    // participant that already uses the current schema is left untouched.
    formsDivision:
      legacy.formsDivision !== undefined
        ? legacy.formsDivision
        : competingForms ? legacyDivision : null,
    sparringDivision:
      legacy.sparringDivision !== undefined
        ? legacy.sparringDivision
        : competingSparring ? legacyDivision : null,
    competingForms,
    competingSparring,
    sparringAltRing: p.sparringAltRing || '',
  };

  // Drop the legacy keys so they don't linger in persisted state.
  delete (migrated as any).division;
  delete (migrated as any).competesInForms;
  delete (migrated as any).competesInSparring;

  return migrated;
}

/**
 * Normalize a persisted tournament state into the slices stored by the app.
 *
 * Shared by autosave hydration, file load and checkpoint restore so every entry
 * point applies the same repairs:
 *  - divisions keep their default abbreviations
 *  - legacy "PR1" physical-ring names are migrated to "Ring 1"
 *  - legacy per-participant division/competing fields are migrated
 *  - participant references to categories that no longer exist are cleared
 *  - custom rings AND customOrderRings are always carried over (never dropped)
 *
 * The input is deep-cloned so the store never aliases a checkpoint's saved state.
 */
function buildHydratedState(savedState: SavedState): Snapshot {
  const state = structuredClone(savedState);

  const mergedDivisions = (state.config?.divisions || []).map((savedDiv) => {
    const defaultDiv = initialConfig.divisions.find(d => d.name === savedDiv.name);
    return {
      ...savedDiv,
      abbreviation: savedDiv.abbreviation || defaultDiv?.abbreviation,
    };
  });

  const migratedPhysicalRingMappings = (state.physicalRingMappings || []).map(m => {
    const physicalRingName = m.physicalRingName;
    if (physicalRingName.match(/^PR\d/i)) {
      return { ...m, physicalRingName: physicalRingName.replace(/^PR(\d+)([a-z])?$/i, 'Ring $1$2') };
    }
    return m;
  });

  const categories = (state.categories || []).map(c => ({
    ...c,
    // Legacy saves may omit `type`; default it to 'forms' (the historical model)
    // so no consumer ever has to guess what a missing type means.
    type: c.type ?? 'forms',
  }));
  const validCategoryIds = new Set(categories.map(c => c.id));
  let orphanCount = 0;
  const participants = (state.participants || []).map(p => {
    const cleaned = migrateLegacyParticipant(p);
    if (cleaned.formsCategoryId && !validCategoryIds.has(cleaned.formsCategoryId)) {
      logger.warn(`Cleaning orphaned formsCategoryId "${cleaned.formsCategoryId}" from ${p.firstName} ${p.lastName}`);
      cleaned.formsCategoryId = undefined;
      orphanCount++;
    }
    if (cleaned.sparringCategoryId && !validCategoryIds.has(cleaned.sparringCategoryId)) {
      logger.warn(`Cleaning orphaned sparringCategoryId "${cleaned.sparringCategoryId}" from ${p.firstName} ${p.lastName}`);
      cleaned.sparringCategoryId = undefined;
      orphanCount++;
    }
    return cleaned;
  });
  if (orphanCount > 0) {
    logger.info(`Cleaned up ${orphanCount} orphaned category references`);
  }

  return {
    participants,
    categories,
    config: {
      ...initialConfig,
      ...(state.config || {}),
      divisions: mergedDivisions,
    },
    physicalRingMappings: migratedPhysicalRingMappings,
    categoryPoolMappings: state.categoryPoolMappings || [],
    customRings: state.customRings || [],
    customOrderRings: state.customOrderRings || [],
  };
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  participants: [],
  categories: [],
  config: initialConfig,
  physicalRingMappings: [],
  categoryPoolMappings: [],
  undoStack: [],
  redoStack: [],
  customRings: [
    {
      id: 'grand-champion-forms-1',
      name: 'Black Belt Grand Champion Ring 1',
      type: 'forms',
      participantIds: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'grand-champion-forms-2',
      name: 'Black Belt Grand Champion Ring 2',
      type: 'forms',
      participantIds: [],
      createdAt: new Date().toISOString(),
    },
  ],
  customOrderRings: [],
  highlightedParticipantId: null,
  openQuickEditParticipantId: null,
  history: [],
  historyTags: [],
  historyHeadId: null,
  baselineCommitId: null,
  baselineState: null,

  pushHistory: () => {
    const s = get();
    const snapshot: Snapshot = {
      participants: structuredClone(s.participants),
      categories: structuredClone(s.categories),
      config: structuredClone(s.config),
      physicalRingMappings: structuredClone(s.physicalRingMappings),
      categoryPoolMappings: structuredClone(s.categoryPoolMappings),
      customRings: structuredClone(s.customRings),
      customOrderRings: [...s.customOrderRings],
    };
    set((state) => ({
      undoStack: [...state.undoStack.slice(-(MAX_HISTORY - 1)), snapshot],
      redoStack: [],
    }));
  },

  undo: () => {
    const s = get();
    if (s.undoStack.length === 0) return;
    const snapshot = s.undoStack[s.undoStack.length - 1];
    const current: Snapshot = {
      participants: structuredClone(s.participants),
      categories: structuredClone(s.categories),
      config: structuredClone(s.config),
      physicalRingMappings: structuredClone(s.physicalRingMappings),
      categoryPoolMappings: structuredClone(s.categoryPoolMappings),
      customRings: structuredClone(s.customRings),
      customOrderRings: [...s.customOrderRings],
    };
    set({
      ...structuredClone(snapshot),
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, current],
    });
    // Journal the resulting transition so an undo is durable and recoverable
    // from the persisted history, exactly like a forward edit.
    get().commitNow({ kind: 'undo', description: 'Undid last change' });
  },

  redo: () => {
    const s = get();
    if (s.redoStack.length === 0) return;
    const snapshot = s.redoStack[s.redoStack.length - 1];
    const current: Snapshot = {
      participants: structuredClone(s.participants),
      categories: structuredClone(s.categories),
      config: structuredClone(s.config),
      physicalRingMappings: structuredClone(s.physicalRingMappings),
      categoryPoolMappings: structuredClone(s.categoryPoolMappings),
      customRings: structuredClone(s.customRings),
      customOrderRings: [...s.customOrderRings],
    };
    set({
      ...structuredClone(snapshot),
      undoStack: [...s.undoStack, current],
      redoStack: s.redoStack.slice(0, -1),
    });
    // Journal the resulting transition so a redo is durable and recoverable
    // from the persisted history, exactly like a forward edit.
    get().commitNow({ kind: 'redo', description: 'Redid last change' });
  },

  setParticipants: (participants) => {
    // Normalize participant objects - migrate from old model to new
    const normalized = normalizeParticipants(participants);
    const oldParticipants = get().participants;
    get().pushHistory();
    const shouldReorder = hasAssignmentChanges(oldParticipants, normalized);
    const finalParticipants = shouldReorder
      ? reorderAllRings(normalized, get().categories, get().categoryPoolMappings, new Set(get().customOrderRings))
      : normalized;
    set({ participants: finalParticipants });
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },
  
  updateParticipant: (id, updates) => {
    const shouldReorder = ASSIGNMENT_FIELDS.some(f => f in updates);
    get().pushHistory();
    if (shouldReorder) {
      const newParticipants = get().participants.map(p => p.id === id ? { ...p, ...updates } : p);
      const { categories, categoryPoolMappings, customOrderRings } = get();
      set({ participants: reorderAllRings(newParticipants, categories, categoryPoolMappings, new Set(customOrderRings)) });
    } else {
      set((state) => ({
        participants: state.participants.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      }));
    }
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  batchUpdateParticipants: (updates) => {
    const shouldReorder = updates.some(u => ASSIGNMENT_FIELDS.some(f => f in u.updates));
    get().pushHistory();
    if (shouldReorder) {
      const updateMap = new Map(updates.map(u => [u.id, u.updates]));
      const newParticipants = get().participants.map(p => {
        const upd = updateMap.get(p.id);
        return upd ? { ...p, ...upd } : p;
      });
      const { categories, categoryPoolMappings, customOrderRings } = get();
      set({ participants: reorderAllRings(newParticipants, categories, categoryPoolMappings, new Set(customOrderRings)) });
    } else {
      set((state) => {
        const updateMap = new Map(updates.map(u => [u.id, u.updates]));
        return {
          participants: state.participants.map((p) => {
            const upd = updateMap.get(p.id);
            return upd ? { ...p, ...upd } : p;
          }),
        };
      });
    }
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  withdrawParticipant: (id) => {
    get().pushHistory();
    const target = get().participants.find((p) => p.id === id);
    const withdrawnParticipants = get().participants.map((p) =>
      p.id === id
        ? {
            ...p,
            withdrawn: true,
            // Clear rank orders to avoid stale positions when un-withdrawn
            formsRankOrder: undefined,
            sparringRankOrder: undefined,
          }
        : p
    );
    const { categories, categoryPoolMappings, customOrderRings } = get();
    // Reorder remaining participants so pool adjacency is recalculated
    set({ participants: reorderAllRings(withdrawnParticipants, categories, categoryPoolMappings, new Set(customOrderRings)) });
    get().commitNow(
      target
        ? { kind: 'participant.withdraw', description: `Withdrew ${target.firstName} ${target.lastName}` }
        : undefined
    );
  },

  deleteParticipant: (id) => {
    get().pushHistory();
    const target = get().participants.find((p) => p.id === id);
    const remaining = get().participants.filter((p) => p.id !== id);
    const { categories, categoryPoolMappings, customOrderRings, customRings } = get();
    // Reorder the survivors so pool adjacency is recalculated, and drop any
    // orphaned references from Grand Champion / side rings.
    set({
      participants: reorderAllRings(remaining, categories, categoryPoolMappings, new Set(customOrderRings)),
      customRings: customRings.map((ring) =>
        ring.participantIds.includes(id)
          ? { ...ring, participantIds: ring.participantIds.filter((pid) => pid !== id) }
          : ring
      ),
    });
    get().commitNow(
      target
        ? { kind: 'participant.remove', description: `Removed ${target.firstName} ${target.lastName}` }
        : undefined
    );
  },

  setCategories: (categories) => {
    get().pushHistory();
    // Prune customOrderRings: remove IDs referencing categories that no longer exist
    const prunedCustomOrderRings = get().customOrderRings.filter(ringId =>
      categories.some(c => ringIdReferencesCategory(ringId, c.id))
    );
    set({
      categories: categories.map(c => ({ ...c, type: c.type ?? 'forms' })),
      customOrderRings: prunedCustomOrderRings,
    });
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  importParticipants: (participants) => {
    get().pushHistory();
    // Normalize the incoming roster and strip any category/pool/rank references.
    // The freshly imported records normally have none, but old exports or a
    // re-imported working file may carry stale ids from the previous categories.
    const normalized = normalizeParticipants(participants).map((p) => ({
      ...p,
      formsCategoryId: undefined,
      formsPool: undefined,
      formsRankOrder: undefined,
      sparringCategoryId: undefined,
      sparringPool: undefined,
      sparringRankOrder: undefined,
      sparringAltRing: '' as const,
    }));
    set({
      participants: normalized,
      // A brand-new roster invalidates every category (and anything derived from
      // it — pool-to-ring maps, manual ring ordering): start from a clean slate.
      categories: [],
      categoryPoolMappings: [],
      physicalRingMappings: [],
      customOrderRings: [],
    });
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  removeCategories: (categoryIds) => {
    if (categoryIds.length === 0) return;
    const idSet = new Set(categoryIds);
    get().pushHistory();

    const { participants, categories, categoryPoolMappings, customOrderRings } = get();

    // Clear category/pool/rank references on any participant that pointed at a
    // removed category, otherwise they keep a stale pool assignment that no
    // longer corresponds to a real ring.
    const cleanedParticipants = participants.map((p) => {
      let updated = p;
      if (p.formsCategoryId && idSet.has(p.formsCategoryId)) {
        updated = {
          ...updated,
          formsCategoryId: undefined,
          formsPool: undefined,
          formsRankOrder: undefined,
        };
      }
      if (p.sparringCategoryId && idSet.has(p.sparringCategoryId)) {
        updated = {
          ...updated,
          sparringCategoryId: undefined,
          sparringPool: undefined,
          sparringRankOrder: undefined,
          sparringAltRing: '',
        };
      }
      return updated;
    });

    set({
      categories: categories.filter(c => !idSet.has(c.id)),
      participants: cleanedParticipants,
      categoryPoolMappings: categoryPoolMappings.filter(m => !idSet.has(m.categoryId)),
      customOrderRings: customOrderRings.filter(
        ringId => !categoryIds.some(id => ringIdReferencesCategory(ringId, id))
      ),
    });
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },
  
  updateCategory: (id, updates) => {
    get().pushHistory();
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  setPhysicalRingMappings: (mappings) => {
    // Migrate from old "PR1", "PR1a" format to new "Ring 1", "Ring 1a" format
    const migratedMappings = mappings.map(m => {
      const physicalRingName = m.physicalRingName;
      // Check if it starts with "PR" (old format)
      if (physicalRingName.match(/^PR\d/i)) {
        // Convert "PR1" to "Ring 1", "PR1a" to "Ring 1a", etc.
        const converted = physicalRingName.replace(/^PR(\d+)([a-z])?$/i, 'Ring $1$2');
        return { ...m, physicalRingName: converted };
      }
      return m;
    });
    get().pushHistory();
    set({ physicalRingMappings: migratedMappings });
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  updatePhysicalRingMapping: (categoryPoolName, physicalRingName) => {
    // Migrate from old "PR1" format to new "Ring 1" format
    let migratedRingName = physicalRingName;
    if (physicalRingName.match(/^PR\d/i)) {
      // Convert "PR1" to "Ring 1", "PR1a" to "Ring 1a", etc.
      migratedRingName = physicalRingName.replace(/^PR(\d+)([a-z])?$/i, 'Ring $1$2');
    }
    get().pushHistory();
    set((state) => {
      const existing = state.physicalRingMappings.find(m => m.categoryPoolName === categoryPoolName);
      if (existing) {
        return {
          physicalRingMappings: state.physicalRingMappings.map(m =>
            m.categoryPoolName === categoryPoolName ? { ...m, physicalRingName: migratedRingName, categoryPoolName } : m
          ),
        };
      } else {
        return {
          physicalRingMappings: [...state.physicalRingMappings, { categoryPoolName, physicalRingName: migratedRingName }],
        };
      }
    });
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  updateConfig: (configUpdates) => {
    get().pushHistory();
    set((state) => ({
      config: { ...state.config, ...configUpdates },
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  setDivisions: (divisions) => {
    get().pushHistory();
    set((state) => ({
      config: { ...state.config, divisions },
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  setPhysicalRings: (rings) => {
    get().pushHistory();
    set((state) => ({
      config: { ...state.config, physicalRings: rings },
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  setWatermark: (image) => {
    get().pushHistory();
    set((state) => ({
      config: { ...state.config, watermarkImage: image },
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  setSchoolAbbreviations: (abbreviations) => {
    get().pushHistory();
    set((state) => ({
      config: { ...state.config, schoolAbbreviations: abbreviations },
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  saveState: async () => {
    const state = useTournamentStore.getState();
    const tournamentState: SavedState = {
      participants: state.participants,
      categories: state.categories,
      config: state.config,
      physicalRingMappings: state.physicalRingMappings,
      categoryPoolMappings: state.categoryPoolMappings,
      customRings: state.customRings,
      customOrderRings: state.customOrderRings,
      lastSaved: new Date().toISOString(),
    };
    const result = await window.electronAPI.saveTournamentState(tournamentState);
    if (result.success) {
      alert(`Tournament state saved to ${result.path}`);
    } else {
      alert('Failed to save tournament state');
    }
  },

  loadState: async () => {
    const result = await window.electronAPI.loadTournamentState();
    if (result && result.success && result.data) {
      const state = result.data as SavedState;
      get().loadStateFromData(state);
      alert('Tournament state loaded successfully!');
    } else if (result && !result.success) {
      alert('Failed to load tournament state');
    }
  },

  loadStateFromData: (state) => {
    set({ ...buildHydratedState(state), undoStack: [], redoStack: [] });
  },

  hydrateFromAutosave: (state) => {
    // Restores every persisted slice (including customOrderRings) and repairs
    // stale references in one place - see buildHydratedState.
    set({ ...buildHydratedState(state), undoStack: [], redoStack: [] });
    // Establish a durable baseline for the restored session. `commit` drops an
    // empty delta, so a clean restart stays silent while normalized/repaired
    // state is captured as the starting point of the journal.
    get().commitNow({ kind: 'snapshot', description: 'Restored previous session' });
  },

  autoSave: async (hint?: OperationHint) => {
    const state = useTournamentStore.getState();
    const tournamentState: SavedState = {
      participants: state.participants,
      categories: state.categories,
      config: state.config,
      physicalRingMappings: state.physicalRingMappings,
      categoryPoolMappings: state.categoryPoolMappings,
      customRings: state.customRings,
      customOrderRings: state.customOrderRings,
      lastSaved: new Date().toISOString(),
    };
    logger.debug('Saving autosave - participants count:', state.participants.length);

    try {
      const result = await window.electronAPI.saveAutosave(JSON.stringify(tournamentState), hint);
      logger.debug('Autosave result:', result.success ? 'success' : result.error);
    } catch (error) {
      logger.error('Failed to save autosave:', error);
    }
  },

  commitNow: (hint?: OperationHint) => {
    // Bypass the debounce so deliberate actions land as their own commit.
    useTournamentStore.getState().autoSave(hint);
  },

  loadHistory: async () => {
    try {
      const log = await window.electronAPI.historyLog();
      const tags = await window.electronAPI.historyTags();
      set({
        history: log.success ? log.data ?? [] : [],
        historyHeadId: log.headId ?? null,
        historyTags: tags.success ? tags.data ?? [] : [],
      });
    } catch (error) {
      logger.error('Failed to load history:', error);
    }
  },

  restoreCommit: async (commitId) => {
    try {
      const result = await window.electronAPI.historyCheckout(commitId);
      if (result.success && result.data) {
        // The main process already wrote the head file and appended a restore
        // commit; just sync the in-memory store to match.
        get().loadStateFromData(result.data as SavedState);
        await get().loadHistory();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to restore commit:', error);
      return false;
    }
  },

  createHistoryTag: async (name, commitId) => {
    const target = commitId ?? get().historyHeadId;
    if (!target) return;
    try {
      await window.electronAPI.historyAddTag(name, target);
      await get().loadHistory();
    } catch (error) {
      logger.error('Failed to create history tag:', error);
    }
  },

  deleteHistoryTag: async (tagId) => {
    try {
      await window.electronAPI.historyRemoveTag(tagId);
      await get().loadHistory();
    } catch (error) {
      logger.error('Failed to delete history tag:', error);
    }
  },

  reset: () =>
    set({
      participants: [],
      categories: [],
      config: initialConfig,
      customRings: [],
      customOrderRings: [],
      physicalRingMappings: [],
      categoryPoolMappings: [],
      undoStack: [],
      redoStack: [],
      history: [],
      historyTags: [],
      historyHeadId: null,
      baselineCommitId: null,
      baselineState: null,
    }),


  // Custom Ring actions
  // Baseline — diff the current data against a chosen history commit
  setBaseline: async (commitId: string | null) => {
    if (!commitId) {
      set({ baselineCommitId: null, baselineState: null });
      return;
    }
    try {
      const result = await window.electronAPI.historyShow(commitId);
      if (result.success && result.data) {
        set({ baselineCommitId: commitId, baselineState: result.data as SavedState });
      }
    } catch (error) {
      logger.error('Failed to load baseline commit:', error);
    }
  },

  createBaseline: async (name: string) => {
    // Flush any pending (debounced) edit so the newest state is committed first.
    // Without this the head can still point at the pre-edit commit, which would
    // leave the "changed ring" indicators showing until a second click.
    await get().autoSave();
    // Refresh history so `historyHeadId` points at the newest commit.
    await get().loadHistory();
    // Tag that same fresh head, then use it as the diff baseline.
    await get().createHistoryTag(name);
    const headId = get().historyHeadId;
    if (headId) await get().setBaseline(headId);
    return headId;
  },

  diffBaseline: (): StateDiff | null => {
    const state = get();
    if (!state.baselineState) return null;
    const current: SavedState = {
      participants: state.participants,
      categories: state.categories,
      config: state.config,
      physicalRingMappings: state.physicalRingMappings,
      categoryPoolMappings: state.categoryPoolMappings,
      customRings: state.customRings,
      customOrderRings: state.customOrderRings,
    };
    return computeStateDiff(state.baselineState, current);
  },


  addCustomRing: (name: string, type: 'forms' | 'sparring') => {
    const newRing: CustomRing = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      participantIds: [],
      createdAt: new Date().toISOString(),
    };
    get().pushHistory();
    set((state) => ({
      customRings: [...state.customRings, newRing],
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
    return newRing;
  },

  deleteCustomRing: (id: string) => {
    get().pushHistory();
    set((state) => ({
      customRings: state.customRings.filter(r => r.id !== id),
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  updateCustomRing: (id: string, updates: Partial<CustomRing>) => {
    get().pushHistory();
    set((state) => ({
      customRings: state.customRings.map(r =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  addParticipantToCustomRing: (ringId: string, participantId: string) => {
    get().pushHistory();
    set((state) => ({
      customRings: state.customRings.map(r =>
        r.id === ringId && !r.participantIds.includes(participantId)
          ? { ...r, participantIds: [...r.participantIds, participantId] }
          : r
      ),
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  removeParticipantFromCustomRing: (ringId: string, participantId: string) => {
    get().pushHistory();
    set((state) => ({
      customRings: state.customRings.map(r =>
        r.id === ringId
          ? { ...r, participantIds: r.participantIds.filter(id => id !== participantId) }
          : r
      ),
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  moveParticipantInCustomRing: (ringId: string, participantId: string, direction: 'up' | 'down') => {
    get().pushHistory();
    set((state) => {
      const ring = state.customRings.find(r => r.id === ringId);
      if (!ring) return state;

      const currentIndex = ring.participantIds.indexOf(participantId);
      if (currentIndex === -1) return state;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= ring.participantIds.length) return state;

      const newParticipantIds = [...ring.participantIds];
      [newParticipantIds[currentIndex], newParticipantIds[newIndex]] = 
        [newParticipantIds[newIndex], newParticipantIds[currentIndex]];

      return {
        customRings: state.customRings.map(r =>
          r.id === ringId ? { ...r, participantIds: newParticipantIds } : r
        ),
      };
    });
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  toggleCustomOrderRing: (ringId: string) => {
    const { customOrderRings, participants, categories, categoryPoolMappings } = get();
    get().pushHistory();
    const isCurrentlyCustom = customOrderRings.includes(ringId);
    if (isCurrentlyCustom) {
      // Turning off custom order — re-enable auto ordering for this ring and trigger a reorder
      const newCustomOrderRings = customOrderRings.filter(id => id !== ringId);
      // Reorder all rings with updated skip set (this ring is no longer skipped)
      const reordered = reorderAllRings(participants, categories, categoryPoolMappings, new Set(newCustomOrderRings));
      set({ customOrderRings: newCustomOrderRings, participants: reordered });
    } else {
      // Turning on custom order — just add to skip set, no reorder needed
      set({ customOrderRings: [...customOrderRings, ringId] });
    }
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  setHighlightedParticipantId: (id: string | null) => {
    set({ highlightedParticipantId: id });
  },
  setOpenQuickEditParticipantId: (id: string | null) => {
    set({ openQuickEditParticipantId: id });
  },
}));

