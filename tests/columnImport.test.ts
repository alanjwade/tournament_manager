/**
 * Regression tests for single-column spreadsheet import (columnImport.ts).
 *
 * These cover data-integrity guarantees:
 *  - a row is never silently applied to the wrong participant when names collide
 *  - non-numeric values never become NaN in the data model
 *  - the derived totalHeightInches stays in sync with heightFeet/heightInches
 */
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { applyColumnImport } from '../src/renderer/utils/columnImport';
import { createTestParticipant } from './fixtures';

function toBytes(rows: Record<string, unknown>[]): number[] {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return Array.from(new Uint8Array(buf));
}

describe('applyColumnImport', () => {
  it('updates the matching participant when the name is unique', () => {
    const participants = [
      createTestParticipant({ id: 'p1', firstName: 'Ann', lastName: 'Lee', school: 'Old School' }),
    ];
    const bytes = toBytes([{ 'First Name': 'Ann', 'Last Name': 'Lee', School: 'New School' }]);

    const { updatedParticipants, result } = applyColumnImport(bytes, 'School', 'school', participants);

    expect(result.updated).toBe(1);
    expect(result.notFound).toEqual([]);
    expect(updatedParticipants[0].school).toBe('New School');
  });

  it('records an unmatched row without changing any data', () => {
    const participants = [
      createTestParticipant({ id: 'p1', firstName: 'Ann', lastName: 'Lee', school: 'Old School' }),
    ];
    const bytes = toBytes([{ 'First Name': 'Nobody', 'Last Name': 'Here', School: 'New School' }]);

    const { updatedParticipants, result } = applyColumnImport(bytes, 'School', 'school', participants);

    expect(result.updated).toBe(0);
    expect(result.notMatched).toContain('Nobody Here');
    expect(updatedParticipants[0].school).toBe('Old School');
  });

  it('skips ambiguous rows when several participants share a name', () => {
    const participants = [
      createTestParticipant({ id: 'p1', firstName: 'John', lastName: 'Smith', school: 'A' }),
      createTestParticipant({ id: 'p2', firstName: 'John', lastName: 'Smith', school: 'B' }),
    ];
    const bytes = toBytes([{ 'First Name': 'John', 'Last Name': 'Smith', School: 'NEW' }]);

    const { updatedParticipants, result } = applyColumnImport(bytes, 'School', 'school', participants);

    // The row cannot be attributed to a single participant, so nothing may change.
    expect(result.updated).toBe(0);
    expect(result.notFound).toHaveLength(1);
    expect(updatedParticipants.map(p => p.school)).toEqual(['A', 'B']);
  });

  it('recomputes totalHeightInches when a height column is imported', () => {
    const participants = [
      createTestParticipant({
        id: 'p1', firstName: 'Ann', lastName: 'Lee',
        heightFeet: 4, heightInches: 6, totalHeightInches: 54,
      }),
    ];
    const bytes = toBytes([{ 'First Name': 'Ann', 'Last Name': 'Lee', 'Height Feet': 6 }]);

    const { updatedParticipants } = applyColumnImport(bytes, 'Height Feet', 'heightFeet', participants);
    expect(updatedParticipants[0].heightFeet).toBe(6);
    // 6ft 6in -> 78 inches (would have stayed stale at 54 without the fix)
    expect(updatedParticipants[0].totalHeightInches).toBe(78);
  });

  it('skips non-numeric values instead of writing NaN', () => {
    const participants = [
      createTestParticipant({ id: 'p1', firstName: 'Ann', lastName: 'Lee', age: 10 }),
    ];
    const bytes = toBytes([{ 'First Name': 'Ann', 'Last Name': 'Lee', Age: 'twelve' }]);

    const { updatedParticipants, result } = applyColumnImport(bytes, 'Age', 'age', participants);

    expect(updatedParticipants[0].age).toBe(10);
    expect(result.updated).toBe(0);
    expect(result.notFound).toHaveLength(1);
  });

  it('leaves numeric values untouched for blank cells', () => {
    const participants = [
      createTestParticipant({ id: 'p1', firstName: 'Ann', lastName: 'Lee', age: 10 }),
    ];
    const bytes = toBytes([{ 'First Name': 'Ann', 'Last Name': 'Lee', Age: '' }]);

    const { updatedParticipants, result } = applyColumnImport(bytes, 'Age', 'age', participants);

    expect(updatedParticipants[0].age).toBe(10);
    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(1);
  });
});
