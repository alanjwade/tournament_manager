import * as XLSX from 'xlsx';
import { Participant } from '../types/tournament';

export interface ColumnImportResult {
  updated: number;
  unchanged: number;
  notMatched: string[]; // rows in spreadsheet that didn't match any participant
  notFound: string[]; // participants whose names matched but couldn't be processed
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

  const result: ColumnImportResult = {
    updated: 0,
    unchanged: 0,
    notMatched: [],
    notFound: [],
    fieldName: selectedHeader,
    details: [],
  };

  // Build a lookup map of normalized full name → participant index for fast matching
  const participantMap = new Map<string, number>();
  participants.forEach((p, idx) => {
    const key = `${p.firstName} ${p.lastName}`.toLowerCase().trim().replace(/\s+/g, ' ');
    participantMap.set(key, idx);
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
    const lookupKey = `${firstName} ${lastName}`.toLowerCase().trim().replace(/\s+/g, ' ');

    const idx = participantMap.get(lookupKey);
    if (idx === undefined) {
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName) {
        result.notMatched.push(fullName);
        result.details.push({ name: fullName, oldValue: undefined, newValue: rawValue as never, status: 'not_matched' });
      }
      continue;
    }

    const participant = updatedParticipants[idx];
    const oldValue = participant[targetField];

    // Coerce the value to the appropriate type based on the existing field type
    let newValue: unknown = rawValue;
    if (typeof oldValue === 'number' || targetField === 'age' || targetField === 'heightFeet' || targetField === 'heightInches') {
      newValue = rawValue !== '' && rawValue !== null && rawValue !== undefined ? Number(rawValue) : oldValue;
    } else if (typeof oldValue === 'boolean') {
      const s = String(rawValue).toLowerCase().trim();
      newValue = s === 'true' || s === 'yes' || s === '1';
    } else {
      newValue = rawValue !== null && rawValue !== undefined ? String(rawValue).trim() : '';
    }

    const fullName = `${participant.firstName} ${participant.lastName}`;

    if (String(oldValue) === String(newValue)) {
      result.unchanged++;
      result.details.push({ name: fullName, oldValue, newValue: newValue as never, status: 'unchanged' });
    } else {
      (updatedParticipants[idx] as unknown as Record<string, unknown>)[targetField as string] = newValue;
      result.updated++;
      result.details.push({ name: fullName, oldValue, newValue: newValue as never, status: 'updated' });
    }
  }

  return { updatedParticipants, result };
}
