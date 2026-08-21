import { PrintMode } from './printPdf';

/**
 * Shared, app-wide print mode used by every print button in the Tournament tab.
 *
 * The mode is a single module-level value backed by localStorage. All PrintButton
 * instances subscribe to it, so changing the dropdown on any one button updates
 * every other button currently on screen at the same time.
 */
const STORAGE_KEY = 'tournament-print-mode';

type Listener = (mode: PrintMode) => void;

let initialized = false;
let currentMode: PrintMode = 'dialog';
const listeners = new Set<Listener>();

function initialize() {
  if (initialized) return;
  initialized = true;
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'now' || saved === 'dialog') {
      currentMode = saved;
    }
  }
}

export function getPrintMode(): PrintMode {
  initialize();
  return currentMode;
}

export function setPrintMode(mode: PrintMode): void {
  initialize();
  if (mode === currentMode) return;
  currentMode = mode;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, mode);
  }
  // Notify every mounted button so they re-render in unison.
  listeners.forEach((listener) => listener(mode));
}

/** Subscribe to print-mode changes; returns an unsubscribe function. */
export function subscribePrintMode(listener: Listener): () => void {
  initialize();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}