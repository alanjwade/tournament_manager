import { create } from 'zustand';
import { Participant, Category, CompetitionRing, TournamentConfig, Division, PhysicalRing, PhysicalRingMapping, CategoryPoolMapping, TournamentState as SavedState, Checkpoint, CheckpointDiff, ParticipantChange, CustomRing } from '../types/tournament';
import { debounce } from '../utils/debounce';
import { AUTOSAVE_DELAY_MS } from '../utils/constants';
import { logger } from '../utils/logger';

interface TournamentState {
  participants: Participant[];
  categories: Category[];
  config: TournamentConfig;
  physicalRingMappings: PhysicalRingMapping[]; // Legacy
  categoryPoolMappings: CategoryPoolMapping[]; // New mapping system
  checkpoints: Checkpoint[]; // Checkpoint system
  customRings: CustomRing[]; // Grand Champion / Side rings
  
  // Actions
  setParticipants: (participants: Participant[]) => void;
  updateParticipant: (id: string, updates: Partial<Participant>) => void;
  setCategories: (categories: Category[]) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  setPhysicalRingMappings: (mappings: PhysicalRingMapping[]) => void;
  updatePhysicalRingMapping: (categoryPoolName: string, physicalRingName: string) => void;
  updateConfig: (config: Partial<TournamentConfig>) => void;
  setDivisions: (divisions: Division[]) => void;
  setPhysicalRings: (rings: PhysicalRing[]) => void;
  setWatermark: (image: string) => void;
  setPdfOutputDirectory: (directory: string) => void;
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
  pdfOutputDirectory: 'pdf_outputs',
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
    set({ participants: normalized });
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },
  
  updateParticipant: (id, updates) => {
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  setCategories: (categories) => {
    set({ categories });
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },
  
  updateCategory: (id, updates) => {
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  setPhysicalRingMappings: (mappings) => {
    set({ physicalRingMappings: mappings });
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  updatePhysicalRingMapping: (categoryPoolName, physicalRingName) => {
    set((state) => {
      const existing = state.physicalRingMappings.find(m => m.categoryPoolName === categoryPoolName);
      if (existing) {
        return {
          physicalRingMappings: state.physicalRingMappings.map(m =>
            m.categoryPoolName === categoryPoolName ? { ...m, physicalRingName, categoryPoolName } : m
          ),
        };
      } else {
        return {
          physicalRingMappings: [...state.physicalRingMappings, { categoryPoolName, physicalRingName }],
        };
      }
    });
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  updateConfig: (configUpdates) => {
    set((state) => ({
      config: { ...state.config, ...configUpdates },
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  setDivisions: (divisions) => {
    set((state) => ({
      config: { ...state.config, divisions },
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  setPhysicalRings: (rings) => {
    set((state) => ({
      config: { ...state.config, physicalRings: rings },
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  setWatermark: (image) => {
    set((state) => ({
      config: { ...state.config, watermarkImage: image },
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  setPdfOutputDirectory: (directory) => {
    set((state) => ({
      config: { ...state.config, pdfOutputDirectory: directory },
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  setSchoolAbbreviations: (abbreviations) => {
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

    set({
      participants: state.participants || [],
      categories: state.categories || [],
      config: {
        ...(state.config || initialConfig),
        divisions: mergedDivisions
      },
      physicalRingMappings: state.physicalRingMappings || [],
      categoryPoolMappings: state.categoryPoolMappings || [],
      customRings: state.customRings || [],
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

          // Track affected rings
          if (field === 'formsCategoryId' || field === 'formsPool') {
            if (checkpointValue) {
              const categoryId = field === 'formsCategoryId' ? checkpointValue : checkpointP.formsCategoryId;
              const category = checkpoint.state.categories.find(c => c.id === categoryId);
              if (category) {
                const pool = checkpointP.formsPool || 'P1';
                ringsAffected.add(`${category.name}_${pool}`);
              }
            }
            if (currentValue) {
              const categoryId = field === 'formsCategoryId' ? currentValue : currentP.formsCategoryId;
              const category = state.categories.find(c => c.id === categoryId);
              if (category) {
                const pool = currentP.formsPool || 'P1';
                ringsAffected.add(`${category.name}_${pool}`);
              }
            }
          }
          if (field === 'sparringCategoryId' || field === 'sparringPool' || field === 'sparringAltRing') {
            if (checkpointValue) {
              const categoryId = field === 'sparringCategoryId' ? checkpointValue : checkpointP.sparringCategoryId;
              const category = checkpoint.state.categories.find(c => c.id === categoryId);
              if (category) {
                const pool = checkpointP.sparringPool || 'P1';
                const altRingSuffix = checkpointP.sparringAltRing ? `_${checkpointP.sparringAltRing}` : '';
                ringsAffected.add(`${category.name}_${pool}${altRingSuffix}`);
              }
            }
            if (currentValue) {
              const categoryId = field === 'sparringCategoryId' ? currentValue : currentP.sparringCategoryId;
              const category = state.categories.find(c => c.id === categoryId);
              if (category) {
                const pool = currentP.sparringPool || 'P1';
                const altRingSuffix = currentP.sparringAltRing ? `_${currentP.sparringAltRing}` : '';
                ringsAffected.add(`${category.name}_${pool}${altRingSuffix}`);
              }
            }
          }
        }
      });
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
      set({
        participants: structuredClone(checkpoint.state.participants),
        categories: structuredClone(checkpoint.state.categories),
        config: structuredClone(checkpoint.state.config),
        physicalRingMappings: structuredClone(checkpoint.state.physicalRingMappings),
        categoryPoolMappings: structuredClone(checkpoint.state.categoryPoolMappings),
        customRings: checkpoint.state.customRings ? structuredClone(checkpoint.state.customRings) : [],
      });
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
    set((state) => ({
      customRings: [...state.customRings, newRing],
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
    return newRing;
  },

  deleteCustomRing: (id: string) => {
    set((state) => ({
      customRings: state.customRings.filter(r => r.id !== id),
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  updateCustomRing: (id: string, updates: Partial<CustomRing>) => {
    set((state) => ({
      customRings: state.customRings.map(r =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
    debounce(() => useTournamentStore.getState().autoSave(), AUTOSAVE_DELAY_MS);
  },

  addParticipantToCustomRing: (ringId: string, participantId: string) => {
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
