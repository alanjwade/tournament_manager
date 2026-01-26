/**
 * Application-wide constants
 * Centralizes magic numbers and strings for maintainability
 */

// Division ordering
export const DEFAULT_DIVISION_ORDER = 999;

// Ring balance thresholds (participant counts)
export const RING_BALANCE = {
  MIN_GOOD: 8,
  MAX_GOOD: 12,
  MIN_OK: 5,
  MAX_OK: 15,
} as const;

// Age thresholds
export const AGE_THRESHOLDS = {
  ADULT: 18,
  YOUTH_MAX: 17,
} as const;

// AutoSave configuration
export const AUTOSAVE_DELAY_MS = 500;

// Pool naming
export const POOL_PREFIX = 'P';
export const ALT_RING_VALUES = ['', 'a', 'b'] as const;

// Default values
export const DEFAULT_NUM_POOLS = 1;
export const MIN_POOLS = 1;
export const MAX_POOLS = 10;

// Ring size recommendations
export const RING_SIZE_WARNINGS = {
  TOO_SMALL: 3,
  TOO_LARGE: 20,
} as const;
