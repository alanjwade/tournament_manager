import { PhysicalRing, CompetitionRing } from '../types/tournament';

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
  physicalRingMappings: { cohortRingName: string; physicalRingName: string }[]
): string | null {
  const mapping = physicalRingMappings.find(m => m.cohortRingName === cohortRingName);
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
  
  // Extract the number from the physical ring ID (e.g., "PR4b" -> "4b")
  const match = physicalRingId.match(/PR(\d+[a-z]?)/i);
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
  
  // Extract the number from the physical ring ID (e.g., "PR4b" -> "4b")
  const match = physicalRingId.match(/PR(\d+[a-z]?)/i);
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
