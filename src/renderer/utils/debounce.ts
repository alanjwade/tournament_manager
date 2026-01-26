/**
 * Debounce utility to prevent multiple rapid calls
 */

let timeoutId: NodeJS.Timeout | null = null;

/**
 * Debounce a function call - only the last call within the delay period will execute
 */
export function debounce(fn: () => void, delay: number): void {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
  }
  timeoutId = setTimeout(() => {
    fn();
    timeoutId = null;
  }, delay);
}
