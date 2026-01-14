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
  formsDivision: string; // Can be division name, 'same as sparring', or 'not participating'
  sparringDivision: string; // Can be division name, 'same as forms', or 'not participating'
  formsCategoryId?: string; // Category ID for forms competition
  sparringCategoryId?: string; // Category ID for sparring competition
  
  // Pool identifiers within category (e.g., "P1", "P2", "P3")
  formsPool?: string; // Which pool within their forms category
  sparringPool?: string; // Which pool within their sparring category
  sparringAltRing?: '' | 'a' | 'b'; // Subdivide sparring pools into 'a' and 'b' groups
  
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
  abbreviation?: string; // Short division designator (e.g., "BLKB", "LVL1")
}

export interface Category {
  id: string;
  name: string;
  division: string;
  type?: 'forms' | 'sparring'; // Optional for backward compatibility
  gender: 'male' | 'female' | 'mixed';
  minAge: number;
  maxAge: number;
  participantIds: string[];
  numPools: number;
}

export interface PhysicalRing {
  id: string;
  name: string;
  color: string;
}

/**
 * CompetitionRing interface
 * @deprecated This is now computed from participant data using computeCompetitionRings()
 * Ring objects are generated on-demand from participants' category pool assignments.
 * This interface is kept for backward compatibility and internal ring assignment logic.
 */
export interface CompetitionRing {
  id: string;
  physicalRingId: string;
  categoryId: string;
  division: string;
  type: 'forms' | 'sparring';
  participantIds: string[]; // DEPRECATED: Computed from participants with matching categoryId + pool
  name?: string; // Category pool name like "Male 8-10_P1"
}

export interface CategoryCriteria {
  id: string;
  division: string;
  gender: 'male' | 'female' | 'mixed';
  minAge: number;
  maxAge: number;
  numPools: number;
}

export interface TournamentConfig {
  divisions: Division[];
  physicalRings: PhysicalRing[];
  watermarkImage?: string;
  pdfOutputDirectory?: string; // Directory where PDFs will be saved
  schoolAbbreviations?: { [schoolName: string]: string }; // Map of school names to abbreviations
}

export interface PhysicalRingMapping {
  categoryPoolName: string;
  physicalRingName: string;
}

export interface CategoryPoolMapping {
  division: string;
  categoryId: string;
  pool: string; // e.g., "P1", "P2", "P3"
  physicalRingId: string; // e.g., "PR1a", "PR2", etc.
}

export interface TournamentState {
  participants: Participant[];
  categories: Category[];
  competitionRings?: CompetitionRing[]; // DEPRECATED: Now computed from participants, optional for backward compatibility
  config: TournamentConfig;
  physicalRingMappings: PhysicalRingMapping[];
  categoryPoolMappings: CategoryPoolMapping[];
  lastSaved?: string;
}

export interface Checkpoint {
  id: string;
  name: string;
  timestamp: string;
  state: TournamentState;
}

export interface ParticipantChange {
  participantId: string;
  participantName: string;
  field: string;
  oldValue: any;
  newValue: any;
}

export interface CheckpointDiff {
  participantsAdded: Participant[];
  participantsRemoved: Participant[];
  participantsModified: ParticipantChange[];
  ringsAffected: Set<string>; // List of ring names that have changes
}
