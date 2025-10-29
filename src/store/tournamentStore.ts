import { create } from 'zustand';
import { Participant, Cohort, CompetitionRing, TournamentConfig, Division, PhysicalRing, CohortCriteria } from '../../types/tournament';

interface TournamentState {
  participants: Participant[];
  cohorts: Cohort[];
  competitionRings: CompetitionRing[];
  config: TournamentConfig;
  
  // Actions
  setParticipants: (participants: Participant[]) => void;
  updateParticipant: (id: string, updates: Partial<Participant>) => void;
  setCohorts: (cohorts: Cohort[]) => void;
  updateCohort: (id: string, updates: Partial<Cohort>) => void;
  setCompetitionRings: (rings: CompetitionRing[]) => void;
  updateConfig: (config: Partial<TournamentConfig>) => void;
  setDivisions: (divisions: Division[]) => void;
  setPhysicalRings: (rings: PhysicalRing[]) => void;
  setCohortCriteria: (criteria: CohortCriteria[]) => void;
  setWatermark: (image: string) => void;
  reset: () => void;
}

const initialConfig: TournamentConfig = {
  divisions: [
    { name: 'Black Belt', order: 1 },
    { name: 'Level 1', order: 2 },
    { name: 'Level 2', order: 3 },
    { name: 'Level 3', order: 4 },
    { name: 'Beginner', order: 5 },
  ],
  physicalRings: [],
  cohortCriteria: [],
  watermarkImage: undefined,
};

export const useTournamentStore = create<TournamentState>((set) => ({
  participants: [],
  cohorts: [],
  competitionRings: [],
  config: initialConfig,

  setParticipants: (participants) => set({ participants }),
  
  updateParticipant: (id, updates) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  setCohorts: (cohorts) => set({ cohorts }),
  
  updateCohort: (id, updates) =>
    set((state) => ({
      cohorts: state.cohorts.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  setCompetitionRings: (rings) => set({ competitionRings: rings }),

  updateConfig: (configUpdates) =>
    set((state) => ({
      config: { ...state.config, ...configUpdates },
    })),

  setDivisions: (divisions) =>
    set((state) => ({
      config: { ...state.config, divisions },
    })),

  setPhysicalRings: (rings) =>
    set((state) => ({
      config: { ...state.config, physicalRings: rings },
    })),

  setCohortCriteria: (criteria) =>
    set((state) => ({
      config: { ...state.config, cohortCriteria: criteria },
    })),

  setWatermark: (image) =>
    set((state) => ({
      config: { ...state.config, watermarkImage: image },
    })),

  reset: () =>
    set({
      participants: [],
      cohorts: [],
      competitionRings: [],
      config: initialConfig,
    }),
}));
