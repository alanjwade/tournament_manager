/**
 * Remembered target printer for the silent ("Print Now") print mode.
 *
 * Electron's silent print always goes to the OS default printer unless an
 * explicit `deviceName` is supplied, and the printer chosen in the OS print
 * dialog ('Print...') is not observable from the app. To let "Print Now" reuse
 * the printer the user last sent jobs to, the user picks one here and we persist
 * it in localStorage. A single module-level value is shared by every PrintButton
 * on screen (mirroring printModeStore), so changing it in one place updates all
 * of them at once and survives restarts.
 */
const STORAGE_KEY = 'tournament-print-printer';

/** Sentinel meaning "use the OS default printer". */
export const DEFAULT_PRINTER = '';

type Listener = (name: string) => void;

export interface AvailablePrinter {
  name: string;
  displayName: string;
  description: string;
}

let initialized = false;
let currentName: string = DEFAULT_PRINTER;
const listeners = new Set<Listener>();

function initialize() {
  if (initialized) return;
  initialized = true;
  if (typeof localStorage !== 'undefined') {
    currentName = localStorage.getItem(STORAGE_KEY) || DEFAULT_PRINTER;
  }
}

/** The currently selected silent-print printer ('' = OS default). */
export function getPrinterName(): string {
  initialize();
  return currentName;
}

/** Select the silent-print printer and persist it. Pass '' for the OS default. */
export function setPrinterName(name: string): void {
  initialize();
  const next = name || DEFAULT_PRINTER;
  if (next === currentName) return;
  currentName = next;
  if (typeof localStorage !== 'undefined') {
    if (next) {
      localStorage.setItem(STORAGE_KEY, next);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  // Notify every mounted button so they re-render in unison.
  listeners.forEach((listener) => listener(next));
}

/** Subscribe to printer changes; returns an unsubscribe function. */
export function subscribePrinter(listener: Listener): () => void {
  initialize();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Ask the main process for the printers the OS reports. Returns an empty list
 * (never throws) when the lookup fails, so the UI can degrade to "System
 * default" only.
 */
export async function loadPrinters(): Promise<AvailablePrinter[]> {
  try {
    const result = await window.electronAPI.getPrinters();
    return result?.printers ?? [];
  } catch {
    return [];
  }
}
