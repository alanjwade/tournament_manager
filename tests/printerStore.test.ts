/**
 * Tests for the remembered silent-print printer store.
 *
 * The store is a module-level singleton, so each test re-imports it with
 * resetModules() to get a fresh instance (and a fresh localStorage read).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('printerStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    (global.window as any).electronAPI = {
      getPrinters: vi.fn().mockResolvedValue({ success: true, printers: [] }),
    };
  });

  it('defaults to the system default printer', async () => {
    const { getPrinterName, DEFAULT_PRINTER } = await import('../src/renderer/utils/printerStore');
    expect(DEFAULT_PRINTER).toBe('');
    expect(getPrinterName()).toBe('');
  });

  it('persists and restores the selected printer', async () => {
    const first = await import('../src/renderer/utils/printerStore');
    first.setPrinterName('Brother HL-1230');
    expect(localStorage.getItem('tournament-print-printer')).toBe('Brother HL-1230');

    vi.resetModules();
    const second = await import('../src/renderer/utils/printerStore');
    expect(second.getPrinterName()).toBe('Brother HL-1230');
  });

  it('clears the stored printer when set back to the system default', async () => {
    const store = await import('../src/renderer/utils/printerStore');
    store.setPrinterName('Printer A');
    store.setPrinterName(store.DEFAULT_PRINTER);
    expect(store.getPrinterName()).toBe('');
    expect(localStorage.getItem('tournament-print-printer')).toBeNull();
  });

  it('notifies subscribers on change and stops after unsubscribe', async () => {
    const store = await import('../src/renderer/utils/printerStore');
    const seen: string[] = [];
    const unsubscribe = store.subscribePrinter((name) => seen.push(name));

    store.setPrinterName('Printer B');
    store.setPrinterName('Printer B'); // duplicate — no notification
    unsubscribe();
    store.setPrinterName('Printer C'); // after unsubscribe — not seen

    expect(seen).toEqual(['Printer B']);
  });

  it('loadPrinters returns the printer list from the main process', async () => {
    (global.window as any).electronAPI.getPrinters = vi.fn().mockResolvedValue({
      success: true,
      printers: [
        { name: 'P1', displayName: 'Printer 1', description: '' },
        { name: 'P2', displayName: 'Printer 2', description: '' },
      ],
    });

    const store = await import('../src/renderer/utils/printerStore');
    const printers = await store.loadPrinters();

    expect(printers).toHaveLength(2);
    expect(printers[0].name).toBe('P1');
    expect(printers[0].displayName).toBe('Printer 1');
  });

  it('loadPrinters returns an empty list when the API fails', async () => {
    (global.window as any).electronAPI.getPrinters = vi.fn().mockRejectedValue(new Error('nope'));

    const store = await import('../src/renderer/utils/printerStore');
    expect(await store.loadPrinters()).toEqual([]);
  });
});
