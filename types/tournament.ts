export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  heightFeet: number;
  heightInches: number;
  school: string;
  branch?: string;
  division?: string; // Simple division field for backward compat
  formsDivision: string; // Can be division name, 'same as sparring', or 'not participating'
  sparringDivision: string; // Can be division name, 'same as forms', or 'not participating'
  cohortId?: string; // Legacy - kept for backward compatibility
  formsCohortId?: string; // Cohort ID for forms competition
  sparringCohortId?: string; // Cohort ID for sparring competition
  
  // NEW: Simple ring identifiers within cohort (e.g., "R1", "R2", "R3")
  formsCohortRing?: string; // Which ring within their forms cohort
  sparringCohortRing?: string; // Which ring within their sparring cohort
  sparringAltRing?: '' | 'a' | 'b'; // Subdivide sparring rings into 'a' and 'b' groups
  
  // DEPRECATED: Legacy ring IDs - kept for backward compatibility, will be removed in future
  formsRingId?: string; // Use formsCohortId + formsCohortRing instead
  sparringRingId?: string; // Use sparringCohortId + sparringCohortRing instead
  
  formsRankOrder?: number;
  sparringRankOrder?: number;
  competingForms: boolean;
  competingSparring: boolean;
  totalHeightInches?: number;
}

export interface Division {
  name: string;
  order: number;
  numRings?: number; // Optional for backward compatibility
}

export interface Cohort {
  id: string;
  name: string;
  division: string;
  type?: 'forms' | 'sparring'; // Optional for backward compatibility
  gender: 'male' | 'female' | 'mixed';
  minAge: number;
  maxAge: number;
  participantIds: string[];
  numRings: number;
}

export interface PhysicalRing {
  id: string;
  name: string;
  color: string;
}

/**
 * CompetitionRing interface
 * @deprecated This is now computed from participant data using computeCompetitionRings()
 * Ring objects are generated on-demand from participants' cohort ring assignments.
 * This interface is kept for backward compatibility and internal ring assignment logic.
 */
export interface CompetitionRing {
  id: string;
  physicalRingId: string;
  cohortId: string;
  division: string;
  type: 'forms' | 'sparring';
  participantIds: string[]; // DEPRECATED: Computed from participants with matching cohortId + cohortRing
  name?: string; // Cohort ring name like "Male 8-10_R1"
}

export interface CohortCriteria {
  id: string;
  division: string;
  gender: 'male' | 'female' | 'mixed';
  minAge: number;
  maxAge: number;
  numRings: number;
}

export interface TournamentConfig {
  divisions: Division[];
  physicalRings: PhysicalRing[];
  watermarkImage?: string;
  pdfOutputDirectory?: string; // Directory where PDFs will be saved
  schoolAbbreviations?: { [schoolName: string]: string }; // Map of school names to abbreviations
}

export interface PhysicalRingMapping {
  cohortRingName: string;
  physicalRingName: string;
}

export interface CohortRingMapping {
  division: string;
  cohortId: string;
  cohortRing: string; // e.g., "R1", "R2", "R3"
  physicalRingId: string; // e.g., "PR1a", "PR2", etc.
}

export interface TournamentState {
  participants: Participant[];
  cohorts: Cohort[];
  competitionRings?: CompetitionRing[]; // DEPRECATED: Now computed from participants, optional for backward compatibility
  config: TournamentConfig;
  physicalRingMappings: PhysicalRingMapping[];
  cohortRingMappings?: CohortRingMapping[]; // Optional for backward compatibility
  lastSaved?: string;
}
