/**
 * Get school abbreviation from configuration
 * Returns the abbreviation if found, otherwise returns the original school name
 */
export function getSchoolAbbreviation(
  schoolName: string,
  abbreviations?: { [schoolName: string]: string }
): string {
  if (!abbreviations) {
    return schoolName;
  }

  // Normalize the school name for matching (lowercase, trim whitespace)
  const normalizedSchoolName = schoolName.toLowerCase().trim();

  // Check for exact match first (case-insensitive)
  for (const [key, value] of Object.entries(abbreviations)) {
    if (key.toLowerCase().trim() === normalizedSchoolName) {
      return value;
    }
  }

  // Check if the school name contains any of the abbreviation keys
  for (const [key, value] of Object.entries(abbreviations)) {
    const normalizedKey = key.toLowerCase().trim();
    if (normalizedSchoolName.includes(normalizedKey) || normalizedKey.includes(normalizedSchoolName)) {
      return value;
    }
  }

  // Return original name if no match found
  return schoolName;
}
