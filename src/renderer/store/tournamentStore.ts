import { create } from 'zustand';
import { Participant, Category, CompetitionRing, TournamentConfig, Division, PhysicalRing, PhysicalRingMapping, CategoryPoolMapping, TournamentState as SavedState, Checkpoint, CheckpointDiff, ParticipantChange, CustomRing } from '../types/tournament';
import { debounce } from '../utils/debounce';
import { AUTOSAVE_DELAY_MS } from '../utils/constants';
import { logger } from '../utils/logger';

type Snapshot = {
  participants: Participant[];
  categories: Category[];
  config: TournamentConfig;
  physicalRingMappings: PhysicalRingMapping[];
  categoryPoolMappings: CategoryPoolMapping[];
  customRings: CustomRing[];
};

const MAX_HISTORY = 20;

interface TournamentState {
  participants: Participant[];
  categories: Category[];
  config: TournamentConfig;
  physicalRingMappings: PhysicalRingMapping[]; // Legacy
  categoryPoolMappings: CategoryPoolMapping[]; // New mapping system
  checkpoints: Checkpoint[]; // Checkpoint system
  customRings: CustomRing[]; // Grand Champion / Side rings
  highlightedParticipantId: string | null; // For cross-component highlighting
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
  setCategories: (categories: Category[]) => void;
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
  autoSave: () => void;
  reset: () => void;
  
  // Checkpoint actions
  createCheckpoint: (name?: string) => Promise<Checkpoint>;
  renameCheckpoint: (checkpointId: string, newName: string) => void;
  deleteCheckpoint: (checkpointId: string) => void;
  diffCheckpoint: (checkpointId: string) => CheckpointDiff | null;
  loadCheckpoint: (checkpointId: string) => void;
  
  // Custom Ring actions
  addCustomRing: (name: string, type: 'forms' | 'sparring') => CustomRing;
  deleteCustomRing: (id: string) => void;
  updateCustomRing: (id: string, updates: Partial<CustomRing>) => void;
  addParticipantToCustomRing: (ringId: string, participantId: string) => void;
  removeParticipantFromCustomRing: (ringId: string, participantId: string) => void;
  moveParticipantInCustomRing: (ringId: string, participantId: string, direction: 'up' | 'down') => void;
  setHighlightedParticipantId: (id: string | null) => void;
}

const initialConfig: TournamentConfig = {
  divisions: [
    { name: 'Black Belt', order: 1, numRings: 2, abbreviation: 'BLKB' },
    { name: 'Beginner', order: 2, numRings: 2, abbreviation: 'BGNR' },
    { name: 'Level 1', order: 3, numRings: 2, abbreviation: 'LVL1' },
    { name: 'Level 2', order: 4, numRings: 2, abbreviation: 'LVL2' },
    { name: 'Level 3', order: 5, numRings: 2, abbreviation: 'LVL3' },
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

export const useTournamentStore = create<TournamentState>((set, get) => ({
  participants: [],
  categories: [],
  config: initialConfig,
  physicalRingMappings: [],
  categoryPoolMappings: [],
  checkpoints: [],
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
  highlightedParticipantId: null,

  pushHistory: () => {
    const s = get();
    const snapshot: Snapshot = {
      participants: structuredClone(s.participants),
      categories: structuredClone(s.categories),
      config: structuredClone(s.config),
      physicalRingMappings: structuredClone(s.physicalRingMappings),
      categoryPoolMappings: structuredClone(s.categoryPoolMappings),
      customRings: structuredClone(s.customRings),
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
    };
    set({
      ...structuredClone(snapshot),
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, current],
    });
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
    };
    set({
      ...structuredClone(snapshot),
      undoStack: [...s.undoStack, current],
      redoStack: s.redoStack.slice(0, -1),
    });
  },

  setParticipants: (participants) => {
    // Normalize participant objects - migrate from old model to new
    const normalized = participants.map(p => {
      const normalized: any = { ...p, sparringAltRing: (p as any).sparringAltRing || '' };
      
      // Migrate "not participating" string to null
      if (normalized.formsDivision === 'not participating') {
        normalized.formsDivision = null;
        normalized.competingForms = false;
      }
      if (normalized.sparringDivision === 'not participating') {
        normalized.sparringDivision = null;
        normalized.competingSparring = false;
      }
      
      // Migrate "same as forms" - convert to explicit values
      if (normalized.sparringDivision === 'same as forms') {
        normalized.sparringDivision = normalized.formsDivision;
        normalized.sparringCategoryId = normalized.sparringCategoryId || normalized.formsCategoryId;
        normalized.sparringPool = normalized.sparringPool || normalized.formsPool;
        normalized.competingSparring = normalized.competingForms;
      }
      
      // Migrate "same as sparring" - convert to explicit values
      if (normalized.formsDivision === 'same as sparring') {
        normalized.formsDivision = normalized.sparringDivision;
        normalized.formsCategoryId = normalized.formsCategoryId || normalized.sparringCategoryId;
        normalized.formsPool = normalized.formsPool || normalized.sparringPool;
        normalized.competingForms = normalized.competingSparring;
      }
      
      return normalized as Participant;
    });
    get().pushHistory();
    set({ participants: normalized });
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },
  
  updateParticipant: (id, updates) => {
    get().pushHistory();
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  batchUpdateParticipants: (updates) => {
    get().pushHistory();
    set((state) => {
      const updateMap = new Map(updates.map(u => [u.id, u.updates]));
      return {
        participants: state.participants.map((p) => {
          const upd = updateMap.get(p.id);
          return upd ? { ...p, ...upd } : p;
        }),
      };
    });
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  withdrawParticipant: (id) => {
    get().pushHistory();
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === id 
          ? { 
              ...p, 
              withdrawn: true,
              // Clear rank orders to avoid stale positions when un-withdrawn
              formsRankOrder: undefined,
              sparringRankOrder: undefined,
            }
          : p
      ),
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  setCategories: (categories) => {
    get().pushHistory();
    set({ categories });
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
    // Merge divisions to preserve abbreviations from initial config
    const mergedDivisions = (state.config?.divisions || []).map((savedDiv) => {
      const defaultDiv = initialConfig.divisions.find(d => d.name === savedDiv.name);
      return {
        ...savedDiv,
        // Preserve abbreviation from default config if not in saved state
        abbreviation: savedDiv.abbreviation || defaultDiv?.abbreviation
      };
    });

    // Migrate physical ring mappings from old "PR1" format to new "Ring 1" format
    const migratedPhysicalRingMappings = (state.physicalRingMappings || []).map(m => {
      const physicalRingName = m.physicalRingName;
      // Check if it starts with "PR" (old format)
      if (physicalRingName.match(/^PR\d/i)) {
        // Convert "PR1" to "Ring 1", "PR1a" to "Ring 1a", etc.
        const converted = physicalRingName.replace(/^PR(\d+)([a-z])?$/i, 'Ring $1$2');
        return { ...m, physicalRingName: converted };
      }
      return m;
    });

    set({
      participants: state.participants || [],
      categories: state.categories || [],
      config: {
        ...(state.config || initialConfig),
        divisions: mergedDivisions
      },
      physicalRingMappings: migratedPhysicalRingMappings,
      categoryPoolMappings: state.categoryPoolMappings || [],
      customRings: state.customRings || [],
      undoStack: [],
      redoStack: [],
    });
  },

  autoSave: async () => {
    const state = useTournamentStore.getState();
    const tournamentState: SavedState = {
      participants: state.participants,
      categories: state.categories,
      config: state.config,
      physicalRingMappings: state.physicalRingMappings,
      categoryPoolMappings: state.categoryPoolMappings,
      customRings: state.customRings,
      lastSaved: new Date().toISOString(),
    };
    logger.debug('Saving autosave - participants count:', state.participants.length);
    
    try {
      const result = await window.electronAPI.saveAutosave(JSON.stringify(tournamentState));
      logger.debug('Autosave result:', result.success ? 'success' : result.error);
    } catch (error) {
      logger.error('Failed to save autosave:', error);
    }
  },

  reset: () =>
    set({
      participants: [],
      categories: [],
      config: initialConfig,
      checkpoints: [],
      customRings: [],
      undoStack: [],
      redoStack: [],
    }),

  // Checkpoint management
  createCheckpoint: async (name?: string) => {
    const state = get();
    const timestamp = new Date().toISOString();
    const checkpointName = name || `Checkpoint ${new Date().toLocaleString()}`;
    
    const checkpoint: Checkpoint = {
      id: `checkpoint-${Date.now()}`,
      name: checkpointName,
      timestamp,
      state: {
        participants: structuredClone(state.participants),
        categories: structuredClone(state.categories),
        config: structuredClone(state.config),
        physicalRingMappings: structuredClone(state.physicalRingMappings),
        categoryPoolMappings: structuredClone(state.categoryPoolMappings),
        customRings: structuredClone(state.customRings),
        lastSaved: timestamp,
      },
    };

    set((state) => ({
      checkpoints: [...state.checkpoints, checkpoint],
    }));

    // Save checkpoint to disk
    try {
      const result = await window.electronAPI.saveCheckpoint(checkpoint);
      if (result.success) {
        logger.debug('Checkpoint saved:', checkpoint.name);
      } else {
        logger.error('Failed to save checkpoint:', result.error);
      }
    } catch (error) {
      logger.error('Error saving checkpoint:', error);
    }

    return checkpoint;
  },

  renameCheckpoint: (checkpointId: string, newName: string) => {
    set((state) => ({
      checkpoints: state.checkpoints.map(cp =>
        cp.id === checkpointId ? { ...cp, name: newName } : cp
      ),
    }));
    
    // Update checkpoint on disk
    const state = get();
    const checkpoint = state.checkpoints.find(cp => cp.id === checkpointId);
    if (checkpoint) {
      window.electronAPI.saveCheckpoint(checkpoint).catch(err => {
        logger.error('Failed to update checkpoint name:', err);
      });
    }
  },

  deleteCheckpoint: (checkpointId: string) => {
    set((state) => ({
      checkpoints: state.checkpoints.filter(cp => cp.id !== checkpointId),
    }));

    // Delete from disk
    window.electronAPI.deleteCheckpoint(checkpointId).catch(err => {
      logger.error('Failed to delete checkpoint:', err);
    });
  },

  diffCheckpoint: (checkpointId: string): CheckpointDiff | null => {
    const state = get();
    const checkpoint = state.checkpoints.find(cp => cp.id === checkpointId);
    
    if (!checkpoint) {
      return null;
    }

    const currentParticipants = state.participants;
    const checkpointParticipants = checkpoint.state.participants;

    // Create maps for quick lookup
    const currentMap = new Map(currentParticipants.map(p => [p.id, p]));
    const checkpointMap = new Map(checkpointParticipants.map(p => [p.id, p]));

    // Find added participants
    const participantsAdded = currentParticipants.filter(p => !checkpointMap.has(p.id));

    // Find removed participants
    const participantsRemoved = checkpointParticipants.filter(p => !currentMap.has(p.id));

    // Find modified participants
    const participantsModified: ParticipantChange[] = [];
    const ringsAffected = new Set<string>();

    /**
     * Build a ring identifier with all necessary context.
     * Format: Division - CategoryName Pool N_type[_altRing]
     * 
     * Examples:
     * - "Beginner - Mixed 8-10 Pool 1_forms" - Forms ring
     * - "Beginner - Mixed 8-10 Pool 1_sparring" - Sparring ring (no alt rings)
     * - "Beginner - Mixed 8-10 Pool 1_sparring_a" - Sparring alt ring A
     * - "Beginner - Mixed 8-10 Pool 1_sparring_b" - Sparring alt ring B
     */
    const buildRingId = (
      division: string,
      categoryName: string,
      pool: string,
      type: 'forms' | 'sparring',
      altRing?: string
    ): string => {
      // Convert pool format from P1 to Pool 1
      const poolDisplay = pool.replace(/^P(\d+)$/, 'Pool $1');
      let id = `${division} - ${categoryName} ${poolDisplay}_${type}`;
      if (type === 'sparring' && altRing) {
        id += `_${altRing}`;
      }
      return id;
    };

    currentParticipants.forEach(currentP => {
      const checkpointP = checkpointMap.get(currentP.id);
      if (!checkpointP) return; // Already counted in participantsAdded

      // Check relevant fields for changes
      const fieldsToCheck = [
        'formsCategoryId', 'sparringCategoryId',
        'formsPool', 'sparringPool', 'sparringAltRing',
        'competingForms', 'competingSparring',
        'formsRankOrder', 'sparringRankOrder'
      ];

      fieldsToCheck.forEach(field => {
        const currentValue = (currentP as any)[field];
        const checkpointValue = (checkpointP as any)[field];
        
        if (JSON.stringify(currentValue) !== JSON.stringify(checkpointValue)) {
          participantsModified.push({
            participantId: currentP.id,
            participantName: `${currentP.firstName} ${currentP.lastName}`,
            field,
            oldValue: checkpointValue,
            newValue: currentValue,
          });

          // Track affected rings for forms changes
          if (field === 'formsCategoryId' || field === 'formsPool' || field === 'formsRankOrder' || field === 'competingForms') {
            // For rank order changes, only track the current state (reordering doesn't move between rings)
            if (field === 'formsRankOrder') {
              const categoryId = currentP.formsCategoryId;
              const category = state.categories.find(c => c.id === categoryId);
              if (category && currentP.competingForms) {
                const pool = currentP.formsPool || 'P1';
                ringsAffected.add(buildRingId(category.division, category.name, pool, 'forms'));
              }
            } else {
              // For category, pool, or competing changes, track both old and new rings
              if (checkpointP.competingForms && checkpointP.formsCategoryId) {
                const category = checkpoint.state.categories.find(c => c.id === checkpointP.formsCategoryId);
                if (category) {
                  const pool = checkpointP.formsPool || 'P1';
                  ringsAffected.add(buildRingId(category.division, category.name, pool, 'forms'));
                }
              }
              if (currentP.competingForms && currentP.formsCategoryId) {
                const category = state.categories.find(c => c.id === currentP.formsCategoryId);
                if (category) {
                  const pool = currentP.formsPool || 'P1';
                  ringsAffected.add(buildRingId(category.division, category.name, pool, 'forms'));
                }
              }
            }
          }
          
          // Track affected rings for sparring changes
          if (field === 'sparringCategoryId' || field === 'sparringPool' || field === 'sparringAltRing' || field === 'sparringRankOrder' || field === 'competingSparring') {
            // For rank order changes, track the specific alt ring that was reordered
            if (field === 'sparringRankOrder') {
              const categoryId = currentP.sparringCategoryId;
              const category = state.categories.find(c => c.id === categoryId);
              if (category && currentP.competingSparring) {
                const pool = currentP.sparringPool || 'P1';
                ringsAffected.add(buildRingId(category.division, category.name, pool, 'sparring', currentP.sparringAltRing || undefined));
              }
            } else {
              // For category, pool, alt ring, or competing changes, track both old and new rings
              if (checkpointP.competingSparring && checkpointP.sparringCategoryId) {
                const category = checkpoint.state.categories.find(c => c.id === checkpointP.sparringCategoryId);
                if (category) {
                  const pool = checkpointP.sparringPool || 'P1';
                  ringsAffected.add(buildRingId(category.division, category.name, pool, 'sparring', checkpointP.sparringAltRing || undefined));
                }
              }
              if (currentP.competingSparring && currentP.sparringCategoryId) {
                const category = state.categories.find(c => c.id === currentP.sparringCategoryId);
                if (category) {
                  const pool = currentP.sparringPool || 'P1';
                  ringsAffected.add(buildRingId(category.division, category.name, pool, 'sparring', currentP.sparringAltRing || undefined));
                }
              }
            }
          }
        }
      });
    });

    // Track rings for newly added participants
    participantsAdded.forEach(p => {
      if (p.competingForms && p.formsCategoryId) {
        const category = state.categories.find(c => c.id === p.formsCategoryId);
        if (category) {
          const pool = p.formsPool || 'P1';
          ringsAffected.add(buildRingId(category.division, category.name, pool, 'forms'));
        }
      }
      if (p.competingSparring && p.sparringCategoryId) {
        const category = state.categories.find(c => c.id === p.sparringCategoryId);
        if (category) {
          const pool = p.sparringPool || 'P1';
          ringsAffected.add(buildRingId(category.division, category.name, pool, 'sparring', p.sparringAltRing || undefined));
        }
      }
    });

    // Track rings for removed participants (use checkpoint categories)
    participantsRemoved.forEach(p => {
      if (p.competingForms && p.formsCategoryId) {
        const category = checkpoint.state.categories.find(c => c.id === p.formsCategoryId);
        if (category) {
          const pool = p.formsPool || 'P1';
          ringsAffected.add(buildRingId(category.division, category.name, pool, 'forms'));
        }
      }
      if (p.competingSparring && p.sparringCategoryId) {
        const category = checkpoint.state.categories.find(c => c.id === p.sparringCategoryId);
        if (category) {
          const pool = p.sparringPool || 'P1';
          ringsAffected.add(buildRingId(category.division, category.name, pool, 'sparring', p.sparringAltRing || undefined));
        }
      }
    });

    return {
      participantsAdded,
      participantsRemoved,
      participantsModified,
      ringsAffected,
    };
  },

  loadCheckpoint: (checkpointId: string) => {
    const state = get();
    const checkpoint = state.checkpoints.find(cp => cp.id === checkpointId);
    
    if (!checkpoint) {
      alert('Checkpoint not found');
      return;
    }

    if (confirm(`Load checkpoint "${checkpoint.name}"? This will replace your current state.`)) {
      get().pushHistory();
      set({
        participants: structuredClone(checkpoint.state.participants),
        categories: structuredClone(checkpoint.state.categories),
        config: structuredClone(checkpoint.state.config),
        physicalRingMappings: structuredClone(checkpoint.state.physicalRingMappings),
        categoryPoolMappings: structuredClone(checkpoint.state.categoryPoolMappings),
        customRings: checkpoint.state.customRings ? structuredClone(checkpoint.state.customRings) : [],
      });
      // Immediately persist the restored state so autosave reflects the checkpoint data.
      // Without this, closing the app before any subsequent mutation would reload the
      // pre-restore autosave on next startup (silently discarding the checkpoint restore).
      useTournamentStore.getState().autoSave();
      alert(`Checkpoint "${checkpoint.name}" loaded successfully`);
    }
  },

  // Custom Ring actions
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

  setHighlightedParticipantId: (id: string | null) => {
    set({ highlightedParticipantId: id });
  },
}));

// Load checkpoints from disk on startup
if (typeof window !== 'undefined' && window.electronAPI?.loadCheckpoints) {
  window.electronAPI.loadCheckpoints().then((result) => {
    if (result.success && result.data) {
      useTournamentStore.setState({ checkpoints: result.data });
    }
  }).catch((error) => {
    logger.error('Error loading checkpoints on startup:', error);
  });
}
