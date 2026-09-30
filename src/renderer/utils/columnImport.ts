import * as XLSX from 'xlsx';
import { Participant } from '../types/tournament';

export interface ColumnImportResult {
  updated: number;
  unchanged: number;
  notMatched: string[]; // rows in spreadsheet that didn't match any participant
  notFound: string[]; // rows that matched but were skipped (ambiguous name or invalid value)
  fieldName: string;
  details: Array<{
    name: string;
    oldValue: string | number | boolean | null | undefined;
    newValue: string | number | boolean | null | undefined;
    status: 'updated' | 'unchanged' | 'not_matched';
  }>;
}

/**
 * Read the headers from an Excel file without fully parsing it.
 */
export function readSpreadsheetHeaders(data: number[]): string[] {
  const uint8Array = new Uint8Array(data);
  const workbook = XLSX.read(uint8Array, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  if (jsonData.length === 0) return [];
  return Object.keys(jsonData[0]);
}

/**
 * The set of participant fields that are allowed to be updated via single-column import.
 * Maps the display name to the Participant key.
 */
export const UPDATABLE_FIELDS: Record<string, keyof Participant> = {
  branch: 'branch',
  school: 'school',
  gender: 'gender',
  age: 'age',
  'height feet': 'heightFeet',
  'height inches': 'heightInches',
};

/**
 * Apply a single-column update from a spreadsheet to the existing participant list.
 *
 * Matching is performed by first name + last name (case-insensitive).
 * The spreadsheet must have columns named:
 *   - "first name" / "First Name" / "Student First Name" (etc.)
 *   - "last name"  / "Last Name"  / "Student Last Name"  (etc.)
 *   - <selectedHeader>  — the column whose value will be written into <targetField>
 *
 * @param data         Raw file bytes
 * @param selectedHeader  The spreadsheet column header to read from
 * @param targetField  The Participant key to write the value into
 * @param participants Existing participant list
 */
export function applyColumnImport(
  data: number[],
  selectedHeader: string,
  targetField: keyof Participant,
  participants: Participant[]
): { updatedParticipants: Participant[]; result: ColumnImportResult } {
  const uint8Array = new Uint8Array(data);
  const workbook = XLSX.read(uint8Array, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  // Helper: find the right key regardless of capitalisation
  function findCol(row: Record<string, unknown>, candidates: string[]): string | undefined {
    const keys = Object.keys(row);
    for (const c of candidates) {
      const found = keys.find(k => k.toLowerCase().trim() === c.toLowerCase().trim());
      if (found !== undefined) return found;
    }
    return undefined;
  }

  // Helper: normalize a participant name for case/whitespace-insensitive matching
  function normalizeName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  const result: ColumnImportResult = {
    updated: 0,
    unchanged: 0,
    notMatched: [],
    notFound: [],
    fieldName: selectedHeader,
    details: [],
  };

  // Build a lookup map of normalized full name -> participant indices for fast matching.
  // A name can legitimately appear more than once, so every matching index is retained;
  // ambiguous rows are skipped below instead of silently overwriting one arbitrary record.
  const participantMap = new Map<string, number[]>();
  participants.forEach((p, idx) => {
    const key = normalizeName(p.firstName, p.lastName);
    if (!key.trim()) return;
    const existing = participantMap.get(key);
    if (existing) {
      existing.push(idx);
    } else {
      participantMap.set(key, [idx]);
    }
  });

  // Clone the participant array so we can mutate immutably
  const updatedParticipants: Participant[] = participants.map(p => ({ ...p }));

  for (const row of jsonData) {
    const firstNameKey = findCol(row, [
      'first name', 'firstname', 'Student First Name', 'student first name', 'First Name',
    ]);
    const lastNameKey = findCol(row, [
      'last name', 'lastname', 'Student Last Name', 'student last name', 'Last Name',
    ]);

    const firstName = firstNameKey ? String(row[firstNameKey] ?? '').trim() : '';
    const lastName = lastNameKey ? String(row[lastNameKey] ?? '').trim() : '';

    if (!firstName && !lastName) continue; // skip blank rows

    const rawValue = row[selectedHeader];
    const lookupKey = normalizeName(firstName, lastName);
    const matchedIndices = lookupKey ? participantMap.get(lookupKey) : undefined;
    const displayName = `${firstName} ${lastName}`.trim();

    // No participant with this name
    if (!matchedIndices) {
      if (displayName) {
        result.notMatched.push(displayName);
        result.details.push({ name: displayName, oldValue: undefined, newValue: rawValue as never, status: 'not_matched' });
      }
      continue;
    }

    // Ambiguous name: several participants share it, so a name-only match cannot
    // tell them apart. Skip the row rather than silently overwriting an arbitrary
    // participant (which would corrupt data).
    if (matchedIndices.length > 1) {
      result.notFound.push(`${displayName} (${matchedIndices.length} participants share this name)`);
      result.details.push({ name: displayName, oldValue: undefined, newValue: rawValue as never, status: 'not_matched' });
      continue;
    }

    const idx = matchedIndices[0];
    const participant = updatedParticipants[idx];
    const oldValue = participant[targetField];

    // Coerce the value to the appropriate type based on the existing field type
    let newValue: unknown = rawValue;
    if (typeof oldValue === 'number' || targetField === 'age' || targetField === 'heightFeet' || targetField === 'heightInches') {
      if (rawValue === '' || rawValue === null || rawValue === undefined) {
        // Blank cell: leave the existing value untouched
        newValue = oldValue;
      } else {
        const numeric = Number(rawValue);
        if (!Number.isFinite(numeric)) {
          // Never write NaN into the data model - report and skip the row
          result.notFound.push(`${displayName} (invalid number "${String(rawValue)}")`);
          result.details.push({ name: displayName, oldValue, newValue: rawValue as never, status: 'not_matched' });
          continue;
        }
        newValue = numeric;
      }
    } else if (typeof oldValue === 'boolean') {
      const s = String(rawValue).toLowerCase().trim();
      newValue = s === 'true' || s === 'yes' || s === '1';
    } else {
      newValue = rawValue !== null && rawValue !== undefined ? String(rawValue).trim() : '';
    }

    if (String(oldValue) === String(newValue)) {
      result.unchanged++;
      result.details.push({ name: displayName, oldValue, newValue: newValue as never, status: 'unchanged' });
    } else {
      (updatedParticipants[idx] as unknown as Record<string, unknown>)[targetField as string] = newValue;

      // Keep the derived total height in sync whenever a height component changes
      if (targetField === 'heightFeet' || targetField === 'heightInches') {
        const updated = updatedParticipants[idx];
        updated.totalHeightInches = updated.heightFeet * 12 + updated.heightInches;
      }

      result.updated++;
      result.details.push({ name: displayName, oldValue, newValue: newValue as never, status: 'updated' });
    }
  }

  return { updatedParticipants, result };
}
