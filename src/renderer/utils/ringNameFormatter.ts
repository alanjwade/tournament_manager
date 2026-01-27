import { PhysicalRing, CompetitionRing } from '../types/tournament';

/**
 * Format a pool name for display (e.g., "Mixed 8-10_P1" -> "Mixed 8-10 Pool 1")
 * Converts internal pool naming to user-friendly display format
 */
export function formatPoolNameForDisplay(poolName: string): string {
  // Replace _P1, _P2, etc. with " Pool 1", " Pool 2", etc.
  return poolName.replace(/_P(\d+)$/, ' Pool $1');
}

/**
 * Format a single pool identifier (e.g., "P1" -> "Pool 1")
 */
export function formatPoolOnly(pool: string): string {
  if (!pool) return '';
  return pool.replace(/^P(\d+)$/, 'Pool $1');
}

/**
 * Get the ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return num + 'st';
  if (j === 2 && k !== 12) return num + 'nd';
  if (j === 3 && k !== 13) return num + 'rd';
  return num + 'th';
}

/**
 * Format a date with ordinal suffix (e.g., "July 3rd, 2025")
 */
export function formatDateWithOrdinal(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const month = months[date.getMonth()];
  const day = getOrdinalSuffix(date.getDate());
  const year = date.getFullYear();
  
  return `${month} ${day}, ${year}`;
}

/**
 * Format a timestamp for PDF footer (e.g., "Created on July 3rd, 2025 at 2:45:32 PM MST")
 */
export function formatPdfTimestamp(date: Date = new Date()): string {
  const dateStr = formatDateWithOrdinal(date);
  
  // Format time
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  
  // Get timezone abbreviation
  const timeZoneStr = date.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop() || '';
  
  return `Created on ${dateStr} at ${hours}:${minutes}:${seconds} ${ampm} ${timeZoneStr}`;
}

/**
 * Get the physical ring name from a pool name and mapping
 * Returns the physical ring identifier (e.g., "PR4b", "PR1a", "PR9")
 */
export function getPhysicalRingId(
  cohortRingName: string,
  physicalRingMappings: { categoryPoolName: string; physicalRingName: string }[]
): string | null {
  const mapping = physicalRingMappings.find(m => m.categoryPoolName === cohortRingName);
  return mapping?.physicalRingName || null;
}

/**
 * Get expanded ring name (e.g., "Ring 4b")
 * Assumes division is known by context
 */
export function getExpandedRingName(
  physicalRingId: string | null,
  physicalRings?: PhysicalRing[]
): string {
  if (!physicalRingId) return 'Unknown Ring';
  
  // Extract the number from the physical ring ID (e.g., "PR4b" or "Ring 4b" -> "4b")
  const match = physicalRingId.match(/(?:PR|Ring\s*)(\d+[a-z]?)/i);
  if (!match) return physicalRingId;
  
  const ringNumber = match[1];
  return `Ring ${ringNumber}`;
}

/**
 * Get fully qualified expanded ring name (e.g., "Black Belt Ring 4b")
 * Includes division for full context
 */
export function getFullyQualifiedRingName(
  division: string,
  physicalRingId: string | null,
  physicalRings?: PhysicalRing[]
): string {
  if (!physicalRingId) return `${division} Unknown Ring`;
  
  // Extract the number from the physical ring ID (e.g., "PR4b" or "Ring 4b" -> "4b")
  const match = physicalRingId.match(/(?:PR|Ring\s*)(\d+[a-z]?)/i);
  if (!match) return `${division} ${physicalRingId}`;
  
  const ringNumber = match[1];
  return `${division} Ring ${ringNumber}`;
}

/**
 * Get ring name from a CompetitionRing and physical ring mapping
 */
export function getRingNameFromCompetitionRing(
  ring: CompetitionRing,
  physicalRings: PhysicalRing[]
): string {
  const physicalRing = physicalRings.find(r => r.id === ring.physicalRingId);
  
  if (!physicalRing) {
    return 'Unknown Ring';
  }
  
  // If the physical ring has a name like "Ring 1", use it
  // Otherwise try to extract from ID
  if (physicalRing.name) {
    return physicalRing.name;
  }
  
  return getExpandedRingName(physicalRing.id, physicalRings);
}

/**
 * Get fully qualified ring name from a CompetitionRing and physical ring mapping
 */
export function getFullyQualifiedRingNameFromCompetitionRing(
  ring: CompetitionRing,
  physicalRings: PhysicalRing[]
): string {
  const physicalRing = physicalRings.find(r => r.id === ring.physicalRingId);
  
  if (!physicalRing) {
    return `${ring.division} Unknown Ring`;
  }
  
  // If the physical ring has a name like "Ring 1", use it with division
  if (physicalRing.name) {
    return `${ring.division} ${physicalRing.name}`;
  }
  
  return getFullyQualifiedRingName(ring.division, physicalRing.id, physicalRings);
}

/**
 * Ring identifier parsing result.
 * Ring IDs have the format: CategoryName_Pool_type[_altRing]
 * Examples:
 * - "Beginner_P1_forms"
 * - "Beginner_P1_sparring"
 * - "Beginner_P1_sparring_a"
 */
export interface ParsedRingId {
  categoryPool: string;  // "Beginner_P1"
  type: 'forms' | 'sparring';
  altRing?: string;  // 'a', 'b', etc.
}

/**
 * Parse a ring identifier into its components.
 */
export function parseRingId(ringId: string): ParsedRingId | null {
  // Match pattern: CategoryName_Pool_type[_altRing]
  // The type is always 'forms' or 'sparring'
  const sparringAltMatch = ringId.match(/^(.+)_sparring_([a-z])$/);
  if (sparringAltMatch) {
    return {
      categoryPool: sparringAltMatch[1],
      type: 'sparring',
      altRing: sparringAltMatch[2],
    };
  }
  
  const sparringMatch = ringId.match(/^(.+)_sparring$/);
  if (sparringMatch) {
    return {
      categoryPool: sparringMatch[1],
      type: 'sparring',
    };
  }
  
  const formsMatch = ringId.match(/^(.+)_forms$/);
  if (formsMatch) {
    return {
      categoryPool: formsMatch[1],
      type: 'forms',
    };
  }
  
  return null;
}

/**
 * Check if a ring is affected based on the changedRings set from checkpoint diff.
 * 
 * The new ring ID format is: CategoryName_Pool_type[_altRing]
 * Examples:
 * - "Beginner_P1_forms" - Forms ring
 * - "Beginner_P1_sparring" - Sparring ring (no alt rings)
 * - "Beginner_P1_sparring_a" - Sparring alt ring A
 * 
 * @param ringName - The base ring name from CompetitionRing (e.g., "Beginner_P1")
 * @param ringType - The type of ring ('forms' or 'sparring')
 * @param changedRings - The set of changed ring IDs from diffCheckpoint
 * @returns Object with isAffected flag and optional altRing filter
 */
export function isRingAffected(
  ringName: string,
  ringType: 'forms' | 'sparring',
  changedRings: Set<string>
): { isAffected: boolean; altRings?: Set<string> } {
  if (ringType === 'forms') {
    // For forms, check for CategoryName_Pool_forms
    const isAffected = changedRings.has(`${ringName}_forms`);
    return { isAffected };
  } else {
    // For sparring, check for:
    // - CategoryName_Pool_sparring (no alt rings - print entire sparring bracket)
    // - CategoryName_Pool_sparring_a (alt ring A)
    // - CategoryName_Pool_sparring_b (alt ring B)
    
    // If the whole sparring ring changed (no specific alt ring), print all alt rings
    if (changedRings.has(`${ringName}_sparring`)) {
      return { isAffected: true };  // No altRings filter = print all
    }
    
    // Otherwise, check for specific alt rings
    const affectedAltRings = new Set<string>();
    if (changedRings.has(`${ringName}_sparring_a`)) {
      affectedAltRings.add('a');
    }
    if (changedRings.has(`${ringName}_sparring_b`)) {
      affectedAltRings.add('b');
    }
    
    if (affectedAltRings.size > 0) {
      return {
        isAffected: true,
        altRings: affectedAltRings,
      };
    }
    
    return { isAffected: false };
  }
}

/**
 * Simple boolean check if a ring is affected (for backwards compatibility).
 */
export function isRingAffectedSimple(
  ringName: string,
  ringType: 'forms' | 'sparring',
  changedRings: Set<string>
): boolean {
  return isRingAffected(ringName, ringType, changedRings).isAffected;
}
