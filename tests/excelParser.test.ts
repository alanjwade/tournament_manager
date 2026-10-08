/**
 * Regression tests for spreadsheet parsing (excelParser.ts).
 *
 * Height cells containing text (e.g. "N/A") used to become NaN, which then
 * propagated into totalHeightInches and passed the import validation because
 * NaN is neither undefined, null nor 0.
 */
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcelFile } from '../src/renderer/utils/excelParser';

function toBytes(rows: Record<string, unknown>[]): number[] {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return Array.from(new Uint8Array(buf));
}

const VALID_DIVISIONS = ['Level 1'];

function row(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    'Student First Name': 'Ann',
    'Student Last Name': 'Lee',
    'Student Gender': 'F',
    Age: 10,
    'height feet': 5,
    'height inches': 6,
    school: 'Test School',
    branch: 'Test Branch',
    Form: 'Yes',
    Sparring: 'Yes',
    division: 'Level 1',
    ...overrides,
  };
}

describe('parseExcelFile', () => {
  it('parses numeric heights and derives totalHeightInches', () => {
    const [p] = parseExcelFile(toBytes([row({})]), VALID_DIVISIONS);

    expect(p.heightFeet).toBe(5);
    expect(p.heightInches).toBe(6);
    expect(p.totalHeightInches).toBe(66);
  });

  it('never produces NaN for non-numeric height cells', () => {
    const [p] = parseExcelFile(
      toBytes([row({ 'height feet': 'N/A', 'height inches': 'N/A' })]),
      VALID_DIVISIONS
    );

    expect(Number.isFinite(p.heightFeet)).toBe(true);
    expect(Number.isFinite(p.heightInches)).toBe(true);
    expect(Number.isFinite(p.totalHeightInches)).toBe(true);
    expect(p.heightFeet).toBe(0);
    expect(p.heightInches).toBe(0);
    expect(p.totalHeightInches).toBe(0);
  });

  it('falls back to 0 for non-numeric ages and understands "18 and Up"', () => {
    const [bad] = parseExcelFile(toBytes([row({ Age: 'twelve' })]), VALID_DIVISIONS);
    expect(bad.age).toBe(0);
    expect(Number.isNaN(bad.age)).toBe(false);

    const [adult] = parseExcelFile(toBytes([row({ Age: '18 and Up' })]), VALID_DIVISIONS);
    expect(adult.age).toBe(18);
  });

  it('assumes sparring by default when the Sparring column is blank', () => {
    const [p] = parseExcelFile(toBytes([row({ Sparring: '' })]), VALID_DIVISIONS);

    expect(p.competingSparring).toBe(true);
    expect(p.sparringDivision).toBe('Level 1');
  });

  it('treats any form of "no" in the Sparring column as not sparring', () => {
    for (const value of ['No', 'no', 'NO', 'N', 'None', 'Not participating', 'no thanks']) {
      const [p] = parseExcelFile(toBytes([row({ Sparring: value })]), VALID_DIVISIONS);
      expect({ value, competingSparring: p.competingSparring, sparringDivision: p.sparringDivision }).toEqual({
        value,
        competingSparring: false,
        sparringDivision: null,
      });
    }
  });

  it('still honours an explicit sparring division name', () => {
    const [p] = parseExcelFile(toBytes([row({ Sparring: 'Level 1' })]), VALID_DIVISIONS);

    expect(p.competingSparring).toBe(true);
    expect(p.sparringDivision).toBe('Level 1');
  });
});
