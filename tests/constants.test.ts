/**
 * Tests for constants utility
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DIVISION_ORDER,
  RING_BALANCE,
  AGE_THRESHOLDS,
  AUTOSAVE_DELAY_MS,
  POOL_PREFIX,
  ALT_RING_VALUES,
  DEFAULT_NUM_POOLS,
  MIN_POOLS,
  MAX_POOLS,
  RING_SIZE_WARNINGS,
} from '../src/renderer/utils/constants';

describe('constants', () => {
  it('should export DEFAULT_DIVISION_ORDER', () => {
    expect(DEFAULT_DIVISION_ORDER).toBe(999);
  });

  it('should export RING_BALANCE thresholds', () => {
    expect(RING_BALANCE.MIN_GOOD).toBe(8);
    expect(RING_BALANCE.MAX_GOOD).toBe(12);
    expect(RING_BALANCE.MIN_OK).toBe(5);
    expect(RING_BALANCE.MAX_OK).toBe(15);
  });

  it('should export AGE_THRESHOLDS', () => {
    expect(AGE_THRESHOLDS.ADULT).toBe(18);
    expect(AGE_THRESHOLDS.YOUTH_MAX).toBe(17);
  });

  it('should export AUTOSAVE_DELAY_MS', () => {
    expect(AUTOSAVE_DELAY_MS).toBe(500);
    expect(typeof AUTOSAVE_DELAY_MS).toBe('number');
  });

  it('should export POOL_PREFIX', () => {
    expect(POOL_PREFIX).toBe('P');
  });

  it('should export ALT_RING_VALUES', () => {
    expect(ALT_RING_VALUES).toEqual(['', 'a', 'b']);
  });

  it('should export pool count constants', () => {
    expect(DEFAULT_NUM_POOLS).toBe(1);
    expect(MIN_POOLS).toBe(1);
    expect(MAX_POOLS).toBe(10);
  });

  it('should export RING_SIZE_WARNINGS', () => {
    expect(RING_SIZE_WARNINGS.TOO_SMALL).toBe(3);
    expect(RING_SIZE_WARNINGS.TOO_LARGE).toBe(20);
  });

  it('should have consistent age thresholds', () => {
    expect(AGE_THRESHOLDS.ADULT).toBe(AGE_THRESHOLDS.YOUTH_MAX + 1);
  });

  it('should have ring balance thresholds in logical order', () => {
    expect(RING_BALANCE.MIN_OK).toBeLessThan(RING_BALANCE.MIN_GOOD);
    expect(RING_BALANCE.MIN_GOOD).toBeLessThan(RING_BALANCE.MAX_GOOD);
    expect(RING_BALANCE.MAX_GOOD).toBeLessThan(RING_BALANCE.MAX_OK);
  });

  it('should have pool counts in logical order', () => {
    expect(MIN_POOLS).toBeLessThanOrEqual(DEFAULT_NUM_POOLS);
    expect(DEFAULT_NUM_POOLS).toBeLessThanOrEqual(MAX_POOLS);
  });
});
