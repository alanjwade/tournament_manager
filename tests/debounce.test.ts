/**
 * Tests for debounce utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from '../src/renderer/utils/debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute function after delay', () => {
    const fn = vi.fn();
    debounce(fn, 500);

    expect(fn).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(500);
    
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous calls and only execute the last one', () => {
    const fn = vi.fn();
    
    debounce(fn, 500);
    vi.advanceTimersByTime(200);
    
    debounce(fn, 500);
    vi.advanceTimersByTime(200);
    
    debounce(fn, 500);
    vi.advanceTimersByTime(200);
    
    // Function should not have been called yet
    expect(fn).not.toHaveBeenCalled();
    
    // Advance past the last debounce delay
    vi.advanceTimersByTime(500);
    
    // Should only be called once (last call)
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should execute immediately after delay expires', () => {
    const fn = vi.fn();
    debounce(fn, 100);

    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple different debounced functions', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    
    debounce(fn1, 500);
    debounce(fn2, 500);
    
    vi.advanceTimersByTime(500);
    
    // Only the last function should be called
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('should allow function to be called again after completion', () => {
    const fn = vi.fn();
    
    debounce(fn, 500);
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
    
    debounce(fn, 500);
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
