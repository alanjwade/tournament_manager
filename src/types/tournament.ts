export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: 'Male' | 'Female';
  heightFeet: number;
  heightInches: number;
  totalHeightInches: number;
  school: string;
  branch?: string;
  division: string; // The division they're competing in
  
  // Cohort assignments
  formsCohortId?: string;
  sparringCohortId?: string;
  
  // Cohort ring assignments (e.g., "R1", "R2", "R3")
  // These are relative to their cohort, not global ring IDs
  formsCohortRing?: string;
  sparringCohortRing?: string;
  
  // Ordering within their cohort ring
  formsRankOrder?: number;
  sparringRankOrder?: number;
  
  // Competition flags
  competingForms: boolean;
  competingSparring: boolean;
  
  // DEPRECATED - keeping for backward compatibility during migration
  formsRingId?: string;
  sparringRingId?: string;
}

export interface Division {
  name: string;
  order: number;
}

export interface Cohort {
  id: string;
  name: string; // e.g., "Mixed 8-10 Forms"
  division: string;
  type: 'forms' | 'sparring';
  gender: 'Male' | 'Female' | 'Mixed';
  minAge: number;
  maxAge: number;
  numRings: number; // How many cohort rings this cohort needs
  participantIds: string[]; // Participant IDs in this cohort
}

export interface Ring {
  id: string;
  color: string;
  name: string;
}

export interface PhysicalRing extends Ring {
  // Physical ring at the venue
}

// Mapping from cohort rings to physical rings
export interface CohortRingMapping {
  division: string;
  cohortId: string;
  cohortRing: string; // e.g., "R1", "R2", "R3"
  physicalRingId: string; // e.g., "PR1a", "PR2", etc.
}

// DEPRECATED: CompetitionRing will be computed from participants, not stored
// Keeping for backward compatibility during migration
export interface CompetitionRing {
  id: string;
  division: string;
  cohortId: string;
  physicalRingId: string;
  type: 'forms' | 'sparring';
  participantIds: string[]; // Participant IDs
  name?: string;
}

// Legacy physical ring mapping - will migrate to CohortRingMapping
export interface PhysicalRingMapping {
  cohortRingName: string;
  physicalRingName: string;
}

export interface TournamentConfig {
  divisions: Division[];
  physicalRings: PhysicalRing[];
  watermarkImage?: string; // Base64 encoded image
}

export interface AppState {
  participants: Participant[];
  cohorts: Cohort[];
  cohortRingMappings: CohortRingMapping[]; // New: maps cohort rings to physical rings
  competitionRings: CompetitionRing[]; // DEPRECATED: will be computed from participants
  physicalRingMappings: PhysicalRingMapping[]; // Legacy mapping
  config: TournamentConfig;
}

