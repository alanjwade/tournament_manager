import { create } from 'zustand';
import { Participant, Cohort, CompetitionRing, TournamentConfig, Division, PhysicalRing, PhysicalRingMapping, CohortRingMapping, TournamentState as SavedState } from '../types/tournament';

interface TournamentState {
  participants: Participant[];
  cohorts: Cohort[];
  competitionRings: CompetitionRing[]; // DEPRECATED: Now computed from participants, not stored
  config: TournamentConfig;
  physicalRingMappings: PhysicalRingMapping[]; // Legacy
  cohortRingMappings: CohortRingMapping[]; // New mapping system
  
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
  saveState: () => Promise<void>;
  loadState: () => Promise<void>;
  autoSave: () => void;
  reset: () => void;
}

const initialConfig: TournamentConfig = {
  divisions: [
    { name: 'Black Belt', order: 1, numRings: 2 },
    { name: 'Level 1', order: 2, numRings: 2 },
    { name: 'Level 2', order: 3, numRings: 2 },
    { name: 'Level 3', order: 4, numRings: 2 },
    { name: 'Beginner', order: 5, numRings: 2 },
  ],
  physicalRings: [],
  watermarkImage: undefined,
};

export const useTournamentStore = create<TournamentState>((set) => ({
  participants: [],
  cohorts: [],
  competitionRings: [],
  config: initialConfig,
  physicalRingMappings: [],
  cohortRingMappings: [],

  setParticipants: (participants) => {
    set({ participants });
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

  setWatermark: (image) =>
    set((state) => ({
      config: { ...state.config, watermarkImage: image },
    })),

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
      set({
        participants: state.participants || [],
        cohorts: state.cohorts || [],
        competitionRings: state.competitionRings || [],
        config: state.config || initialConfig,
        physicalRingMappings: state.physicalRingMappings || [],
        cohortRingMappings: state.cohortRingMappings || [],
      });
      alert('Tournament state loaded successfully!');
    } else if (result && !result.success) {
      alert('Failed to load tournament state');
    }
  },

  autoSave: () => {
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
    localStorage.setItem('tournament-autosave', JSON.stringify(tournamentState));
  },

  reset: () =>
    set({
      participants: [],
      cohorts: [],
      competitionRings: [],
      config: initialConfig,
    }),
}));
