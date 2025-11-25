import { create } from 'zustand';
import { Participant, Cohort, CompetitionRing, TournamentConfig, Division, PhysicalRing, PhysicalRingMapping, CohortRingMapping, TournamentState as SavedState, Checkpoint, CheckpointDiff, ParticipantChange } from '../types/tournament';

interface TournamentState {
  participants: Participant[];
  cohorts: Cohort[];
  competitionRings: CompetitionRing[]; // DEPRECATED: Now computed from participants, not stored
  config: TournamentConfig;
  physicalRingMappings: PhysicalRingMapping[]; // Legacy
  cohortRingMappings: CohortRingMapping[]; // New mapping system
  checkpoints: Checkpoint[]; // Checkpoint system
  
  // Actions
  setParticipants: (participants: Participant[]) => void;
  updateParticipant: (id: string, updates: Partial<Participant>) => void;
  setCohorts: (cohorts: Cohort[]) => void;
  updateCohort: (id: string, updates: Partial<Cohort>) => void;
  setCompetitionRings: (rings: CompetitionRing[]) => void; // DEPRECATED: For backward compatibility only
  setPhysicalRingMappings: (mappings: PhysicalRingMapping[]) => void;
  setCohortRingMappings: (mappings: CohortRingMapping[]) => void;
  updatePhysicalRingMapping: (cohortRingName: string, physicalRingName: string) => void;
  updateConfig: (config: Partial<TournamentConfig>) => void;
  setDivisions: (divisions: Division[]) => void;
  setPhysicalRings: (rings: PhysicalRing[]) => void;
  setWatermark: (image: string) => void;
  setPdfOutputDirectory: (directory: string) => void;
  setSchoolAbbreviations: (abbreviations: { [schoolName: string]: string }) => void;
  saveState: () => Promise<void>;
  loadState: () => Promise<void>;
  autoSave: () => void;
  reset: () => void;
  
  // Checkpoint actions
  createCheckpoint: (name?: string) => Promise<Checkpoint>;
  renameCheckpoint: (checkpointId: string, newName: string) => void;
  deleteCheckpoint: (checkpointId: string) => void;
  diffCheckpoint: (checkpointId: string) => CheckpointDiff | null;
  loadCheckpoint: (checkpointId: string) => void;
}

const initialConfig: TournamentConfig = {
  divisions: [
    { name: 'Black Belt', order: 1, numRings: 2, abbreviation: 'BLKB' },
    { name: 'Level 1', order: 2, numRings: 2, abbreviation: 'LVL1' },
    { name: 'Level 2', order: 3, numRings: 2, abbreviation: 'LVL2' },
    { name: 'Level 3', order: 4, numRings: 2, abbreviation: 'LVL3' },
    { name: 'Beginner', order: 5, numRings: 2, abbreviation: 'BGNR' },
  ],
  physicalRings: [],
  watermarkImage: undefined,
  pdfOutputDirectory: undefined,
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
  cohorts: [],
  competitionRings: [],
  config: initialConfig,
  physicalRingMappings: [],
  cohortRingMappings: [],
  checkpoints: [],

  setParticipants: (participants) => {
    // Normalize participant objects to include newer fields with defaults
    const normalized = participants.map(p => ({ ...p, sparringAltRing: (p as any).sparringAltRing || '' }));
    set({ participants: normalized });
    setTimeout(() => useTournamentStore.getState().autoSave(), 100);
  },
  
  updateParticipant: (id, updates) => {
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
    setTimeout(() => useTournamentStore.getState().autoSave(), 100);
  },

  setCohorts: (cohorts) => {
    set({ cohorts });
    setTimeout(() => useTournamentStore.getState().autoSave(), 100);
  },
  
  updateCohort: (id, updates) => {
    set((state) => ({
      cohorts: state.cohorts.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
    setTimeout(() => useTournamentStore.getState().autoSave(), 100);
  },

  setCompetitionRings: (rings) => {
    set({ competitionRings: rings });
    setTimeout(() => useTournamentStore.getState().autoSave(), 100);
  },

  setPhysicalRingMappings: (mappings) => {
    set({ physicalRingMappings: mappings });
    setTimeout(() => useTournamentStore.getState().autoSave(), 100);
  },

  setCohortRingMappings: (mappings) => {
    set({ cohortRingMappings: mappings });
    setTimeout(() => useTournamentStore.getState().autoSave(), 100);
  },

  updatePhysicalRingMapping: (cohortRingName, physicalRingName) => {
    set((state) => {
      const existing = state.physicalRingMappings.find(m => m.cohortRingName === cohortRingName);
      if (existing) {
        return {
          physicalRingMappings: state.physicalRingMappings.map(m =>
            m.cohortRingName === cohortRingName ? { ...m, physicalRingName } : m
          ),
        };
      } else {
        return {
          physicalRingMappings: [...state.physicalRingMappings, { cohortRingName, physicalRingName }],
        };
      }
    });
    setTimeout(() => useTournamentStore.getState().autoSave(), 100);
  },

  updateConfig: (configUpdates) => {
    set((state) => ({
      config: { ...state.config, ...configUpdates },
    }));
    setTimeout(() => useTournamentStore.getState().autoSave(), 100);
  },

  setDivisions: (divisions) => {
    set((state) => ({
      config: { ...state.config, divisions },
    }));
    setTimeout(() => useTournamentStore.getState().autoSave(), 100);
  },

  setPhysicalRings: (rings) => {
    set((state) => ({
      config: { ...state.config, physicalRings: rings },
    }));
    setTimeout(() => useTournamentStore.getState().autoSave(), 100);
  },

  setWatermark: (image) => {
    set((state) => ({
      config: { ...state.config, watermarkImage: image },
    }));
    setTimeout(() => useTournamentStore.getState().autoSave(), 100);
  },

  setPdfOutputDirectory: (directory) => {
    set((state) => ({
      config: { ...state.config, pdfOutputDirectory: directory },
    }));
    setTimeout(() => useTournamentStore.getState().autoSave(), 100);
  },

  setSchoolAbbreviations: (abbreviations) => {
    set((state) => ({
      config: { ...state.config, schoolAbbreviations: abbreviations },
    }));
    setTimeout(() => useTournamentStore.getState().autoSave(), 100);
  },

  saveState: async () => {
    const state = useTournamentStore.getState();
    const tournamentState: SavedState = {
      participants: state.participants,
      cohorts: state.cohorts,
      // competitionRings: REMOVED - now computed from participants
      config: state.config,
      physicalRingMappings: state.physicalRingMappings,
      cohortRingMappings: state.cohortRingMappings,
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
        cohorts: state.cohorts || [],
        competitionRings: state.competitionRings || [],
        config: {
          ...(state.config || initialConfig),
          divisions: mergedDivisions
        },
        physicalRingMappings: state.physicalRingMappings || [],
        cohortRingMappings: state.cohortRingMappings || [],
      });
      alert('Tournament state loaded successfully!');
    } else if (result && !result.success) {
      alert('Failed to load tournament state');
    }
  },

  autoSave: async () => {
    const state = useTournamentStore.getState();
    const tournamentState: SavedState = {
      participants: state.participants,
      cohorts: state.cohorts,
      config: state.config,
      physicalRingMappings: state.physicalRingMappings,
      cohortRingMappings: state.cohortRingMappings,
      lastSaved: new Date().toISOString(),
    };
    console.log('Saving autosave - participants count:', state.participants.length);
    
    try {
      const result = await window.electronAPI.saveAutosave(JSON.stringify(tournamentState));
      console.log('Autosave result:', result.success ? 'success' : result.error);
    } catch (error) {
      console.error('Failed to save autosave:', error);
    }
  },

  reset: () =>
    set({
      participants: [],
      cohorts: [],
      competitionRings: [],
      config: initialConfig,
      checkpoints: [],
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
        participants: JSON.parse(JSON.stringify(state.participants)),
        cohorts: JSON.parse(JSON.stringify(state.cohorts)),
        config: JSON.parse(JSON.stringify(state.config)),
        physicalRingMappings: JSON.parse(JSON.stringify(state.physicalRingMappings)),
        cohortRingMappings: JSON.parse(JSON.stringify(state.cohortRingMappings)),
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
        console.log('Checkpoint saved:', checkpoint.name);
      } else {
        console.error('Failed to save checkpoint:', result.error);
      }
    } catch (error) {
      console.error('Error saving checkpoint:', error);
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
        console.error('Failed to update checkpoint name:', err);
      });
    }
  },

  deleteCheckpoint: (checkpointId: string) => {
    set((state) => ({
      checkpoints: state.checkpoints.filter(cp => cp.id !== checkpointId),
    }));

    // Delete from disk
    window.electronAPI.deleteCheckpoint(checkpointId).catch(err => {
      console.error('Failed to delete checkpoint:', err);
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
        'formsCohortId', 'sparringCohortId',
        'formsCohortRing', 'sparringCohortRing', 'sparringAltRing',
        'formsRingId', 'sparringRingId',
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
          if (field === 'formsCohortId' || field === 'formsCohortRing') {
            if (checkpointValue) {
              const cohort = checkpoint.state.cohorts.find(c => c.id === checkpointValue);
              if (cohort) ringsAffected.add(`${cohort.name}_${checkpointP.formsCohortRing || 'R1'}`);
            }
            if (currentValue) {
              const cohort = state.cohorts.find(c => c.id === currentValue);
              if (cohort) ringsAffected.add(`${cohort.name}_${currentP.formsCohortRing || 'R1'}`);
            }
          }
          if (field === 'sparringCohortId' || field === 'sparringCohortRing' || field === 'sparringAltRing') {
            if (checkpointValue) {
              const cohort = checkpoint.state.cohorts.find(c => c.id === checkpointValue);
              if (cohort) {
                const altRingSuffix = checkpointP.sparringAltRing ? `_${checkpointP.sparringAltRing}` : '';
                ringsAffected.add(`${cohort.name}_${checkpointP.sparringCohortRing || 'R1'}${altRingSuffix}`);
              }
            }
            if (currentValue) {
              const cohort = state.cohorts.find(c => c.id === currentValue);
              if (cohort) {
                const altRingSuffix = currentP.sparringAltRing ? `_${currentP.sparringAltRing}` : '';
                ringsAffected.add(`${cohort.name}_${currentP.sparringCohortRing || 'R1'}${altRingSuffix}`);
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
        participants: JSON.parse(JSON.stringify(checkpoint.state.participants)),
        cohorts: JSON.parse(JSON.stringify(checkpoint.state.cohorts)),
        config: JSON.parse(JSON.stringify(checkpoint.state.config)),
        physicalRingMappings: JSON.parse(JSON.stringify(checkpoint.state.physicalRingMappings)),
        cohortRingMappings: JSON.parse(JSON.stringify(checkpoint.state.cohortRingMappings)),
      });
      alert(`Checkpoint "${checkpoint.name}" loaded successfully`);
    }
  },
}));

// Load checkpoints from disk on startup
if (typeof window !== 'undefined' && window.electronAPI?.loadCheckpoints) {
  window.electronAPI.loadCheckpoints().then((result) => {
    if (result.success && result.data) {
      useTournamentStore.setState({ checkpoints: result.data });
    }
  }).catch((error) => {
    console.error('Error loading checkpoints on startup:', error);
  });
}
